import { useRef } from 'react';
import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import SignatureCanvas from 'react-signature-canvas';
import { ChecklistFormData } from '@/schemas/checklistSchema';
import { FileText, Eraser, PenTool } from 'lucide-react';

interface Step3Props {
  register: UseFormRegister<ChecklistFormData>;
  setValue: UseFormSetValue<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
}

export function Step3Finalizacao({ register, setValue, errors }: Step3Props) {
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setValue('assinatura', '');
  };

  const handleEndSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setValue('assinatura', signatureData);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Finalização e Assinatura</h2>

      {/* Observações */}
      <div>
        <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-3">
          <FileText className="w-6 h-6" />
          Observações e Ressalvas
        </label>
        <textarea
          {...register('observacoes')}
          rows={6}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition resize-none"
          placeholder="Digite aqui observações importantes, pendências ou ressalvas sobre a vistoria..."
        />
        <p className="text-sm text-gray-500 mt-2">Campo opcional</p>
      </div>

      {/* Assinatura */}
      <div>
        <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-3">
          <PenTool className="w-6 h-6" />
          Termo de Aceite - Assinatura Digital
        </label>
        
        <div className="border-4 border-gray-300 rounded-lg bg-white p-2">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              className: 'w-full h-64 touch-none',
              style: { border: '2px dashed #cbd5e1', borderRadius: '8px' }
            }}
            backgroundColor="white"
            onEnd={handleEndSignature}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-600">Assine com o dedo ou caneta stylus</p>
          <button
            type="button"
            onClick={handleClearSignature}
            className="flex items-center gap-2 px-6 h-12 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            <Eraser className="w-5 h-5" />
            Limpar Assinatura
          </button>
        </div>

        {errors.assinatura && (
          <p className="text-red-500 text-sm mt-2">{errors.assinatura.message}</p>
        )}
      </div>

      {/* Termo de Aceite */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          <strong>Termo de Aceite:</strong> Ao assinar este documento, declaro que todas as informações 
          prestadas são verdadeiras e que o serviço foi executado conforme especificado. Estou ciente 
          das condições acordadas e autorizo o prosseguimento do projeto.
        </p>
      </div>
    </div>
  );
}
