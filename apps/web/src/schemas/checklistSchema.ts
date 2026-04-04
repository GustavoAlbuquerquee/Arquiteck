import { z } from 'zod';

// Schema para cada móvel com medidas
const movelSchema = z.object({
  nome: z.string().min(1, 'Nome do móvel é obrigatório'),
  largura: z.string().min(1, 'Largura é obrigatória'),
  altura: z.string().min(1, 'Altura é obrigatória'),
  profundidade: z.string().min(1, 'Profundidade é obrigatória'),
});

// Schema para eletrodomésticos com modelo
const eletrodomesticoSchema = z.object({
  nome: z.string(),
  modelo: z.string().optional(),
});

// Schema completo do formulário de Briefing/Primeira Visita
export const checklistSchema = z.object({
  // Etapa 1: Dados Básicos
  nomeCliente: z.string().min(3, 'Nome do cliente deve ter no mínimo 3 caracteres'),
  tituloAmbiente: z.string().min(3, 'Título do ambiente deve ter no mínimo 3 caracteres'),
  dataAtendimento: z.string().min(1, 'Data do atendimento é obrigatória'),

  // Etapa 2: Levantamento Técnico
  moveis: z.array(movelSchema).min(1, 'Adicione pelo menos um móvel'),
  eletrodomesticos: z.array(eletrodomesticoSchema),
  pontosCriticos: z.string().optional(),
  preferenciaMateriais: z.object({
    corPadraoMdf: z.string().min(1, 'Cor/Padrão do MDF é obrigatório'),
    tipoPuxador: z.string().min(1, 'Tipo de puxador é obrigatório'),
  }),
  composicaoProjeto: z.object({
    teraCorredicas: z.boolean(),
    teraGavetas: z.boolean(),
    teraPortas: z.boolean(),
    teraFitaLed: z.boolean(),
  }),
  fotosAmbiente: z.array(z.string()).optional(), // Array de Base64

  // Etapa 3: Finalização
  observacoes: z.string().optional(),
  assinatura: z.string().min(1, 'Assinatura é obrigatória'),
});

export type ChecklistFormData = z.infer<typeof checklistSchema>;

// Opções de eletrodomésticos disponíveis
export const eletrodomesticosOptions = [
  'Geladeira',
  'Forno Elétrico',
  'Microondas',
  'Cooktop',
  'Coifa',
  'Máquina de Lavar',
  'Lava-Louças',
  'Adega',
];

// Opções de tipos de puxadores (ATUALIZADAS)
export const tipoPuxadorOptions = [
  'Cava',
  'Perfil',
  'Alça',
  'Ponto',
  'Slim',
  'Puxador Redondo',
  'Puxador Quadrado',
  'Sem Puxador (Push)',
];
