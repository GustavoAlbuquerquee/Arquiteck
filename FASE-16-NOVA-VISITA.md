# Fase 16 - Nova Visita: perda e duplicação de dados

## Problemas corrigidos

| Problema | Antes | Depois |
|---|---|---|
| "Novo Formulário" depois de editar | O modo edição continuava ativo (`?edit=` na URL); o próximo "Salvar" sobrescrevia o projeto editado | Sai do modo edição e limpa o formulário (também ao abrir "Briefing/Visita" pelo menu) |
| Gravação não atômica | Cliente → projeto → checklist em 3 chamadas; falha no meio deixava registros soltos e o "tentar de novo" duplicava | Função `salvar_briefing` grava tudo numa transação; arquivos enviados são apagados se algo falhar |
| Duplo toque no "Salvar" | Criava dois briefings | Trava síncrona: o segundo toque é ignorado |
| Upload de foto falhando | A foto era descartada sem aviso e o briefing salvo sem ela | O salvamento para e mostra o erro; nada é gravado |
| Fotos ao voltar de passo | Sumiam da tela (continuavam no form) e eram adicionadas de novo, duplicadas | A prévia vem direto do formulário |
| Remover foto na edição | As fotos já salvas não apareciam; remover podia apagar a foto errada | Fotos salvas aparecem e a remoção usa o índice certo; as removidas saem do Storage ao salvar |
| Fotos grandes | 4–8 MB por foto em base64, podendo travar o celular | Reduzidas para no máximo 1600px em JPEG (algumas centenas de KB) |
| Mesmo arquivo duas vezes | Escolher a mesma foto de novo não fazia nada | O seletor é limpo após cada escolha |
| Data no PDF | Saía um dia antes (`new Date("AAAA-MM-DD")` é lido como UTC) | Formatada direto da string |
| Edição de projeto com vários checklists | Abria `checklists[0]`, que podia ser o de saída/instalação; sem checklist, dizia "atualizado" sem gravar | Usa o de pré-produção e cria um se não existir |
| Assinatura ao voltar de passo | O quadro voltava vazio, mas a assinatura continuava no form; girar o tablet apagava o desenho | O desenho é restaurado e não é apagado ao redimensionar; na edição a assinatura atual aparece acima do quadro |

## Deploy (nesta ordem)

1. **Banco**: no Supabase Dashboard > SQL Editor, execute o arquivo inteiro
   `supabase/migrations/20261014120000_salvar_briefing.sql` (sem nada selecionado no editor).
   A última consulta deve retornar **1 linha** com `salvar_briefing`.
   A função é nova e não muda nada existente, então pode ser aplicada antes do frontend.
2. **Frontend**: merge na `main` (a Vercel publica sozinha).

## Testes

`supabase/tests/03_salvar_briefing_test.sql` cobre criação, atomicidade (falha no meio não grava nada),
edição de projeto de outra empresa, edição repetida e chamada sem login. O `run.sh` roda todos os testes:

```bash
PGURL=postgres://postgres@localhost:5432/postgres ./supabase/tests/run.sh
```

## Pendências conhecidas

- A data da visita continua gravada em `projects.data_prevista_instalacao` (a coluna não foi renomeada
  quando o campo do formulário mudou).
- No passo 2, só nome e profundidade dos móveis mostram mensagem de erro no próprio campo.
- Não há rascunho salvo: se o Android recarregar a página ao abrir a câmera, o preenchimento se perde.
