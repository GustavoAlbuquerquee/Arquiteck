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
      telefone: '',
      endereco: '',
      tituloAmbiente: '',
      dataAtendimento: '',
      horarioVisita: '',
      moveis: [],
      eletrodomesticos: [],
      especificacoesAmbiente: {
        rodape: '',
        tipoParede: '',
        tubulacoesParede: false,
        temEstacionamento: false,
        temElevador: false,
        alturaElevador: '',
        profundidadeElevador: '',
      },
      pontosCriticos: '',
      fotosAmbiente: [],
      observacoes: '',
      assinatura: '',
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof ChecklistFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['nomeCliente', 'telefone', 'endereco', 'tituloAmbiente', 'dataAtendimento', 'horarioVisita'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['moveis'];
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
      const tenant_id = user?.user_metadata?.tenant_id;

      if (!tenant_id) {
        throw new Error('Tenant ID não encontrado. Faça logout e login novamente.');
      }

      // 1. Criar cliente com telefone e endereço
      const { data: cliente, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant_id,
          nome: data.nomeCliente,
          telefone: data.telefone,
          endereco: data.endereco,
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

      // 3. Criar checklist com payload atualizado
      const payload = {
        horarioVisita: data.horarioVisita,
        moveis: data.moveis,
        eletrodomesticos: data.eletrodomesticos,
        especificacoesAmbiente: data.especificacoesAmbiente,
        pontosCriticos: data.pontosCriticos,
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

      console.log('🎉 Briefing salvo com sucesso!', { cliente, projeto, payload });

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
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      {error && (
        <div className="mb-6 bg-red-100 border-2 border-red-500 rounded-lg p-6 flex items-start gap-4 animate-fade-in">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-red-800 mb-2">Erro ao Salvar</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {showSuccessAlert && savedData && (
        <div className="mb-6 bg-green-100 border-2 border-green-500 rounded-lg p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Briefing Salvo com Sucesso!</h3>
              <p className="text-green-700">Os dados foram registrados no sistema.</p>
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

      {!showSuccessAlert && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition ${
                    currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
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

      {!showSuccessAlert && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-lg p-8">
          {currentStep === 1 && <Step1DadosBasicos register={register} errors={errors} />}
          {currentStep === 2 && <Step2Levantamento register={register} watch={watch} errors={errors} control={control} setValue={setValue} />}
          {currentStep === 3 && <Step3Finalizacao register={register} setValue={setValue} errors={errors} />}

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

      {/* Template PDF Atualizado */}
      {savedData && (
        <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -10 }}>
          <div ref={pdfRef} className="w-[210mm] bg-white p-8">
            <div className="space-y-6">
              <div className="text-center border-b-2 border-gray-300 pb-4" style={{ pageBreakInside: 'avoid' }}>
                <h1 className="text-3xl font-bold text-gray-900">Arquiteck</h1>
                <p className="text-lg text-gray-600">Briefing de Primeira Visita</p>
              </div>

              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Dados Básicos</h2>
                <p><strong>Cliente:</strong> {savedData.nomeCliente}</p>
                <p><strong>Telefone:</strong> {savedData.telefone}</p>
                <p><strong>Endereço:</strong> {savedData.endereco}</p>
                <p><strong>Ambiente:</strong> {savedData.tituloAmbiente}</p>
                <p><strong>Data:</strong> {new Date(savedData.dataAtendimento).toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> {savedData.horarioVisita}</p>
              </div>

              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Móveis</h2>
                {savedData.moveis.map((movel, idx) => (
                  <div key={idx} className="mb-4 p-3 border border-gray-300 rounded" style={{ pageBreakInside: 'avoid' }}>
                    <p className="font-bold">{movel.nome}</p>
                    <p>Medidas: {movel.largura}mm × {movel.altura}mm × {movel.profundidade}mm</p>
                    <p>MDF Interno: {movel.corMdfInterna} | MDF Externo: {movel.corMdfExterna}</p>
                    {movel.temPuxador && <p>Puxador: {movel.tipoPuxador} - {movel.corPuxador}</p>}
                    {movel.temCorredicas && <p>Corrediça: {movel.tipoCorredica}</p>}
                    {movel.temBascula && <p>Báscula: {movel.tipoBascula}</p>}
                    {movel.temPortaVidro && <p>Porta Vidro: {movel.tipoPortaVidro}</p>}
                    {movel.temFitaLed && <p>Fita LED: {movel.tipoFitaLed}</p>}
                    {movel.observacoesMovel && <p className="text-sm mt-2">Obs: {movel.observacoesMovel}</p>}
                  </div>
                ))}
              </div>

              {savedData.especificacoesAmbiente && (
                <div style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Especificações do Ambiente</h2>
                  {savedData.especificacoesAmbiente.rodape && <p>Rodapé: {savedData.especificacoesAmbiente.rodape}</p>}
                  {savedData.especificacoesAmbiente.tipoParede && <p>Tipo de Parede: {savedData.especificacoesAmbiente.tipoParede}</p>}
                  <p>Tubulações: {savedData.especificacoesAmbiente.tubulacoesParede ? 'Sim' : 'Não'}</p>
                  <p>Estacionamento: {savedData.especificacoesAmbiente.temEstacionamento ? 'Sim' : 'Não'}</p>
                  {savedData.especificacoesAmbiente.temElevador && (
                    <p>Elevador: {savedData.especificacoesAmbiente.alturaElevador}mm × {savedData.especificacoesAmbiente.profundidadeElevador}mm</p>
                  )}
                </div>
              )}

              {savedData.eletrodomesticos.length > 0 && (
                <div style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Eletrodomésticos</h2>
                  {savedData.eletrodomesticos.map((e, idx) => (
                    <p key={idx}>• {e.nome} {e.modelo && `- ${e.modelo}`}</p>
                  ))}
                </div>
              )}

              {savedData.fotosAmbiente && savedData.fotosAmbiente.length > 0 && (
                <div style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Fotos</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {savedData.fotosAmbiente.map((foto, idx) => (
                      <img key={idx} src={foto} alt={`Foto ${idx + 1}`} style={{ maxHeight: '200px', objectFit: 'contain' }} />
                    ))}
                  </div>
                </div>
              )}

              {savedData.observacoes && (
                <div style={{ pageBreakInside: 'avoid' }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">Observações</h2>
                  <p className="whitespace-pre-wrap">{savedData.observacoes}</p>
                </div>
              )}

              <div style={{ pageBreakInside: 'avoid' }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Assinatura</h2>
                <img src={savedData.assinatura} alt="Assinatura" style={{ maxWidth: '400px', maxHeight: '150px', objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
