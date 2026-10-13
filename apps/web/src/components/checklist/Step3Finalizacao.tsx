import { useEffect, useRef } from 'react';
import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import SignatureCanvas from 'react-signature-canvas';
import { ChecklistFormData } from '@/schemas/checklistSchema';
import { FileText, Eraser, PenTool } from 'lucide-react';
import { useUrlsAssinadas } from '@/lib/useUrlsAssinadas';

interface Step3Props {
  register: UseFormRegister<ChecklistFormData>;
  setValue: UseFormSetValue<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  /** Valor atual do campo (data URL de uma assinatura feita agora, ou URL já salva) */
  assinaturaAtual: string;
  /** Assinatura já salva no banco (modo edição); "Limpar" volta para ela */
  assinaturaOriginal: string;
}

export function Step3Finalizacao({ register, setValue, errors, assinaturaAtual, assinaturaOriginal }: Step3Props) {
  const signatureRef = useRef<SignatureCanvas>(null);
  // Assinatura já salva no banco (modo edição): mostrada à parte, porque
  // desenhar uma imagem de outro domínio no canvas impede exportá-lo depois
  const assinaturaSalva = assinaturaAtual && !assinaturaAtual.startsWith('data:') ? assinaturaAtual : '';
  const urlDaAssinatura = useUrlsAssinadas([assinaturaSalva]);

  // O passo desmonta ao voltar para o passo 2; ao remontar, redesenha a
  // assinatura que continua no formulário
  useEffect(() => {
    if (assinaturaAtual.startsWith('data:')) {
      signatureRef.current?.fromDataURL(assinaturaAtual);
    }
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setValue('assinatura', assinaturaOriginal);
  };

  const handleEndSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setValue('assinatura', signatureData);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="etiqueta">Etapa 03</p>
        <h2 className="titulo-secao mt-1">Finalização e assinatura</h2>
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="briefing-observacoes" className="field-label flex items-center gap-2 text-[15px]">
          <FileText aria-hidden="true" strokeWidth={1.75} className="h-[18px] w-[18px] text-primor-primary-ink" />
          Observações e ressalvas
        </label>
        <textarea
          id="briefing-observacoes"
          aria-describedby="briefing-observacoes-dica"
          {...register('observacoes')}
          rows={6}
          className="field resize-none text-base md:text-lg"
          placeholder="Digite aqui observações importantes, pendências ou ressalvas sobre a vistoria..."
        />
        <p id="briefing-observacoes-dica" className="field-hint">Campo opcional</p>
      </div>

      {/* Termo de Aceite: lido antes de assinar */}
      <div className="alerta alerta-info">
        <p className="leading-relaxed">
          <strong>Termo de aceite:</strong> Ao assinar este documento, declaro que todas as informações
          prestadas são verdadeiras e que o serviço foi executado conforme especificado. Estou ciente
          das condições acordadas e autorizo o prosseguimento do projeto.
        </p>
      </div>

      {/* Assinatura */}
      <div>
        <p id="rotulo-assinatura" className="field-label flex items-center gap-2 text-[15px]">
          <PenTool aria-hidden="true" strokeWidth={1.75} className="h-[18px] w-[18px] text-primor-primary-ink" />
          Termo de aceite - assinatura digital
        </p>

        {assinaturaSalva && (
          <div className="mb-4 rounded-md border border-primor-line bg-primor-bg-light p-3">
            <p className="mb-2 text-sm text-primor-muted">Assinatura atual. Assine abaixo apenas se quiser substituí-la.</p>
            <img
              src={urlDaAssinatura(assinaturaSalva)}
              alt="Assinatura atual"
              className="max-h-32 rounded-md border border-primor-line bg-white"
            />
          </div>
        )}

        <div className="relative rounded-lg border border-primor-line bg-white p-2 shadow-chapa">
          <SignatureCanvas
            ref={signatureRef}
            clearOnResize={false}
            canvasProps={{
              className: 'w-full h-64 touch-none',
              style: { border: '1.5px dashed #9a8072', borderRadius: '6px' },
              role: 'img',
              'aria-labelledby': 'rotulo-assinatura',
            }}
            backgroundColor="white"
            onEnd={handleEndSignature}
          />
          {/* Linha de assinatura impressa: decorativa, não entra na imagem salva */}
          <div aria-hidden="true" className="pointer-events-none absolute bottom-12 left-8 right-8 flex items-end gap-2">
            <span className="font-display text-xl leading-none text-primor-line-strong">×</span>
            <span className="mb-1 h-px flex-1 bg-primor-line-strong/70" />
          </div>
        </div>

        <div className="mt-3 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-primor-muted">Assine com o dedo ou caneta stylus</p>
          <button
            type="button"
            onClick={handleClearSignature}
            className="btn btn-outline"
          >
            <Eraser aria-hidden="true" className="h-5 w-5" />
            Limpar assinatura
          </button>
        </div>

        {errors.assinatura && (
          <p role="alert" className="field-error">{errors.assinatura.message}</p>
        )}
      </div>
    </div>
  );
}
