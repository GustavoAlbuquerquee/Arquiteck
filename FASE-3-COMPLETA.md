# Guia Rápido - Fase 3 Concluída ✅

## 🚀 Como Rodar o Projeto

```bash
# Instalar dependências (se ainda não instalou)
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Acessar no navegador
http://localhost:3000
```

## 📦 Dependências Instaladas

```bash
pnpm add react-hook-form @hookform/resolvers zod react-signature-canvas lucide-react @types/react-signature-canvas
```

## 🎯 O Que Foi Criado

### Estrutura de Arquivos

```
apps/web/src/
├── schemas/
│   └── checklistSchema.ts          # Schema Zod + validações
├── components/
│   └── checklist/
│       ├── ChecklistWizard.tsx     # Componente principal
│       ├── Step1DadosBasicos.tsx   # Etapa 1
│       ├── Step2ChecklistOperacional.tsx  # Etapa 2
│       └── Step3Finalizacao.tsx    # Etapa 3
└── pages/
    └── index.tsx                    # NovaVisita atualizada
```

### Documentação

- **WIZARD.md** - Documentação completa do Wizard

## 🎨 Características de UX/UI

### Otimizado para Tablet
✅ Inputs grandes (h-14 = 56px)
✅ Botões grandes (h-12/h-14)
✅ Checkboxes visuais (32px)
✅ Texto legível (text-lg = 18px)
✅ Áreas de toque expandidas
✅ Feedback visual em todas as interações

### Navegação Intuitiva
✅ Indicador de progresso (1 → 2 → 3)
✅ Botões "Voltar" e "Avançar" fixos
✅ Validação por etapa
✅ Scroll automático ao trocar etapa
✅ Alerta de sucesso animado

### Assinatura Digital
✅ Canvas responsivo
✅ Suporte a touch/stylus
✅ Botão "Limpar Assinatura"
✅ Conversão para Base64
✅ Validação obrigatória

## 🧪 Como Testar

1. Acesse `http://localhost:3000`
2. Clique em "Nova Visita" na sidebar
3. Preencha a Etapa 1 e clique em "Avançar"
4. Marque alguns checkboxes na Etapa 2 e clique em "Avançar"
5. Escreva observações e assine no canvas
6. Clique em "Salvar Vistoria"
7. Abra o Console do navegador (F12) para ver os dados

## 📊 Formato dos Dados (Console)

```json
{
  "dadosBasicos": {
    "nomeCliente": "João Silva",
    "tituloAmbiente": "Cozinha Planejada",
    "dataPrevistaInstalacao": "2024-03-15"
  },
  "checklist": {
    "preProducao": [
      { "label": "Projeto final aprovado", "checked": true }
    ],
    "saida": [...],
    "instalacao": [...]
  },
  "finalizacao": {
    "observacoes": "Observações aqui",
    "assinaturaBase64": "data:image/png;base64,..."
  }
}
```

## 🔄 Próxima Fase (Integração com Supabase)

Para conectar o Wizard ao banco de dados:

### 1. Configurar .env

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 2. Executar SQL no Supabase

- Vá em SQL Editor
- Execute o conteúdo de `supabase-schema.sql`

### 3. Gerar Tipos

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/lib/supabase/types.ts
```

### 4. Modificar onSubmit no ChecklistWizard.tsx

```typescript
const onSubmit = async (data: ChecklistFormData) => {
  try {
    // 1. Criar cliente
    const cliente = await clientsService.create({
      nome: data.nomeCliente,
    });

    // 2. Criar projeto
    const projeto = await projectsService.create({
      client_id: cliente.id,
      titulo_ambiente: data.tituloAmbiente,
      data_prevista_instalacao: data.dataPrevistaInstalacao,
      status: 'pre_producao',
    });

    // 3. Salvar checklist
    await checklistsService.create({
      project_id: projeto.id,
      tipo_etapa: 'pre_producao',
      payload: {
        preProducao: data.preProducao,
        saida: data.saida,
        instalacao: data.instalacao,
        observacoes: data.observacoes,
        assinatura_url: data.assinatura, // ou fazer upload
      },
    });

    setShowSuccessAlert(true);
  } catch (error) {
    console.error('Erro ao salvar:', error);
    // Mostrar alerta de erro
  }
};
```

## 🎯 Melhorias Futuras

- [ ] Busca de clientes existentes (autocomplete)
- [ ] Upload de fotos durante vistoria
- [ ] Upload de assinatura para Supabase Storage
- [ ] Modo offline (PWA)
- [ ] Edição de vistorias
- [ ] Geração de PDF
- [ ] Envio por email/WhatsApp

## 📱 Testando em Tablet Real

Para testar em um tablet na mesma rede:

```bash
# Descobrir seu IP local
ipconfig  # Windows
ifconfig  # Mac/Linux

# Acessar do tablet
http://SEU_IP:3000
# Exemplo: http://192.168.1.100:3000
```

## 🐛 Troubleshooting

### Erro de compilação TypeScript
```bash
# Limpar cache e reinstalar
rm -rf node_modules .turbo
pnpm install
```

### Canvas não funciona no touch
- Verifique se `touch-none` está aplicado no canvas
- Teste com `touch-action: none` no CSS

### Validação não funciona
- Verifique se o schema Zod está correto
- Veja erros no console (F12)

## 📚 Documentação Adicional

- [README.md](./README.md) - Setup geral do projeto
- [SUPABASE.md](./SUPABASE.md) - Configuração do banco
- [EXEMPLOS.md](./EXEMPLOS.md) - Exemplos de uso dos services
- [WIZARD.md](./WIZARD.md) - Documentação completa do Wizard
- [DATABASE-ARCHITECTURE.md](./DATABASE-ARCHITECTURE.md) - Arquitetura do banco
