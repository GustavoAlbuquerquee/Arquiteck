# Teste de coexistência do WhatsApp (Fase 1)

Objetivo: em 1 semana, no **número secundário** da Primor, descobrir se a integração oficial (coexistência via 360dialog)
atende a loja **antes** de mexer no número principal. Ver `ARQUITETURA-WHATSAPP-IA.md`.

Nada disso mexe no board. A função `wa-webhook` só grava o que chega na tabela `whatsapp_webhook_log`.

## Perguntas que o teste responde

| # | Pergunta | Como conferir |
|---|---|---|
| 1 | A mensagem do cliente chega ao Arquiteck? | Consulta A: linhas `messages` / `cliente` |
| 2 | A resposta digitada **no celular** chega? | Consulta A: linhas `smb_message_echoes` / `equipe_app` |
| 3 | A resposta digitada no **WhatsApp Web** chega? | Responder só pelo Web e ver se aparece em `smb_message_echoes` |
| 4 | A **IA da Meta** continua respondendo no app depois de conectar? | Olhar o app: o agente ainda aparece em Ferramentas e responde? |
| 5 | As respostas da IA da Meta chegam ao Arquiteck? | Consulta B: respostas que ninguém da equipe digitou |
| 6 | O histórico de 6 meses e os contatos foram importados? | Consulta A: linhas `history` e `contato:*` |
| 7 | O que parou de funcionar no app? | Anotar: listas de transmissão, mensagens temporárias, aparelhos conectados, catálogo, etiquetas, respostas rápidas |
| 8 | Áudio e foto chegam? | Consulta A: tipos `audio` e `image` |

## Preparação (uma vez)

**Igor**
1. Número secundário no **WhatsApp Business** atualizado, com a **IA da Meta ativada** (Ferramentas → IA, com 1 item no catálogo).
2. Se o número é pouco usado, usar normalmente por alguns dias antes (números muito novos não entram na coexistência na hora).

**Gustavo**
1. Criar a conta na **360dialog** com os dados da Primor e o Gerenciador de Negócios da Meta da Primor.
2. Perguntar ao suporte da 360dialog, por escrito: *"Temos Meta Verified pago no número principal. Em coexistência, a assinatura e o selo continuam ativos?"*

**Banco e função (Gustavo, no Git Bash, na pasta do projeto atualizada)**
1. SQL Editor do Supabase: rodar `supabase/migrations/20261018120000_whatsapp_teste.sql` inteiro. Deve listar `whatsapp_webhook_log` e `whatsapp_teste_resumo`.
2. Publicar a função e criar a senha do webhook:
   ```bash
   npx supabase link --project-ref ladmjhgjlvjraxzyvrxq
   npx supabase functions deploy wa-webhook --no-verify-jwt
   TOKEN=$(openssl rand -hex 24)
   npx supabase secrets set WA_WEBHOOK_TOKEN=$TOKEN
   echo $TOKEN
   ```
   Guarde o valor que o `echo` mostrar: ele vai no webhook da 360dialog (próximo passo) e não deve ser compartilhado.
3. Endereço da função: `https://ladmjhgjlvjraxzyvrxq.supabase.co/functions/v1/wa-webhook`

## Conexão (Gustavo + Igor, juntos)

1. Na 360dialog, conectar o número secundário escolhendo **"conectar um número que já usa o app WhatsApp Business"** (coexistência). O Igor confirma no celular, pelo QR code/aviso do app.
2. Aceitar a **importação do histórico** (tem que começar em até 24h).
3. Configurar o webhook do número na 360dialog com o endereço da função e o cabeçalho
   `Authorization: Bearer <TOKEN>`.
4. Mandar um "oi" de um WhatsApp pessoal para o número secundário e rodar a Consulta A. Deve aparecer uma linha `messages / cliente`.

## Durante a semana

Mandar mensagens de **WhatsApp pessoais** (nunca de clientes de verdade sem avisar) e responder de jeitos diferentes:
- só pelo **celular**;
- só pelo **WhatsApp Web**;
- deixar uma pergunta sem resposta para a **IA da Meta** responder;
- mandar um **áudio** e uma **foto**.

Anotar o horário de cada teste (ex.: "14:05 respondi pelo Web") para comparar com as consultas.

## Consultas (SQL Editor)

**A. Resumo do que chegou**
```sql
select * from whatsapp_teste_resumo;
```

**B. Linha do tempo das últimas 50 mensagens**
```sql
select recebido_em, campo, autor, tipo, de, para, left(texto, 80) as texto
from whatsapp_webhook_log
where campo in ('messages', 'smb_message_echoes')
order by recebido_em desc
limit 50;
```

**C. Algo inesperado chegou?**
```sql
select recebido_em, campo, tipo, texto, payload
from whatsapp_webhook_log
where autor = 'desconhecido' or tipo like 'erro:%'
order by recebido_em desc;
```

## Como decidir no fim

| Resultado | Decisão |
|---|---|
| 1, 2 e 3 ok, IA da Meta continua (4) | Conectar o número principal (depois da resposta da 360dialog sobre o Meta Verified) e seguir para a Fase 2 |
| 1 e 2 ok, **Web não gera echo** (3) | Seguir, mas a equipe precisa responder pelo celular ou usar o botão "Já respondi" no board quando responder pelo Web |
| **IA da Meta para** (4) | Escolher: manter a IA da Meta sem integração, ou integrar e trocar por uma IA própria de atendimento (custo e escopo à parte) |
| 1 ou 2 falham | Revisar a configuração com a 360dialog antes de qualquer outra coisa |

## Depois do teste

Desconectar o número secundário da 360dialog se não for usado (no app: Configurações → Conta → desconectar da plataforma) e apagar os dados do teste:
```sql
drop view if exists public.whatsapp_teste_resumo;
drop table if exists public.whatsapp_webhook_log;
```
