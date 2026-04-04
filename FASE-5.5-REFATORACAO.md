# Fase 5.5 - Refatoração Profunda de Requisitos de Negócio ✅

## Resumo das Mudanças

Esta fase implementou uma refatoração completa baseada no feedback do cliente (Marcenaria), movendo a lógica de materiais para o nível de móvel e adicionando especificações detalhadas do ambiente.

---

## 1. Schema Zod Atualizado (`checklistSchema.ts`)

### Dados Básicos - Novos Campos:
- ✅ `telefone` (string, obrigatório)
- ✅ `endereco` (string, obrigatório)
- ✅ `horarioVisita` (string, obrigatório)
- ✅ Label alterado: "Título do Ambiente" → "Ambientes e Móveis"

### Móveis - Refatoração Completa:
**Medidas agora em MM (milímetros)**

**Campos Básicos:**
- nome
- largura (mm)
- altura (mm)
- profundidade (mm)
- corMdfInterna
- corMdfExterna
- observacoesMovel (opcional)

**Campos Condicionais (Booleanos + Inputs):**

1. **temPuxador** → Se true, exige:
   - tipoPuxador (select)
   - corPuxador (string)

2. **temCorredicas** → Se true, exige:
   - tipoCorredica (select)

3. **temBascula** → Se true, exige:
   - tipoBascula (enum: 'comum' | 'inversa')

4. **temPortaVidro** → Se true, exige:
   - tipoPortaVidro (select)

5. **temFitaLed** → Se true, exige:
   - tipoFitaLed (select)

### Especificações do Ambiente (NOVO):
```typescript
{
  rodape: string (opcional),
  tipoParede: string (opcional),
  tubulacoesParede: boolean (opcional),
  temEstacionamento: boolean (opcional),
  temElevador: boolean,
  alturaElevador: string (condicional),
  profundidadeElevador: string (condicional)
}
```

### Eletrodomésticos - Novos Itens:
- TV
- Frigobar
- Freezer
- Fogão
- **Outros** (com input customizado)

### Removido:
- ❌ `preferenciaMateriais` (global)
- ❌ `composicaoProjeto` (global)

---

## 2. Step1DadosBasicos.tsx

### Novos Campos Adicionados:

```typescript
// Telefone
<input type="tel" placeholder="(11) 98765-4321" />

// Endereço
<input type="text" placeholder="Rua, número, bairro, cidade" />

// Horário da Visita
<input type="time" />
```

### Label Atualizado:
- "Título do Ambiente" → "Ambientes e Móveis"

---

## 3. Step2Levantamento.tsx - Refatoração Completa

### A. Móveis com Campos Condicionais

Cada móvel agora é um card expansível com:

**Medidas em MM:**
```typescript
<input placeholder="3000" /> // Largura em mm
<input placeholder="2800" /> // Altura em mm
<input placeholder="600" />  // Profundidade em mm
```

**Cores do MDF:**
- Cor MDF Interno
- Cor MDF Externo

**Checkboxes com Renderização Condicional:**

```typescript
// Exemplo: Puxador
{movel?.temPuxador && (
  <div className="p-4 bg-blue-50">
    <select {...register(`moveis.${index}.tipoPuxador`)}>
      {tipoPuxadorOptions.map(...)}
    </select>
    <input {...register(`moveis.${index}.corPuxador`)} />
  </div>
)}
```

**Cores de Fundo por Tipo:**
- Puxador: bg-blue-50
- Corrediças: bg-purple-50
- Báscula: bg-green-50
- Porta Vidro: bg-yellow-50
- Fita LED: bg-indigo-50

### B. Especificações do Ambiente (NOVA SEÇÃO)

```typescript
<div className="bg-white border-2 border-green-300">
  <h3>Especificações do Ambiente</h3>
  
  // Inputs
  - Rodapé
  - Tipo de Parede
  
  // Checkboxes
  - Tubulações na Parede?
  - Tem Estacionamento?
  - Tem Elevador?
  
  // Condicional Elevador
  {especificacoes?.temElevador && (
    <div>
      <input placeholder="Altura (mm)" />
      <input placeholder="Profundidade (mm)" />
    </div>
  )}
</div>
```

### C. Eletrodomésticos - "Outros"

```typescript
{eletro === 'Outros' ? (
  <input placeholder="Ex: Purificador de Água" />
) : (
  <input placeholder="Ex: Brastemp BRM56" />
)}
```

### D. Fotos - Bug Corrigido

**Antes:** Sobrescrevia fotos
**Depois:** Concatena novas fotos

```typescript
const novasFotos = [...fotosAmbiente, ...fotosBase64];
setValue('fotosAmbiente', novasFotos);
setFotosPreview([...fotosPreview, ...previews]);
```

---

## 4. ChecklistWizard.tsx

### Default Values Atualizados:

```typescript
defaultValues: {
  nomeCliente: '',
  telefone: '',
  endereco: '',
  tituloAmbiente: '',
  dataAtendimento: '',
  horarioVisita: '',
  moveis: [],
  eletrodomesticos: [],
  especificacoesAmbiente: {
    rodape: '',
    tipoParede: '',
    tubulacoesParede: false,
    temEstacionamento: false,
    temElevador: false,
    alturaElevador: '',
    profundidadeElevador: '',
  },
  pontosCriticos: '',
  fotosAmbiente: [],
  observacoes: '',
  assinatura: '',
}
```

### onSubmit - Cliente Atualizado:

```typescript
const { data: cliente } = await supabase
  .from('clients')
  .insert({
    tenant_id: tenant_id,
    nome: data.nomeCliente,
    telefone: data.telefone,      // ← NOVO
    endereco: data.endereco,       // ← NOVO
  })
```

### Payload Atualizado:

```typescript
const payload = {
  horarioVisita: data.horarioVisita,           // ← NOVO
  moveis: data.moveis,                         // ← REFATORADO
  eletrodomesticos: data.eletrodomesticos,
  especificacoesAmbiente: data.especificacoesAmbiente, // ← NOVO
  pontosCriticos: data.pontosCriticos,
  fotosAmbiente: data.fotosAmbiente,
  observacoes: data.observacoes,
  assinatura_url: data.assinatura,
};
```

### Template PDF Atualizado:

**Dados Básicos:**
```html
<p>Cliente: {savedData.nomeCliente}</p>
<p>Telefone: {savedData.telefone}</p>
<p>Endereço: {savedData.endereco}</p>
<p>Horário: {savedData.horarioVisita}</p>
```

**Móveis (Detalhado):**
```html
{savedData.moveis.map((movel) => (
  <div>
    <p>{movel.nome}</p>
    <p>Medidas: {movel.largura}mm × {movel.altura}mm × {movel.profundidade}mm</p>
    <p>MDF Interno: {movel.corMdfInterna} | MDF Externo: {movel.corMdfExterna}</p>
    {movel.temPuxador && <p>Puxador: {movel.tipoPuxador} - {movel.corPuxador}</p>}
    {movel.temCorredicas && <p>Corrediça: {movel.tipoCorredica}</p>}
    {movel.temBascula && <p>Báscula: {movel.tipoBascula}</p>}
    {movel.temPortaVidro && <p>Porta Vidro: {movel.tipoPortaVidro}</p>}
    {movel.temFitaLed && <p>Fita LED: {movel.tipoFitaLed}</p>}
    {movel.observacoesMovel && <p>Obs: {movel.observacoesMovel}</p>}
  </div>
))}
```

**Especificações do Ambiente:**
```html
{savedData.especificacoesAmbiente && (
  <div>
    <h2>Especificações do Ambiente</h2>
    {savedData.especificacoesAmbiente.rodape && <p>Rodapé: {rodape}</p>}
    {savedData.especificacoesAmbiente.tipoParede && <p>Tipo de Parede: {tipoParede}</p>}
    <p>Tubulações: {tubulacoesParede ? 'Sim' : 'Não'}</p>
    <p>Estacionamento: {temEstacionamento ? 'Sim' : 'Não'}</p>
    {savedData.especificacoesAmbiente.temElevador && (
      <p>Elevador: {alturaElevador}mm × {profundidadeElevador}mm</p>
    )}
  </div>
)}
```

---

## Validações Implementadas

### Etapa 1:
- ✅ Nome do cliente (min 3 caracteres)
- ✅ Telefone (obrigatório)
- ✅ Endereço (obrigatório)
- ✅ Ambientes e Móveis (min 3 caracteres)
- ✅ Data do atendimento (obrigatória)
- ✅ Horário da visita (obrigatório)

### Etapa 2:
- ✅ Pelo menos 1 móvel
- ✅ Cada móvel: nome, medidas, cores MDF
- ✅ Se marcou checkbox, campo condicional é obrigatório
- ✅ Se tem elevador, altura e profundidade obrigatórias

### Etapa 3:
- ✅ Assinatura obrigatória

---

## Estrutura de Dados Salva

```json
{
  "cliente": {
    "nome": "Maria Silva",
    "telefone": "(11) 98765-4321",
    "endereco": "Rua Exemplo, 123"
  },
  "projeto": {
    "titulo_ambiente": "Cozinha Planejada",
    "data_prevista_instalacao": "2024-01-15",
    "status": "orcamento"
  },
  "checklist": {
    "tipo_etapa": "pre_producao",
    "payload": {
      "horarioVisita": "14:30",
      "moveis": [
        {
          "nome": "Armário Aéreo",
          "largura": "3000",
          "altura": "700",
          "profundidade": "350",
          "corMdfInterna": "Branco Cristal",
          "corMdfExterna": "Nogueira",
          "observacoesMovel": "Cliente quer prateleiras ajustáveis",
          "temPuxador": true,
          "tipoPuxador": "Cava",
          "corPuxador": "Preto Fosco",
          "temCorredicas": false,
          "temBascula": false,
          "temPortaVidro": false,
          "temFitaLed": true,
          "tipoFitaLed": "Branca Quente"
        }
      ],
      "eletrodomesticos": [
        { "nome": "Geladeira", "modelo": "Brastemp BRM56" },
        { "nome": "Outros", "modelo": "Purificador de Água Soft" }
      ],
      "especificacoesAmbiente": {
        "rodape": "MDF Branco",
        "tipoParede": "Alvenaria",
        "tubulacoesParede": true,
        "temEstacionamento": true,
        "temElevador": true,
        "alturaElevador": "2100",
        "profundidadeElevador": "1400"
      },
      "pontosCriticos": "Tomada atrás da geladeira...",
      "fotosAmbiente": ["data:image/png;base64,..."],
      "observacoes": "Cliente quer entrega em 30 dias",
      "assinatura_url": "data:image/png;base64,..."
    }
  }
}
```

---

## Arquivos Modificados

### Criados/Substituídos:
1. ✅ `src/schemas/checklistSchema.ts` - Schema completamente refatorado
2. ✅ `src/components/checklist/Step1DadosBasicos.tsx` - 3 novos campos
3. ✅ `src/components/checklist/Step2Levantamento.tsx` - Refatoração completa
4. ✅ `src/components/checklist/ChecklistWizard.tsx` - Defaults, onSubmit e PDF atualizados

---

## Como Testar

### 1. Dados Básicos:
- Preencha nome, telefone, endereço
- Preencha ambiente, data e horário
- Avance

### 2. Levantamento:
- Adicione 2 móveis
- Para cada móvel:
  - Nome, medidas em MM
  - Cores MDF interno e externo
  - Marque "Tem Puxador" → Preencha tipo e cor
  - Marque "Tem Fita LED" → Escolha tipo
- Especificações:
  - Preencha rodapé e tipo de parede
  - Marque "Tem Elevador" → Preencha medidas
- Eletrodomésticos:
  - Marque "Geladeira" → Modelo
  - Marque "Outros" → Nome customizado
- Adicione 2-3 fotos
- Avance

### 3. Finalização:
- Observações
- Assine
- Salve

### 4. Verificar:
- Console.log dos dados
- Gerar PDF
- Verificar todas as informações no PDF

---

## Resumo das Melhorias

✅ Materiais movidos para nível de móvel
✅ Medidas em MM (mais preciso)
✅ Campos condicionais inteligentes
✅ Especificações do ambiente detalhadas
✅ Telefone e endereço no cliente
✅ Horário da visita registrado
✅ Bug de fotos corrigido (concatenação)
✅ Eletrodomésticos customizáveis ("Outros")
✅ PDF atualizado com todas as informações
✅ Validações robustas

O sistema agora reflete exatamente o fluxo de trabalho real da marcenaria! 🎉
