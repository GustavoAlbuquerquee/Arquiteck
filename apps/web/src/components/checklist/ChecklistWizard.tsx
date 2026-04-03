import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checklistSchema, ChecklistFormData } from '@/schemas/checklistSchema';
import { Step1DadosBasicos } from './Step1DadosBasicos';
import { Step2Levantamento } from './Step2Levantamento';
import { Step3Finalizacao } from './Step3Finalizacao';
import { ChevronLeft, ChevronRight, Save, CheckCircle } from 'lucide-react';

export function ChecklistWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      nomeCliente: '',
      tituloAmbiente: '',
      dataAtendimento: '',
      dimensoes: {
        largura: '',
        altura: '',
        profundidade: '',
      },
      eletrodomesticos: [],
      pontosCriticos: '',
      preferenciaMateriais: {
        corPadraoMdf: '',
        tipoPuxador: '',
      },
      observacoes: '',
      assinatura: '',
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof ChecklistFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['nomeCliente', 'tituloAmbiente', 'dataAtendimento'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['dimensoes', 'preferenciaMateriais'];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = (data: ChecklistFormData) => {
    console.log('📋 Dados do Briefing/Primeira Visita:', {
      dadosBasicos: {
        nomeCliente: data.nomeCliente,
        tituloAmbiente: data.tituloAmbiente,
        dataAtendimento: data.dataAtendimento,
      },
      levantamentoTecnico: {
        dimensoes: data.dimensoes,
        eletrodomesticos: data.eletrodomesticos,
        pontosCriticos: data.pontosCriticos,
        preferenciaMateriais: data.preferenciaMateriais,
      },
      finalizacao: {
        observacoes: data.observacoes,
        assinaturaBase64: data.assinatura.substring(0, 50) + '...', // Mostra apenas início
      },
    });

    // Mostrar alerta de sucesso
    setShowSuccessAlert(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Esconder alerta após 5 segundos
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 5000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Alerta de Sucesso */}
      {showSuccessAlert && (
        <div className="mb-6 bg-green-100 border-2 border-green-500 rounded-lg p-6 flex items-start gap-4 animate-fade-in">
          <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Briefing Salvo com Sucesso!</h3>
            <p className="text-green-700">
              Os dados foram registrados. Verifique o console do navegador (F12) para ver os dados completos.
            </p>
          </div>
        </div>
      )}

      {/* Indicador de Progresso */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-2 mx-2 rounded transition ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-medium text-gray-600">
          <span>Dados Básicos</span>
          <span>Levantamento</span>
          <span>Finalização</span>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-lg p-8">
        {currentStep === 1 && <Step1DadosBasicos register={register} errors={errors} />}
        {currentStep === 2 && <Step2Levantamento register={register} watch={watch} errors={errors} />}
        {currentStep === 3 && <Step3Finalizacao register={register} setValue={setValue} errors={errors} />}

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t-2 border-gray-200">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-8 h-14 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition text-lg"
            >
              <ChevronLeft className="w-6 h-6" />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-lg ml-auto"
            >
              Avançar
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <button
              type="submit"
              className="flex items-center gap-2 px-8 h-14 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-lg ml-auto"
            >
              <Save className="w-6 h-6" />
              Salvar Briefing
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
