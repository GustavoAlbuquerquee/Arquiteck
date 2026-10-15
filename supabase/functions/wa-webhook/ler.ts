// Lê o payload de webhook do WhatsApp (formato da Cloud API, que a 360dialog
// repassa igual) e devolve uma linha por acontecimento, para o teste de
// coexistência. Não depende de Supabase: testável com `deno test`.

export type Autor = 'cliente' | 'equipe_app' | 'sistema' | 'desconhecido'

export interface Acontecimento {
  campo: string // field do webhook: messages, smb_message_echoes, history...
  tipo: string // text, audio, status:read, historico, contato...
  autor: Autor
  wa_message_id: string | null
  de: string | null
  para: string | null
  texto: string | null
  enviada_em: string | null // ISO
  phone_number_id: string | null
}

// deno-lint-ignore no-explicit-any
type Json = any

const quando = (ts: unknown) =>
  typeof ts === 'string' || typeof ts === 'number'
    ? new Date(Number(ts) * 1000).toISOString()
    : null

const textoDe = (m: Json): string | null =>
  m?.text?.body ??
  m?.image?.caption ??
  m?.video?.caption ??
  m?.document?.caption ??
  m?.button?.text ??
  m?.interactive?.button_reply?.title ??
  m?.interactive?.list_reply?.title ??
  m?.reaction?.emoji ??
  null

export function lerWebhook(payload: Json): Acontecimento[] {
  const saida: Acontecimento[] = []
  const entradas: Json[] = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entrada of entradas) {
    const mudancas: Json[] = Array.isArray(entrada?.changes) ? entrada.changes : []
    for (const mudanca of mudancas) {
      const campo: string = mudanca?.field ?? 'desconhecido'
      const v: Json = mudanca?.value ?? {}
      const phone_number_id: string | null = v?.metadata?.phone_number_id ?? null
      const base = { campo, phone_number_id }

      // Mensagem do cliente para a loja
      for (const m of v?.messages ?? []) {
        saida.push({
          ...base,
          tipo: m?.type ?? 'desconhecido',
          autor: 'cliente',
          wa_message_id: m?.id ?? null,
          de: m?.from ?? null,
          para: v?.metadata?.display_phone_number ?? null,
          texto: textoDe(m),
          enviada_em: quando(m?.timestamp),
        })
      }

      // Coexistência: o que a loja mandou pelo app (celular ou aparelho conectado)
      for (const m of v?.message_echoes ?? []) {
        saida.push({
          ...base,
          tipo: m?.type ?? 'desconhecido',
          autor: 'equipe_app',
          wa_message_id: m?.id ?? null,
          de: m?.from ?? null,
          para: m?.to ?? null,
          texto: textoDe(m),
          enviada_em: quando(m?.timestamp),
        })
      }

      // Confirmações de entrega/leitura do que saiu pela API
      for (const s of v?.statuses ?? []) {
        saida.push({
          ...base,
          tipo: `status:${s?.status ?? '?'}`,
          autor: 'sistema',
          wa_message_id: s?.id ?? null,
          de: null,
          para: s?.recipient_id ?? null,
          texto: null,
          enviada_em: quando(s?.timestamp),
        })
      }

      // Coexistência: importação do histórico (6 meses), resumida por bloco
      for (const h of v?.history ?? []) {
        const threads: Json[] = h?.threads ?? []
        const total = threads.reduce((n, t) => n + (t?.messages?.length ?? 0), 0)
        saida.push({
          ...base,
          tipo: 'historico',
          autor: 'sistema',
          wa_message_id: null,
          de: null,
          para: null,
          texto: `fase ${h?.metadata?.phase ?? '?'} · bloco ${h?.metadata?.chunk_order ?? '?'} · ${h?.metadata?.progress ?? '?'}% · ${threads.length} conversas · ${total} mensagens`,
          enviada_em: null,
        })
      }

      // Coexistência: sincronização de contatos do app
      for (const c of v?.state_sync ?? []) {
        saida.push({
          ...base,
          tipo: `contato:${c?.action ?? c?.type ?? '?'}`,
          autor: 'sistema',
          wa_message_id: null,
          de: c?.contact?.phone_number ?? null,
          para: null,
          texto: c?.contact?.full_name ?? null,
          enviada_em: quando(c?.metadata?.timestamp),
        })
      }

      // Erros que a Meta manda no webhook
      for (const e of v?.errors ?? []) {
        saida.push({
          ...base,
          tipo: `erro:${e?.code ?? '?'}`,
          autor: 'sistema',
          wa_message_id: null,
          de: null,
          para: null,
          texto: e?.title ?? e?.message ?? null,
          enviada_em: null,
        })
      }

      // Campo que ainda não conhecemos: guarda uma linha para não passar batido
      const conhecidos = ['messages', 'message_echoes', 'statuses', 'history', 'state_sync', 'errors', 'contacts', 'metadata', 'messaging_product']
      const desconhecido = Object.keys(v).some((k) => !conhecidos.includes(k))
      if (desconhecido || Object.keys(v).length === 0) {
        saida.push({
          ...base,
          tipo: 'outro',
          autor: 'desconhecido',
          wa_message_id: null,
          de: null,
          para: null,
          texto: Object.keys(v).join(', ') || null,
          enviada_em: null,
        })
      }
    }
  }
  return saida
}

/** Compara dois textos em tempo constante (para senha e assinatura). */
export function iguais(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let dif = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return dif === 0
}

/** Assinatura X-Hub-Signature-256 da Meta (só quando o número for ligado direto na Meta). */
export async function assinaturaMeta(corpo: string, segredo: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo))
  return 'sha256=' + [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
