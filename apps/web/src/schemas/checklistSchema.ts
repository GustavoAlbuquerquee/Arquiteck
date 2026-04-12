import { z } from "zod";

// Schema para cada móvel com todas as especificações
const movelSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome do móvel é obrigatório"),
    largura: z.string().trim().min(1, "Largura é obrigatória"),
    altura: z.string().trim().min(1, "Altura é obrigatória"),
    profundidade: z.string().trim().min(1, "Profundidade é obrigatória"),
    corMdfInterna: z.string().trim().min(1, "Cor do MDF interno é obrigatória"),
    corMdfExterna: z.string().trim().min(1, "Cor do MDF externo é obrigatória"),
    observacoesMovel: z.string().optional(),

    // Campos condicionais
    temPuxador: z.boolean(),
    tipoPuxador: z.string().optional(),
    detalhesPuxador: z.string().optional(),

    temCorredicas: z.boolean(),
    tipoCorredica: z.string().optional(),
    finalidadeCorredica: z.string().optional(),

    temBascula: z.boolean(),
    tipoBascula: z.enum(["comum", "inversa", ""]).optional().nullable(),

    temPortaVidro: z.boolean(),
    tipoPortaVidro: z.string().optional(),

    temFitaLed: z.boolean(),
    tipoFitaLed: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.temPuxador && !data.tipoPuxador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o tipo de puxador",
        path: ["tipoPuxador"],
      });
    }
    if (data.temPuxador && !data.detalhesPuxador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe os detalhes do puxador",
        path: ["detalhesPuxador"],
      });
    }
    if (data.temCorredicas && !data.tipoCorredica) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o tipo de corrediça",
        path: ["tipoCorredica"],
      });
    }
    if (data.temCorredicas && !data.finalidadeCorredica) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a finalidade da corrediça",
        path: ["finalidadeCorredica"],
      });
    }
    if (data.temBascula && !data.tipoBascula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o tipo de báscula",
        path: ["tipoBascula"],
      });
    }
    if (data.temPortaVidro && !data.tipoPortaVidro) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o tipo de porta de vidro",
        path: ["tipoPortaVidro"],
      });
    }
    if (data.temFitaLed && !data.tipoFitaLed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o tipo de fita LED",
        path: ["tipoFitaLed"],
      });
    }
  });

// Schema para eletrodomésticos com modelo
const eletrodomesticoSchema = z.object({
  nome: z.string(),
  modelo: z.string().optional(),
});

// Schema para especificações do ambiente
const especificacoesAmbienteSchema = z
  .object({
    rodape: z.string().optional(),
    alturaRodape: z.string().optional(),
    profundidadeRodape: z.string().optional(),
    tipoParede: z.string().optional(),
    tubulacoesParede: z.boolean().optional(),
    localTubulacao: z.string().optional(),
    temEstacionamento: z.boolean().optional(),
    temElevador: z.boolean(),
    alturaElevador: z.string().optional(),
    profundidadeElevador: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.temElevador && !data.alturaElevador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a altura do elevador",
        path: ["alturaElevador"],
      });
    }
    if (data.temElevador && !data.profundidadeElevador) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a profundidade do elevador",
        path: ["profundidadeElevador"],
      });
    }
    if (data.tubulacoesParede && !data.localTubulacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o local das tubulações",
        path: ["localTubulacao"],
      });
    }
  });

// Schema completo do formulário de Briefing/Primeira Visita
export const checklistSchema = z.object({
  // Etapa 1: Dados Básicos
  nomeCliente: z
    .string()
    .min(3, "Nome do cliente deve ter no mínimo 3 caracteres"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  tituloAmbiente: z
    .string()
    .min(3, "Ambientes e Móveis deve ter no mínimo 3 caracteres"),
  dataAtendimento: z.string().min(1, "Data do atendimento é obrigatória"),
  horarioVisita: z.string().min(1, "Horário da visita é obrigatório"),

  // Etapa 2: Levantamento Técnico
  moveis: z.array(movelSchema).min(1, "Adicione pelo menos um móvel"),
  eletrodomesticos: z.array(eletrodomesticoSchema),
  especificacoesAmbiente: especificacoesAmbienteSchema.optional(),
  pontosCriticos: z.string().optional(),
  fotosAmbiente: z.array(z.string()).optional(),

  // Etapa 3: Finalização
  observacoes: z.string().optional(),
  assinatura: z.string().min(1, "Assinatura é obrigatória"),
});

export type ChecklistFormData = z.infer<typeof checklistSchema>;

// Opções de eletrodomésticos disponíveis (ATUALIZADAS)
export const eletrodomesticosOptions = [
  "Geladeira",
  "Forno Elétrico",
  "Microondas",
  "Cooktop",
  "Coifa",
  "Máquina de Lavar",
  "Lava-Louças",
  "Adega",
  "TV",
  "Frigobar",
  "Freezer",
  "Fogão",
  "Outros",
];

// Opções de tipos de puxadores
export const tipoPuxadorOptions = [
  "Cava",
  "Perfil",
  "Alça",
  "Ponto",
  "Slim",
  "Puxador Redondo",
  "Puxador Quadrado",
  "Sem Puxador (Push)",
  "Outros",
];

// Opções de tipos de corrediças
export const tipoCorredicas = [
  "Telescópica",
  "Push to Open",
  "Soft Close",
  "Quadro",
];

// Opções de tipos de fita LED
export const tipoFitaLedOptions = [
  "Branca Fria",
  "Branca Quente",
  "RGB",
  "Amarela",
];

// Opções de tipos de porta de vidro
export const tipoPortaVidroOptions = [
  "Temperado Transparente",
  "Temperado Fumê",
  "Canelado",
  "Espelhado",
  "Refletente",
];
