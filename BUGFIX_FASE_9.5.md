# Bugfix Fase 9.5 - Layout Mobile e Validação ✅

## Problemas Corrigidos

### 1. ✅ Schema de Validação (checklistSchema.ts)

**Problema:** Campo `tipoBascula` causava erro de validação mesmo quando desmarcado.

**Solução:**
```typescript
// ANTES: .refine() genérico que não especificava o campo do erro
.refine((data) => {
  if (data.temBascula && !data.tipoBascula) {
    return false;
  }
  return true;
}, { message: "Preencha todos os campos obrigatórios" })

// DEPOIS: .superRefine() com erros específicos por campo
.superRefine((data, ctx) => {
  if (data.temBascula && !data.tipoBascula) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione o tipo de báscula",
      path: ["tipoBascula"],
    });
  }
})
```

**Mudanças:**
- `tipoBascula` agora é `.optional().nullable()` para aceitar undefined
- Trocado `.refine()` por `.superRefine()` para erros específicos
- Cada campo condicional tem seu próprio `ctx.addIssue()` com path correto
- Aplicado também em `especificacoesAmbienteSchema`

### 2. ✅ Layout Mobile - Medidas (Step2Levantamento.tsx)

**Problema:** Grid de 3 colunas quebrava em mobile, texto "(mm)" ficava em linha separada.

**Solução:**
```tsx
// ANTES
<div className="grid grid-cols-3 gap-3">

// DEPOIS
<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
```

**Resultado:** Em mobile, os 3 campos (Largura, Altura, Profundidade) ficam empilhados verticalmente.

### 3. ✅ Layout Mobile - Elevador e Rodapé

**Problema:** Mesma quebra de layout nos campos de dimensões.

**Solução:**
```tsx
// Rodapé
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-green-50 rounded-lg border border-green-200">

// Elevador
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
```

### 4. ✅ Botão "Adicionar Móvel"

**Problema:** Botão pequeno e achatado em mobile.

**Solução:**
```tsx
// ANTES
className="flex items-center gap-2 px-4 h-10 bg-primor-primary..."

// DEPOIS
className="w-full md:w-auto flex items-center justify-center gap-2 px-4 md:px-6 h-10 md:h-12 bg-primor-primary... text-sm md:text-base"
```

**Resultado:** 
- Mobile: botão ocupa 100% da largura, altura 10 (40px), texto small
- Desktop: botão com largura automática, altura 12 (48px), texto base

### 5. ✅ Limpeza de Campo ao Desmarcar Checkbox

**Problema:** Ao desmarcar "Tem Báscula", o valor do select permanecia, causando erro de validação.

**Solução:**
```tsx
<input
  type="checkbox"
  {...register(`moveis.${index}.temBascula`)}
  onChange={(e) => {
    const checked = e.target.checked;
    if (!checked) {
      setValue(`moveis.${index}.tipoBascula`, undefined);
    }
  }}
  className="w-5 h-5"
/>
```

**Resultado:** Ao desmarcar, o campo `tipoBascula` é limpo automaticamente.

## Arquivos Modificados

### checklistSchema.ts
- `movelSchema`: Trocado `.refine()` por `.superRefine()`
- `tipoBascula`: Adicionado `.nullable()`
- Erros específicos com `path` para cada campo condicional
- `especificacoesAmbienteSchema`: Mesma refatoração

### Step2Levantamento.tsx
- Grid de medidas: `grid-cols-1 md:grid-cols-3`
- Grid rodapé: `grid-cols-1 md:grid-cols-2`
- Grid elevador: `grid-cols-1 md:grid-cols-2`
- Botão "Adicionar Móvel": `w-full md:w-auto` + tamanhos responsivos
- Checkbox báscula: `onChange` com `setValue` para limpar campo

## Teste de Validação

### Cenário 1: Báscula Marcada
1. Marcar "Tem Báscula?"
2. Campo "Tipo de Báscula" aparece
3. Tentar salvar sem preencher
4. ✅ Erro específico: "Selecione o tipo de báscula"

### Cenário 2: Báscula Desmarcada
1. Marcar "Tem Báscula?"
2. Selecionar "Comum"
3. Desmarcar "Tem Báscula?"
4. ✅ Campo é limpo automaticamente
5. ✅ Nenhum erro de validação

### Cenário 3: Mobile Layout
1. Abrir em 375px (iPhone)
2. ✅ Medidas empilhadas verticalmente
3. ✅ Botão "Adicionar Móvel" full-width
4. ✅ Sem quebra de texto "(mm)"
5. ✅ Campos de elevador empilhados

## Resultado Final

✅ Validação funciona corretamente com campos condicionais
✅ Erros específicos por campo (não mais genéricos)
✅ Layout mobile sem quebras
✅ Botões responsivos e acessíveis
✅ Limpeza automática de campos ao desmarcar
✅ Grid adaptativo (1 col → 2 cols → 3 cols)
