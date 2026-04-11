# Wizard de Checklist - Documentação

## Visão Geral

O Wizard de Checklist é um formulário multi-etapas otimizado para tablets, permitindo que técnicos registrem vistorias de marcenaria diretamente na obra.

## Estrutura de Componentes

```
ChecklistWizard.tsx (Principal)
├── Step1DadosBasicos.tsx
├── Step2ChecklistOperacional.tsx
└── Step3Finalizacao.tsx
```

## Tecnologias Utilizadas

- **react-hook-form**: Gerenciamento de estado do formulário
- **zod**: Validação de dados e tipagem
- **@hookform/resolvers/zod**: Integração entre react-hook-form e zod
- **react-signature-canvas**: Captura de assinatura digital
- **lucide-react**: Ícones de interface

## Etapas do Wizard

### Etapa 1: Dados Básicos

- Nome do Cliente (input text)
- Título do Ambiente (input text)
- Data Prevista de Instalação (input date)

**Validações:**

- Nome do cliente: mínimo 3 caracteres
- Título do ambiente: mínimo 3 caracteres
- Data: campo obrigatório

### Etapa 2: Checklist Operacional

Dividido em 3 categorias:

#### 📋 Pré-Produção

- Projeto final aprovado
- Medição final conferida
- Interferências elétricas/hidráulicas verificadas
- Cores de MDF e acabamentos confirmados

#### 📦 Saída

- Todas as peças conferidas com a lista
- Sem riscos ou defeitos visuais
- Ferragens separadas por ambiente

#### 🔧 Instalação

- Ambiente protegido (piso/paredes)
- Nivelamento e prumo conferidos
- Limpeza final realizada

### Etapa 3: Finalização e Assinatura

- Observações e Ressalvas (textarea opcional)
- Assinatura Digital (canvas obrigatório)
- Termo de Aceite

## UX/UI - Otimizações para Tablet

### Tamanhos de Elementos

- **Inputs**: `h-14` (56px) - fácil de tocar
- **Botões**: `h-12` ou `h-14` - área de toque confortável
- **Checkboxes**: Ícones de `w-8 h-8` (32px) - visíveis e clicáveis
- **Texto**: `text-lg` (18px) - legível em tablets

### Interações Touch-Friendly

- Áreas de clique expandidas com padding generoso
- Feedback visual ao hover/focus
- Canvas de assinatura com `touch-none` para evitar scroll
- Botões com espaçamento adequado

### Navegação

- Indicador de progresso visual (1, 2, 3)
- Botões "Voltar" e "Avançar" fixos no rodapé
- Validação por etapa (não permite avançar com erros)
- Scroll automático ao trocar de etapa

## Schema de Validação (Zod)

```typescript
const checklistSchema = z.object({
  // Etapa 1
  nomeCliente: z.string().min(3),
  tituloAmbiente: z.string().min(3),
  dataPrevistaInstalacao: z.string().min(1),

  // Etapa 2
  preProducao: z.array(checklistItemSchema),
  saida: z.array(checklistItemSchema),
  instalacao: z.array(checklistItemSchema),

  // Etapa 3
  observacoes: z.string().optional(),
  assinatura: z.string().min(1),
});
```

## Fluxo de Dados

1. Usuário preenche Etapa 1
2. Clica em "Avançar" → Validação dos campos
3. Se válido, avança para Etapa 2
4. Marca checkboxes do checklist operacional
5. Avança para Etapa 3
6. Preenche observações e assina
7. Clica em "Salvar Vistoria"
8. Dados são logados no console (formato JSON)
9. Alerta de sucesso é exibido

## Formato dos Dados Salvos

```json
{
  "dadosBasicos": {
    "nomeCliente": "João Silva",
    "tituloAmbiente": "Cozinha Planejada",
    "dataPrevistaInstalacao": "2026-03-15"
  },
  "checklist": {
    "preProducao": [
      { "label": "Projeto final aprovado", "checked": true },
      { "label": "Medição final conferida", "checked": true }
    ],
    "saida": [...],
    "instalacao": [...]
  },
  "finalizacao": {
    "observacoes": "Cliente solicitou ajuste na cor",
    "assinaturaBase64": "data:image/png;base64,iVBORw0KG..."
  }
}
```

## Próximos Passos (Integração com Supabase)

Para integrar com o banco de dados:

1. Criar um cliente no Supabase
2. Criar um projeto vinculado ao cliente
3. Salvar o checklist com o payload JSONB:

```typescript
const onSubmit = async (data: ChecklistFormData) => {
  // 1. Criar/buscar cliente
  const cliente = await clientsService.create({
    nome: data.nomeCliente,
    // ... outros campos
  });

  // 2. Criar projeto
  const projeto = await projectsService.create({
    client_id: cliente.id,
    titulo_ambiente: data.tituloAmbiente,
    data_prevista_instalacao: data.dataPrevistaInstalacao,
    status: "pre_producao",
  });

  // 3. Salvar checklist
  const checklist = await checklistsService.create({
    project_id: projeto.id,
    tipo_etapa: "pre_producao", // ou determinar dinamicamente
    payload: {
      items: [...data.preProducao, ...data.saida, ...data.instalacao],
      observacoes: data.observacoes,
      assinatura_url: data.assinatura, // ou fazer upload para Storage
    },
  });
};
```

## Melhorias Futuras

- [ ] Upload de fotos durante a vistoria
- [ ] Upload da assinatura para Supabase Storage
- [ ] Modo offline (PWA com cache)
- [ ] Edição de vistorias existentes
- [ ] Geração de PDF da vistoria
- [ ] Envio por email/WhatsApp
- [ ] Histórico de vistorias
- [ ] Busca de clientes existentes (autocomplete)
