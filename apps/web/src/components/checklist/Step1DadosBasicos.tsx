import { UseFormRegister, FieldErrors, Controller, Control } from 'react-hook-form';
import { ChecklistFormData } from '@/schemas/checklistSchema';
import { Calendar, User, Home, Phone, MapPin, Clock } from 'lucide-react';
import InputMask from 'react-input-mask';

interface Step1Props {
  register: UseFormRegister<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  control: Control<ChecklistFormData>;
}

export function Step1DadosBasicos({ register, errors, control }: Step1Props) {
  return (
    <div className="space-y-4 md:space-y-6 w-full overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">Dados Básicos do Atendimento</h2>

      {/* Nome do Cliente */}
      <div className="w-full">
        <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
          <User className="w-5 h-5 md:w-6 md:h-6" />
          Nome do Cliente
        </label>
        <input
          type="text"
          {...register('nomeCliente')}
          className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          placeholder="Digite o nome do cliente"
        />
        {errors.nomeCliente && (
          <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.nomeCliente.message}</p>
        )}
      </div>

      {/* Telefone */}
      <div className="w-full">
        <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
          <Phone className="w-5 h-5 md:w-6 md:h-6" />
          Telefone
        </label>
        <Controller
          name="telefone"
          control={control}
          render={({ field }) => (
            <InputMask
              mask="(99) 99999-9999"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            >
              {(inputProps: any) => (
                <input
                  {...inputProps}
                  type="tel"
                  className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                  placeholder="(11) 98765-4321"
                />
              )}
            </InputMask>
          )}
        />
        {errors.telefone && (
          <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.telefone.message}</p>
        )}
      </div>

      {/* Endereço */}
      <div className="w-full">
        <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
          <MapPin className="w-5 h-5 md:w-6 md:h-6" />
          Endereço
        </label>
        <input
          type="text"
          {...register('endereco')}
          className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          placeholder="Rua, número, bairro, cidade"
        />
        {errors.endereco && (
          <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.endereco.message}</p>
        )}
      </div>

      {/* Ambientes e Móveis */}
      <div className="w-full">
        <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
          <Home className="w-5 h-5 md:w-6 md:h-6" />
          Ambientes e Móveis
        </label>
        <input
          type="text"
          {...register('tituloAmbiente')}
          className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          placeholder="Ex: Cozinha Planejada, Dormitório Casal"
        />
        {errors.tituloAmbiente && (
          <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.tituloAmbiente.message}</p>
        )}
      </div>

      {/* Data e Horário - Grid Responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
        {/* Data do Atendimento */}
        <div className="w-full">
          <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            Data do Atendimento
          </label>
          <input
            type="date"
            {...register('dataAtendimento')}
            className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
          {errors.dataAtendimento && (
            <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.dataAtendimento.message}</p>
          )}
        </div>

        {/* Horário da Visita */}
        <div className="w-full">
          <label className="flex items-center gap-2 text-base md:text-lg font-medium text-gray-700 mb-2 md:mb-3">
            <Clock className="w-5 h-5 md:w-6 md:h-6" />
            Horário da Visita
          </label>
          <input
            type="time"
            {...register('horarioVisita')}
            className="w-full h-12 md:h-14 px-3 md:px-4 text-base md:text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          />
          {errors.horarioVisita && (
            <p className="text-red-500 text-xs md:text-sm mt-1 md:mt-2">{errors.horarioVisita.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
