import { UseFormRegister, FieldErrors, Controller, Control } from 'react-hook-form';
import { ChecklistFormData } from '@/schemas/checklistSchema';
import { Calendar, User, Home, Phone, MapPin, Clock } from 'lucide-react';
import InputMask from 'react-input-mask';

interface Step1Props {
  register: UseFormRegister<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  control: Control<ChecklistFormData>;
}

const rotulo = 'field-label flex items-center gap-2 text-[15px]';
const icone = 'h-[18px] w-[18px] text-primor-primary-ink';
const campo = 'field min-h-[52px] text-base md:text-lg';

export function Step1DadosBasicos({ register, errors, control }: Step1Props) {
  return (
    <div className="w-full space-y-6">
      <div>
        <p className="etiqueta">Etapa 01</p>
        <h2 className="titulo-secao mt-1">Dados básicos do atendimento</h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Nome do Cliente */}
        <div className="w-full">
          <label htmlFor="briefing-cliente" className={rotulo}>
            <User aria-hidden="true" strokeWidth={1.75} className={icone} />
            Nome do cliente
          </label>
          <input
            id="briefing-cliente"
            type="text"
            aria-invalid={!!errors.nomeCliente}
            aria-describedby={errors.nomeCliente ? 'briefing-cliente-erro' : undefined}
            {...register('nomeCliente')}
            className={campo}
            placeholder="Digite o nome do cliente"
          />
          {errors.nomeCliente && (
            <p id="briefing-cliente-erro" className="field-error">{errors.nomeCliente.message}</p>
          )}
        </div>

        {/* Telefone */}
        <div className="w-full">
          <label htmlFor="briefing-telefone" className={rotulo}>
            <Phone aria-hidden="true" strokeWidth={1.75} className={icone} />
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
                    id="briefing-telefone"
                    type="tel"
                    aria-invalid={!!errors.telefone}
                    aria-describedby={errors.telefone ? 'briefing-telefone-erro' : undefined}
                    className={`${campo} font-mono tabular`}
                    placeholder="(11) 98765-4321"
                  />
                )}
              </InputMask>
            )}
          />
          {errors.telefone && (
            <p id="briefing-telefone-erro" className="field-error">{errors.telefone.message}</p>
          )}
        </div>
      </div>

      {/* Endereço */}
      <div className="w-full">
        <label htmlFor="briefing-endereco" className={rotulo}>
          <MapPin aria-hidden="true" strokeWidth={1.75} className={icone} />
          Endereço
        </label>
        <input
          id="briefing-endereco"
          type="text"
          aria-invalid={!!errors.endereco}
          aria-describedby={errors.endereco ? 'briefing-endereco-erro' : undefined}
          {...register('endereco')}
          className={campo}
          placeholder="Rua, número, bairro, cidade"
        />
        {errors.endereco && (
          <p id="briefing-endereco-erro" className="field-error">{errors.endereco.message}</p>
        )}
      </div>

      {/* Ambientes e Móveis */}
      <div className="w-full">
        <label htmlFor="briefing-ambiente" className={rotulo}>
          <Home aria-hidden="true" strokeWidth={1.75} className={icone} />
          Ambientes e móveis
        </label>
        <input
          id="briefing-ambiente"
          type="text"
          aria-invalid={!!errors.tituloAmbiente}
          aria-describedby={errors.tituloAmbiente ? 'briefing-ambiente-erro' : undefined}
          {...register('tituloAmbiente')}
          className={campo}
          placeholder="Ex: Cozinha Planejada, Dormitório Casal"
        />
        {errors.tituloAmbiente && (
          <p id="briefing-ambiente-erro" className="field-error">{errors.tituloAmbiente.message}</p>
        )}
      </div>

      {/* Data e Horário - Grid Responsivo */}
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {/* Data do Atendimento */}
        <div className="w-full min-w-0">
          <label htmlFor="briefing-data" className={rotulo}>
            <Calendar aria-hidden="true" strokeWidth={1.75} className={icone} />
            Data do atendimento
          </label>
          <input
            id="briefing-data"
            type="date"
            aria-invalid={!!errors.dataAtendimento}
            aria-describedby={errors.dataAtendimento ? 'briefing-data-erro' : undefined}
            {...register('dataAtendimento')}
            className={`${campo} box-border font-mono tabular`}
          />
          {errors.dataAtendimento && (
            <p id="briefing-data-erro" className="field-error">{errors.dataAtendimento.message}</p>
          )}
        </div>

        {/* Horário da Visita */}
        <div className="w-full min-w-0">
          <label htmlFor="briefing-horario" className={rotulo}>
            <Clock aria-hidden="true" strokeWidth={1.75} className={icone} />
            Horário da visita
          </label>
          <input
            id="briefing-horario"
            type="time"
            aria-invalid={!!errors.horarioVisita}
            aria-describedby={errors.horarioVisita ? 'briefing-horario-erro' : undefined}
            {...register('horarioVisita')}
            className={`${campo} box-border font-mono tabular`}
          />
          {errors.horarioVisita && (
            <p id="briefing-horario-erro" className="field-error">{errors.horarioVisita.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
