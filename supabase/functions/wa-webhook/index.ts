import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assinaturaMeta, iguais, lerWebhook } from './ler.ts'

// Receptor do WhatsApp para o TESTE DE COEXISTÊNCIA (fase 1 da arquitetura).
// Só grava o que chega em whatsapp_webhook_log. Não mexe no board.
//
// Deploy sem verificação de JWT (quem chama é a 360dialog/Meta, não um usuário):
//   npx supabase functions deploy wa-webhook --no-verify-jwt
//
// Segredos (npx supabase secrets set ...):
//   WA_WEBHOOK_TOKEN  senha que a 360dialog manda no cabeçalho
//                     "Authorization: Bearer <token>" (configurado no webhook dela)
//   META_APP_SECRET   opcional; se o número for ligado direto na Meta, confere
//                     a assinatura X-Hub-Signature-256
//   META_VERIFY_TOKEN opcional; responde o desafio GET da Meta

const texto = (body: string, status = 200) => new Response(body, { status })

serve(async (req) => {
  const url = new URL(req.url)

  // Desafio de verificação da Meta (só usado se ligar direto na Meta)
  if (req.method === 'GET') {
    const verifyToken = Deno.env.get('META_VERIFY_TOKEN')
    if (
      verifyToken &&
      url.searchParams.get('hub.mode') === 'subscribe' &&
      iguais(url.searchParams.get('hub.verify_token') ?? '', verifyToken)
    ) {
      return texto(url.searchParams.get('hub.challenge') ?? '')
    }
    return texto('forbidden', 403)
  }

  if (req.method !== 'POST') return texto('method not allowed', 405)

  // Corpo cru: a assinatura da Meta é calculada sobre os bytes exatos
  const corpo = await req.text()

  // Autenticação: senha da 360dialog OU assinatura da Meta. Sem nenhuma, recusa.
  const tokenEsperado = Deno.env.get('WA_WEBHOOK_TOKEN')
  const segredoMeta = Deno.env.get('META_APP_SECRET')
  const tokenRecebido = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const assinaturaRecebida = req.headers.get('x-hub-signature-256') ?? ''

  let autenticado = false
  if (tokenEsperado && tokenRecebido && iguais(tokenRecebido, tokenEsperado)) {
    autenticado = true
  } else if (segredoMeta && assinaturaRecebida) {
    autenticado = iguais(assinaturaRecebida, await assinaturaMeta(corpo, segredoMeta))
  }
  if (!autenticado) return texto('unauthorized', 401)

  // deno-lint-ignore no-explicit-any
  let payload: any
  try {
    payload = JSON.parse(corpo)
  } catch {
    // JSON inválido não vai melhorar com reenvio: responde 200 para a fila não travar
    return texto('ignored', 200)
  }

  const linhas = lerWebhook(payload).map((a) => ({ ...a, payload }))
  // Webhook que não gerou nenhuma linha também fica registrado, para o teste
  if (linhas.length === 0) {
    linhas.push({
      campo: 'vazio',
      tipo: 'outro',
      autor: 'desconhecido',
      wa_message_id: null,
      de: null,
      para: null,
      texto: null,
      enviada_em: null,
      phone_number_id: null,
      payload,
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Reenvio da Meta (até 7 dias) não duplica: wa_message_id + campo + tipo são únicos
  const { error } = await supabase
    .from('whatsapp_webhook_log')
    .upsert(linhas, { onConflict: 'wa_message_id,campo,tipo', ignoreDuplicates: true })

  if (error) {
    console.error('wa-webhook: falha ao gravar', error.message)
    // 500 faz a Meta/360dialog reenviar mais tarde: nada se perde
    return texto('error', 500)
  }

  return texto('ok', 200)
})
