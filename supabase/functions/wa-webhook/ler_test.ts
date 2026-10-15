// deno test supabase/functions/wa-webhook/ler_test.ts
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { assinaturaMeta, iguais, lerWebhook } from './ler.ts'

const meta = { display_phone_number: '553199990000', phone_number_id: 'PNID' }
const envelope = (field: string, value: unknown) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'WABA', changes: [{ field, value: { messaging_product: 'whatsapp', metadata: meta, ...value as object } }] }],
})

Deno.test('mensagem de texto do cliente', () => {
  const [a] = lerWebhook(envelope('messages', {
    contacts: [{ profile: { name: 'Carlos' }, wa_id: '5531988887777' }],
    messages: [{ from: '5531988887777', id: 'wamid.1', timestamp: '1760000000', type: 'text', text: { body: 'Quero um orçamento' } }],
  }))
  assertEquals(a.autor, 'cliente')
  assertEquals(a.campo, 'messages')
  assertEquals(a.tipo, 'text')
  assertEquals(a.wa_message_id, 'wamid.1')
  assertEquals(a.de, '5531988887777')
  assertEquals(a.texto, 'Quero um orçamento')
  assertEquals(a.phone_number_id, 'PNID')
  assertEquals(a.enviada_em, new Date(1760000000 * 1000).toISOString())
})

Deno.test('áudio do cliente sem texto', () => {
  const [a] = lerWebhook(envelope('messages', {
    messages: [{ from: '5531988887777', id: 'wamid.2', timestamp: '1760000001', type: 'audio', audio: { id: 'MEDIA', mime_type: 'audio/ogg; codecs=opus' } }],
  }))
  assertEquals(a.tipo, 'audio')
  assertEquals(a.texto, null)
})

Deno.test('coexistência: resposta digitada no app vira equipe_app', () => {
  const [a] = lerWebhook(envelope('smb_message_echoes', {
    message_echoes: [{ from: '553199990000', to: '5531988887777', id: 'wamid.3', timestamp: '1760000100', type: 'text', text: { body: 'Oi Carlos, já te mando' } }],
  }))
  assertEquals(a.autor, 'equipe_app')
  assertEquals(a.campo, 'smb_message_echoes')
  assertEquals(a.para, '5531988887777')
  assertEquals(a.texto, 'Oi Carlos, já te mando')
})

Deno.test('coexistência: histórico vira uma linha de resumo por bloco', () => {
  const [a] = lerWebhook(envelope('history', {
    history: [{
      metadata: { phase: 0, chunk_order: 1, progress: 50 },
      threads: [
        { id: '5531988887777', messages: [{ id: 'h1' }, { id: 'h2' }] },
        { id: '5531977776666', messages: [{ id: 'h3' }] },
      ],
    }],
  }))
  assertEquals(a.tipo, 'historico')
  assertEquals(a.texto, 'fase 0 · bloco 1 · 50% · 2 conversas · 3 mensagens')
})

Deno.test('coexistência: sincronização de contatos', () => {
  const [a] = lerWebhook(envelope('smb_app_state_sync', {
    state_sync: [{ type: 'contact', contact: { full_name: 'Ana', phone_number: '5531966665555' }, action: 'add', metadata: { timestamp: '1760000200' } }],
  }))
  assertEquals(a.tipo, 'contato:add')
  assertEquals(a.texto, 'Ana')
  assertEquals(a.de, '5531966665555')
})

Deno.test('status de entrega vira sistema, um por status', () => {
  const linhas = lerWebhook(envelope('messages', {
    statuses: [
      { id: 'wamid.9', status: 'delivered', timestamp: '1760000300', recipient_id: '5531988887777' },
      { id: 'wamid.9', status: 'read', timestamp: '1760000400', recipient_id: '5531988887777' },
    ],
  }))
  assertEquals(linhas.map((l) => l.tipo), ['status:delivered', 'status:read'])
  assert(linhas.every((l) => l.autor === 'sistema'))
})

Deno.test('campo desconhecido não passa batido', () => {
  const [a] = lerWebhook(envelope('algo_novo', { coisa_nova: { x: 1 } }))
  assertEquals(a.tipo, 'outro')
  assertEquals(a.campo, 'algo_novo')
})

Deno.test('payload sem entry não quebra', () => {
  assertEquals(lerWebhook({}), [])
  assertEquals(lerWebhook(null), [])
})

Deno.test('assinatura da Meta (HMAC-SHA256) e comparação', async () => {
  // Valor conferido com: printf 'corpo' | openssl dgst -sha256 -hmac 'segredo'
  const sig = await assinaturaMeta('corpo', 'segredo')
  assertEquals(sig.length, 'sha256='.length + 64)
  assert(iguais(sig, await assinaturaMeta('corpo', 'segredo')))
  assert(!iguais(sig, await assinaturaMeta('corpo!', 'segredo')))
  assert(!iguais('abc', 'abcd'))
})
