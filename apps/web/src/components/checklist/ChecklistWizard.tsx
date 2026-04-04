import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checklistSchema, ChecklistFormData } from '@/schemas/checklistSchema';
import { Step1DadosBasicos } from './Step1DadosBasicos';
import { Step2Levantamento } from './Step2Levantamento';
import { Step3Finalizacao } from './Step3Finalizacao';
import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertCircle, FileDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import html2pdf from 'html2pdf.js';

export function ChecklistWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedData, setSavedData] = useState<ChecklistFormData | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    trigger,
    reset,
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      nomeCliente: '',
      tituloAmbiente: '',
      dataAtendimento: '',
      moveis: [],
      eletrodomesticos: [],
      pontosCriticos: '',
      preferenciaMateriais: {
        corPadraoMdf: '',
        tipoPuxador: '',
      },
      composicaoProjeto: {
        teraCorredicas: false,
        teraGavetas: false,
        teraPortas: false,
        teraFitaLed: false,
      },
      fotosAmbiente: [],
      observacoes: '',
      assinatura: '',
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof ChecklistFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['nomeCliente', 'tituloAmbiente', 'dataAtendimento'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['moveis', 'preferenciaMateriais'];
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

  const onSubmit = async (data: ChecklistFormData) => {
    setLoading(true);
    setError('');

    try {
      // Obter tenant_id do usuário logado
      const tenant_id = user?.user_metadata?.tenant_id;

      if (!tenant_id) {
        throw new Error('Tenant ID não encontrado. Faça logout e login novamente.');
      }

      // 1. Criar cliente
      const { data: cliente, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant_id,
          nome: data.nomeCliente,
        })
        .select()
        .single();

      if (clientError) throw clientError;
      if (!cliente) throw new Error('Erro ao criar cliente');

      // 2. Criar projeto
      const { data: projeto, error: projectError } = await supabase
        .from('projects')
        .insert({
          tenant_id: tenant_id,
          client_id: cliente.id,
          titulo_ambiente: data.tituloAmbiente,
          data_prevista_instalacao: data.dataAtendimento,
          status: 'orcamento',
        })
        .select()
        .single();

      if (projectError) throw projectError;
      if (!projeto) throw new Error('Erro ao criar projeto');

      // 3. Criar checklist com payload
      const payload = {
        moveis: data.moveis,
        eletrodomesticos: data.eletrodomesticos,
        pontosCriticos: data.pontosCriticos,
        preferenciaMateriais: data.preferenciaMateriais,
        composicaoProjeto: data.composicaoProjeto,
        fotosAmbiente: data.fotosAmbiente,
        observacoes: data.observacoes,
        assinatura_url: data.assinatura,
      };

      const { error: checklistError } = await supabase
        .from('checklists')
        .insert({
          tenant_id: tenant_id,
          project_id: projeto.id,
          tipo_etapa: 'pre_producao',
          payload: payload,
        });

      if (checklistError) throw checklistError;

      // Sucesso!
      console.log('🎉 Briefing salvo com sucesso!', {
        cliente,
        projeto,
        payload,
      });

      setSavedData(data);
      setShowSuccessAlert(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Erro ao salvar briefing:', err);
      setError(err.message || 'Erro ao salvar briefing. Tente novamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !savedData) return;

    try {
      // Aguardar renderização completa das imagens
      await new Promise(resolve => setTimeout(resolve, 500));

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `briefing-${savedData.nomeCliente.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handleNovoFormulario = () => {
    reset();
    setSavedData(null);
    setShowSuccessAlert(false);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Alerta de Erro */}
      {error && (
        <div className="mb-6 bg-red-100 border-2 border-red-500 rounded-lg p-6 flex items-start gap-4 animate-fade-in">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Erro ao Salvar</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Alerta de Sucesso com Botão de PDF */}
      {showSuccessAlert && savedData && (
        <div className="mb-6 bg-green-100 border-2 border-green-500 rounded-lg p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Briefing Salvo com Sucesso!</h3>
              <p className="text-green-700">
                Os dados foram registrados no sistema.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-6 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              <FileDown className="w-5 h-5" />
              Baixar Resumo em PDF
            </button>
            <button
              onClick={handleNovoFormulario}
              className="flex items-center gap-2 px-6 h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
            >
              Novo Formulário
            </button>
          </div>
        </div>
      )}

      {/* Indicador de Progresso */}
      {!showSuccessAlert && (
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
      )}

      {/* Formulário */}
      {!showSuccessAlert && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-lg p-8">
          {currentStep === 1 && <Step1DadosBasicos register={register} errors={errors} />}
          {currentStep === 2 && <Step2Levantamento register={register} watch={watch} errors={errors} control={control} />}
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
                disabled={loading}
                className="flex items-center gap-2 px-8 h-14 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition text-lg ml-auto"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Salvar Briefing
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Template PDF (Escondido) */}
      {savedData && (
        <div ref={pdfRef} className="fixed -left-[9999px] top-0 w-[210mm] bg-white p-8">
          <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="text-center border-b-2 border-gray-300 pb-4" style={{ pageBreakInside: 'avoid' }}>
              <h1 className="text-3xl font-bold text-gray-900">Arquiteck</h1>
              <p className="text-lg text-gray-600">Briefing de Primeira Visita</p>
            </div>

            {/* Dados Básicos */}
            <div style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Dados Básicos</h2>
              <div className="space-y-2">
                <p><strong>Cliente:</strong> {savedData.nomeCliente}</p>
                <p><strong>Ambiente:</strong> {savedData.tituloAmbiente}</p>
                <p><strong>Data do Atendimento:</strong> {new Date(savedData.dataAtendimento).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Móveis */}
            <div style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Móveis e Medidas</h2>
              {savedData.moveis.map((movel, index) => (
                <div key={index} className="mb-3 p-3 border border-gray-300 rounded" style={{ pageBreakInside: 'avoid' }}>
                  <p><strong>{movel.nome}</strong></p>
                  <p>Largura: {movel.largura}cm | Altura: {movel.altura}cm | Profundidade: {movel.profundidade}cm</p>
                </div>
              ))}
            </div>

            {/* Eletrodomésticos */}
            {savedData.eletrodomesticos.length > 0 && (
              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Eletrodomésticos</h2>
                {savedData.eletrodomesticos.map((eletro, index) => (
                  <p key={index}>• {eletro.nome} {eletro.modelo && `- ${eletro.modelo}`}</p>
                ))}
              </div>
            )}

            {/* Materiais */}
            <div style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Materiais</h2>
              <p><strong>MDF:</strong> {savedData.preferenciaMateriais.corPadraoMdf}</p>
              <p><strong>Puxador:</strong> {savedData.preferenciaMateriais.tipoPuxador}</p>
            </div>

            {/* Composição */}
            <div style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Composição do Projeto</h2>
              <p>Corrediças: {savedData.composicaoProjeto.teraCorredicas ? 'Sim' : 'Não'}</p>
              <p>Gavetas: {savedData.composicaoProjeto.teraGavetas ? 'Sim' : 'Não'}</p>
              <p>Portas: {savedData.composicaoProjeto.teraPortas ? 'Sim' : 'Não'}</p>
              <p>Fita LED: {savedData.composicaoProjeto.teraFitaLed ? 'Sim' : 'Não'}</p>
            </div>

            {/* Fotos do Ambiente */}
            {savedData.fotosAmbiente && savedData.fotosAmbiente.length > 0 && (
              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Fotos do Ambiente</h2>
                <div className="grid grid-cols-2 gap-4">
                  {savedData.fotosAmbiente.map((foto, index) => (
                    <div key={index} className="border border-gray-300 rounded p-2" style={{ pageBreakInside: 'avoid' }}>
                      <img 
                        src={foto} 
                        alt={`Foto ${index + 1}`} 
                        className="w-full h-auto"
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {savedData.observacoes && (
              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Observações</h2>
                <p className="whitespace-pre-wrap">{savedData.observacoes}</p>
              </div>
            )}

            {/* Assinatura */}
            <div style={{ pageBreakInside: 'avoid', pageBreakBefore: 'auto' }}>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Assinatura do Cliente</h2>
              <div className="border-2 border-gray-300 rounded p-4 bg-white inline-block">
                <img 
                  src={savedData.assinatura} 
                  alt="Assinatura" 
                  className="w-auto h-auto"
                  style={{ maxWidth: '400px', maxHeight: '150px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
