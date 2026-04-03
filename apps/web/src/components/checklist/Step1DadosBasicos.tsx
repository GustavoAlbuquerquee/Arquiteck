import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ChecklistFormData } from '@/schemas/checklistSchema';
import { Calendar, User, Home } from 'lucide-react';

interface Step1Props {
  register: UseFormRegister<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
}

export function Step1DadosBasicos({ register, errors }: Step1Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dados Básicos do Atendimento</h2>

      {/* Nome do Cliente */}
      <div>
        <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-3">
          <User className="w-6 h-6" />
          Nome do Cliente
        </label>
        <input
          type="text"
          {...register('nomeCliente')}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          placeholder="Digite o nome do cliente"
        />
        {errors.nomeCliente && (
          <p className="text-red-500 text-sm mt-2">{errors.nomeCliente.message}</p>
        )}
      </div>

      {/* Título do Ambiente */}
      <div>
        <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-3">
          <Home className="w-6 h-6" />
          Título do Ambiente
        </label>
        <input
          type="text"
          {...register('tituloAmbiente')}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          placeholder="Ex: Cozinha Planejada, Dormitório Casal"
        />
        {errors.tituloAmbiente && (
          <p className="text-red-500 text-sm mt-2">{errors.tituloAmbiente.message}</p>
        )}
      </div>

      {/* Data do Atendimento */}
      <div>
        <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-3">
          <Calendar className="w-6 h-6" />
          Data do Atendimento
        </label>
        <input
          type="date"
          {...register('dataAtendimento')}
          className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
        />
        {errors.dataAtendimento && (
          <p className="text-red-500 text-sm mt-2">{errors.dataAtendimento.message}</p>
        )}
      </div>
    </div>
  );
}
