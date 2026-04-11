# Guia de Rebranding - Arquiteck Primor Móveis

## ✅ Concluído

1. **tailwind.config.js** - Paleta de cores Primor adicionada
2. **index.html** - Título e theme-color atualizados
3. **Sidebar.tsx** - Nova identidade visual aplicada
4. **Login.tsx** - Cores Primor implementadas

## 🔄 Mudanças Pendentes (Aplicar Manualmente)

### Register.tsx
Substituir:
- `bg-gradient-to-br from-green-50 to-green-100` → `bg-primor-bg-light`
- `text-gray-900` → `text-primor-secondary`
- `text-gray-600` → `text-primor-gray-dark`
- `bg-green-100` → `bg-primor-primary/10`
- `text-green-600` → `text-primor-primary`
- `bg-green-600 hover:bg-green-700` → `bg-primor-primary hover:brightness-110`
- `border-gray-300` → `border-primor-gray-medium`
- `focus:border-green-500` → `focus:border-primor-primary`
- Adicionar: `bg-primor-bg-light` nos inputs
- Footer: "© 2024 Arquiteck - Primor Móveis"

### ChecklistWizard.tsx (Template PDF)
Linha ~500+:
```tsx
<h1 className="text-3xl font-bold text-primor-secondary">Arquiteck - Primor Móveis</h1>
<p className="text-lg text-primor-gray-dark">Briefing de Primeira Visita</p>
```

### Step2Levantamento.tsx
Substituir cores de seções:
- `bg-blue-50 border-blue-300` → `bg-primor-bg-light border-primor-primary/30`
- `bg-green-50 border-green-300` → `bg-primor-bg-light border-primor-primary/30`
- `bg-purple-50 border-purple-300` → `bg-primor-bg-light border-primor-secondary/20`
- `bg-pink-50 border-pink-300` → `bg-primor-bg-light border-primor-primary/30`
- `bg-orange-50 border-orange-300` → `bg-primor-bg-light border-primor-primary/30`

Botões:
- `bg-blue-600 hover:bg-blue-700` → `bg-primor-primary hover:brightness-110 text-primor-text-dark`
- `text-blue-600` → `text-primor-primary`
- `border-gray-300` → `border-primor-gray-medium`
- `text-gray-700` → `text-primor-text-light`
- `text-gray-500` → `text-primor-gray-dark`

### Step1DadosBasicos.tsx
- `text-gray-800` → `text-primor-text-light`
- `text-gray-700` → `text-primor-text-light`
- `text-gray-500` → `text-primor-gray-dark`
- `border-gray-300` → `border-primor-gray-medium`
- `focus:border-blue-500` → `focus:border-primor-primary`

### Step3Finalizacao.tsx
- Mesmas substituições do Step1
- Botão de limpar assinatura: `bg-red-600` pode manter
- Canvas de assinatura: `border-gray-300` → `border-primor-gray-medium`

### Historico.tsx
Status Badges (manter tons pastéis mas ajustar):
```tsx
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    orcamento: 'bg-amber-100 text-amber-800 border-amber-300',
    pre_producao: 'bg-orange-100 text-orange-800 border-orange-300',
    producao: 'bg-primor-primary/20 text-primor-secondary border-primor-primary',
    instalacao: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    concluido: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};
```

Botões e Cards:
- `bg-blue-600 hover:bg-blue-700` → `bg-primor-primary hover:brightness-110 text-primor-text-dark`
- `border-gray-200 hover:border-blue-300` → `border-primor-gray-medium hover:border-primor-primary`
- `text-gray-800` → `text-primor-text-light`
- `text-gray-500` → `text-primor-gray-dark`
- `bg-orange-600 hover:bg-orange-700` → `bg-primor-secondary hover:brightness-110 text-primor-text-dark`

### Dashboard.tsx
- `bg-blue-600` → `bg-primor-primary`
- `bg-green-600` → `bg-primor-secondary`
- `text-blue-600` → `text-primor-primary`
- `border-gray-200` → `border-primor-gray-medium`
- `text-gray-800` → `text-primor-text-light`

### InstallPWA.tsx
- `from-blue-600 to-blue-700` → `from-primor-secondary to-primor-secondary/90`
- `border-blue-500` → `border-primor-primary`
- `text-blue-100` → `text-primor-text-dark/80`
- `bg-white text-blue-600` → `bg-primor-primary text-primor-secondary`
- `bg-blue-800/50` → `bg-primor-secondary/50`

## 🎨 Paleta de Cores Primor

```css
primor-primary: #F0A02D      /* Laranja/Dourado - Botões principais */
primor-secondary: #603829    /* Marrom Escuro - Headers, sidebar */
primor-text-light: #603829   /* Texto sobre fundos claros */
primor-text-dark: #FFFFFF    /* Texto sobre fundos escuros */
primor-bg: #FFFFFF           /* Fundo padrão */
primor-bg-light: #fbf7f4     /* Bege claro - Cards, inputs */
primor-gray-medium: #e0e0e0  /* Bordas */
primor-gray-dark: #5a5a5a    /* Textos secundários */
```

## 📝 Padrões de Uso

### Botões Principais
```tsx
className="bg-primor-primary hover:brightness-110 text-primor-text-dark"
```

### Botões Secundários
```tsx
className="bg-primor-secondary hover:brightness-110 text-primor-text-dark"
```

### Cards/Seções
```tsx
className="bg-primor-bg-light border-primor-gray-medium"
```

### Inputs
```tsx
className="border-primor-gray-medium focus:border-primor-primary bg-primor-bg-light"
```

### Textos
- Títulos: `text-primor-text-light` ou `text-primor-secondary`
- Descrições: `text-primor-gray-dark`
- Sobre fundos escuros: `text-primor-text-dark`

## 🚀 Próximos Passos

1. Aplicar mudanças nos arquivos listados acima
2. Testar em desenvolvimento: `pnpm dev`
3. Verificar contraste de cores (acessibilidade)
4. Criar ícones PWA com as cores da marca
5. Deploy!
