import { z } from 'zod';

// Schema completo do formulário de Briefing/Primeira Visita
export const checklistSchema = z.object({
  // Etapa 1: Dados Básicos
  nomeCliente: z.string().min(3, 'Nome do cliente deve ter no mínimo 3 caracteres'),
  tituloAmbiente: z.string().min(3, 'Título do ambiente deve ter no mínimo 3 caracteres'),
  dataAtendimento: z.string().min(1, 'Data do atendimento é obrigatória'),

  // Etapa 2: Levantamento Técnico
  dimensoes: z.object({
    largura: z.string().min(1, 'Largura é obrigatória'),
    altura: z.string().min(1, 'Altura é obrigatória'),
    profundidade: z.string().min(1, 'Profundidade é obrigatória'),
  }),
  eletrodomesticos: z.array(z.string()),
  pontosCriticos: z.string().optional(),
  preferenciaMateriais: z.object({
    corPadraoMdf: z.string().min(1, 'Cor/Padrão do MDF é obrigatório'),
    tipoPuxador: z.string().min(1, 'Tipo de puxador é obrigatório'),
  }),

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

// Opções de tipos de puxadores
export const tipoPuxadorOptions = [
  'Cava',
  'Perfil',
  'Alça',
  'Puxador Redondo',
  'Puxador Quadrado',
  'Sem Puxador (Push)',
];
