import { z } from "zod";

// Schema para cada móvel com todas as especificações
const movelSchema = z
  .object({
    nome: z.string().min(1, "Nome do móvel é obrigatório"),
    largura: z.string().min(1, "Largura é obrigatória"),
    altura: z.string().min(1, "Altura é obrigatória"),
    profundidade: z.string().min(1, "Profundidade é obrigatória"),
    corMdfInterna: z.string().min(1, "Cor do MDF interno é obrigatória"),
    corMdfExterna: z.string().min(1, "Cor do MDF externo é obrigatória"),
    observacoesMovel: z.string().optional(),

    // Campos condicionais
    temPuxador: z.boolean(),
    tipoPuxador: z.string().optional(),
    detalhesPuxador: z.string().optional(),

    temCorredicas: z.boolean(),
    tipoCorredica: z.string().optional(),
    finalidadeCorredica: z.string().optional(),

    temBascula: z.boolean(),
    tipoBascula: z.enum(["comum", "inversa"]).optional(),

    temPortaVidro: z.boolean(),
    tipoPortaVidro: z.string().optional(),

    temFitaLed: z.boolean(),
    tipoFitaLed: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.temPuxador && (!data.tipoPuxador || !data.detalhesPuxador)) {
        return false;
      }
      if (
        data.temCorredicas &&
        (!data.tipoCorredica || !data.finalidadeCorredica)
      ) {
        return false;
      }
      if (data.temBascula && !data.tipoBascula) {
        return false;
      }
      if (data.temPortaVidro && !data.tipoPortaVidro) {
        return false;
      }
      if (data.temFitaLed && !data.tipoFitaLed) {
        return false;
      }
      return true;
    },
    {
      message: "Preencha todos os campos obrigatórios dos itens marcados",
    },
  );

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
  .refine(
    (data) => {
      if (
        data.temElevador &&
        (!data.alturaElevador || !data.profundidadeElevador)
      ) {
        return false;
      }
      if (data.tubulacoesParede && !data.localTubulacao) {
        return false;
      }
      return true;
    },
    {
      message: "Preencha todos os campos obrigatórios",
    },
  );

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
