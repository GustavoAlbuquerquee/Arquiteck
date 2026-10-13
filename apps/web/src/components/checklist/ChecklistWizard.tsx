import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checklistSchema, ChecklistFormData } from "@/schemas/checklistSchema";
import { Step1DadosBasicos } from "./Step1DadosBasicos";
import { Step2Levantamento } from "./Step2Levantamento";
import { Step3Finalizacao } from "./Step3Finalizacao";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  AlertCircle,
  FileDown,
  Loader2,
} from "lucide-react";
import { supabase, getCurrentTenantId } from "@/lib/supabase";
import html2pdf from "html2pdf.js";
import { uploadBase64Image, storagePathFromPublicUrl } from "@/lib/supabase/storage";
import { useSearchParams } from "react-router-dom";
import { formatarData } from "@/lib/date";

const BUCKET_VISTORIAS = "vistorias";

const valoresIniciais: ChecklistFormData = {
  nomeCliente: "",
  telefone: "",
  endereco: "",
  tituloAmbiente: "",
  dataAtendimento: "",
  horarioVisita: "",
  moveis: [],
  eletrodomesticos: [],
  especificacoesAmbiente: {
    rodape: "",
    tipoParede: "",
    tubulacoesParede: false,
    temEstacionamento: false,
    temElevador: false,
    alturaElevador: "",
    profundidadeElevador: "",
  },
  pontosCriticos: "",
  fotosAmbiente: [],
  observacoes: "",
  assinatura: "",
};

export function ChecklistWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("edit");
  const isEditMode = !!projectId;

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [savedData, setSavedData] = useState<ChecklistFormData | null>(null);
  // Arquivos do briefing como estavam no banco ao abrir a edição; os que o
  // usuário remover são apagados do Storage depois de salvar
  const [arquivosOriginais, setArquivosOriginais] = useState<string[]>([]);
  const [assinaturaOriginal, setAssinaturaOriginal] = useState("");
  const pdfRef = useRef<HTMLDivElement>(null);
  // Trava síncrona contra duplo toque no "Salvar": o state `loading` só
  // muda depois da validação assíncrona, tarde demais para o segundo clique
  const salvandoRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    trigger,
    reset,
    getValues,
  } = useForm<ChecklistFormData>({
    resolver: zodResolver(checklistSchema),
    defaultValues: valoresIniciais,
  });

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await trigger([
        "nomeCliente",
        "telefone",
        "endereco",
        "tituloAmbiente",
        "dataAtendimento",
        "horarioVisita",
      ]);


      if (!isValid) {
        setError("Preencha todos os campos obrigatórios do Step 1");
        return;
      }

      setError("");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      // Validar Step 2 com o Zod via React Hook Form
      const isStep2Valid = await trigger([
        "moveis",
        "especificacoesAmbiente",
        "eletrodomesticos",
        "pontosCriticos",
        "fotosAmbiente",
      ]);


      if (!isStep2Valid) {
        setError(
          "Preencha todos os campos obrigatórios destacados em vermelho.",
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Validar manualmente os móveis
      const moveis = watch("moveis");


      if (!moveis || moveis.length === 0) {
        setError("Adicione pelo menos um móvel");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Verificar se algum móvel tem profundidade vazia
      const moveisComErro: number[] = [];
      moveis.forEach((m, i) => {
        if (!m.profundidade || m.profundidade.toString().trim() === '') {
          moveisComErro.push(i + 1);
        }
      });
      
      if (moveisComErro.length > 0) {
        const moveisList = moveisComErro.join(', ');
        setError(
          moveisComErro.length === 1
            ? `Móvel ${moveisList}: Preencha o campo PROFUNDIDADE (está vazio)`
            : `Móveis ${moveisList}: Preencha o campo PROFUNDIDADE em todos os móveis`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Validar campos condicionais dos móveis
      let hasError = false;
      for (let i = 0; i < moveis.length; i++) {
        const movel = moveis[i];


        if (
          movel.temPuxador &&
          (!movel.tipoPuxador || !movel.detalhesPuxador)
        ) {
          setError(`Móvel ${i + 1}: Preencha o tipo e detalhes do puxador`);
          hasError = true;
          break;
        }

        if (
          movel.temCorredicas &&
          (!movel.tipoCorredica || !movel.finalidadeCorredica)
        ) {
          setError(`Móvel ${i + 1}: Preencha o tipo e finalidade da corrediça`);
          hasError = true;
          break;
        }

        if (movel.temBascula && !movel.tipoBascula) {
          setError(`Móvel ${i + 1}: Selecione o tipo de báscula`);
          hasError = true;
          break;
        }

        if (movel.temPortaVidro && !movel.tipoPortaVidro) {
          setError(`Móvel ${i + 1}: Selecione o tipo de porta de vidro`);
          hasError = true;
          break;
        }

        if (movel.temFitaLed && !movel.tipoFitaLed) {
          setError(`Móvel ${i + 1}: Selecione o tipo de fita LED`);
          hasError = true;
          break;
        }
      }

      if (hasError) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Validar especificações do ambiente
      const specs = watch("especificacoesAmbiente");
      if (
        specs?.temElevador &&
        (!specs.alturaElevador || !specs.profundidadeElevador)
      ) {
        setError("Preencha as dimensões do elevador");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (specs?.tubulacoesParede && !specs.localTubulacao) {
        setError("Indique o local das tubulações");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Se passou em todas as validações, avançar
      setError("");
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const limparFormulario = () => {
    // reset() sem argumento voltaria aos dados do último reset(formData) da
    // edição; por isso os valores iniciais são passados explicitamente
    reset(valoresIniciais);
    setArquivosOriginais([]);
    setAssinaturaOriginal("");
    setSavedData(null);
    setShowSuccessAlert(false);
    setError("");
    setCurrentStep(1);
  };

  // Buscar dados do projeto para edição. Ao sair do modo edição sem remontar
  // a tela (ex.: menu "Briefing/Visita" a partir de ?edit=X), limpa o form
  // para o próximo salvamento não ir para o projeto anterior.
  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
    } else {
      limparFormulario();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadProjectData = async (id: string) => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          clients (*),
          checklists (*)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Projeto não encontrado");

      // Mapear dados para o formato do formulário. O briefing é o checklist
      // de pré-produção; o projeto pode ter também os de saída e instalação.
      const checklist =
        data.checklists.find((c) => c.tipo_etapa === "pre_producao") ??
        data.checklists[0];
      const payload = (checklist?.payload as any) || {};

      // Mapear móveis com compatibilidade de campos antigos
      const moveisFormatados = (payload.moveis || []).map((movel: any) => ({
        nome: movel.nome || "",
        largura: movel.largura || "",
        altura: movel.altura || "",
        profundidade: movel.profundidade || "",
        corMdfInterna: movel.corMdfInterna || "",
        corMdfExterna: movel.corMdfExterna || "",
        observacoesMovel: movel.observacoesMovel || "",
        temPuxador: movel.temPuxador || false,
        tipoPuxador: movel.tipoPuxador || "",
        detalhesPuxador: movel.detalhesPuxador || movel.corPuxador || "", // Compatibilidade com campo antigo
        temCorredicas: movel.temCorredicas || false,
        tipoCorredica: movel.tipoCorredica || "",
        finalidadeCorredica: movel.finalidadeCorredica || "", // Novo campo
        temBascula: movel.temBascula || false,
        tipoBascula: movel.tipoBascula || undefined,
        temPortaVidro: movel.temPortaVidro || false,
        tipoPortaVidro: movel.tipoPortaVidro || "",
        temFitaLed: movel.temFitaLed || false,
        tipoFitaLed: movel.tipoFitaLed || "",
      }));

      // Mapear especificações do ambiente com compatibilidade
      const especificacoesFormatadas = {
        rodape: payload.especificacoesAmbiente?.rodape || "",
        alturaRodape: payload.especificacoesAmbiente?.alturaRodape || "",
        profundidadeRodape:
          payload.especificacoesAmbiente?.profundidadeRodape || "",
        tipoParede: payload.especificacoesAmbiente?.tipoParede || "",
        tubulacoesParede:
          payload.especificacoesAmbiente?.tubulacoesParede || false,
        localTubulacao: payload.especificacoesAmbiente?.localTubulacao || "",
        temEstacionamento:
          payload.especificacoesAmbiente?.temEstacionamento || false,
        temElevador: payload.especificacoesAmbiente?.temElevador || false,
        alturaElevador: payload.especificacoesAmbiente?.alturaElevador || "",
        profundidadeElevador:
          payload.especificacoesAmbiente?.profundidadeElevador || "",
      };

      const formData: ChecklistFormData = {
        nomeCliente: data.clients.nome,
        telefone: data.clients.telefone || "",
        endereco: data.clients.endereco || "",
        tituloAmbiente: data.titulo_ambiente || "",
        dataAtendimento: data.data_prevista_instalacao || "",
        horarioVisita: payload.horarioVisita || "",
        moveis: moveisFormatados,
        eletrodomesticos: payload.eletrodomesticos || [],
        especificacoesAmbiente: especificacoesFormatadas,
        pontosCriticos: payload.pontosCriticos || "",
        fotosAmbiente: payload.fotosAmbiente || [],
        observacoes: payload.observacoes || "",
        assinatura: payload.assinatura_url || "",
      };

      setArquivosOriginais(
        [...(formData.fotosAmbiente ?? []), formData.assinatura].filter(Boolean),
      );
      setAssinaturaOriginal(formData.assinatura);
      reset(formData);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Erro ao carregar dados do briefing");
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: ChecklistFormData) => {
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    setLoading(true);
    setError("");

    // Arquivos enviados nesta tentativa. Se algo falhar, são apagados para
    // não ficarem órfãos no Storage.
    const enviados: string[] = [];
    const enviar = async (base64: string, path: string) => {
      const url = await uploadBase64Image(base64, path, BUCKET_VISTORIAS);
      if (!url) {
        throw new Error(
          "Não foi possível enviar as fotos ou a assinatura. Verifique a conexão e tente de novo. Nada foi salvo.",
        );
      }
      enviados.push(path);
      return url;
    };

    try {
      const tenant_id = await getCurrentTenantId();

      if (!tenant_id) {
        throw new Error(
          "Perfil sem empresa vinculada. Fale com o administrador da conta.",
        );
      }

      // 1. Assinatura (nova vem em base64; na edição pode ser a URL já salva)
      setLoadingMessage("A enviar assinatura...");
      const assinaturaUrl = data.assinatura.startsWith("data:")
        ? await enviar(
            data.assinatura,
            `${tenant_id}/assinaturas/assinatura-${crypto.randomUUID()}.png`,
          )
        : data.assinatura;

      // 2. Fotos novas (base64). As que já são URL ficam como estão.
      setLoadingMessage("A enviar fotos...");
      const resultados = await Promise.allSettled(
        (data.fotosAmbiente ?? []).map((foto) =>
          foto.startsWith("data:")
            ? enviar(foto, `${tenant_id}/fotos/foto-${crypto.randomUUID()}.jpg`)
            : Promise.resolve(foto),
        ),
      );
      const falha = resultados.find((r) => r.status === "rejected");
      if (falha) throw (falha as PromiseRejectedResult).reason;
      const fotosUrls = resultados.map(
        (r) => (r as PromiseFulfilledResult<string>).value,
      );

      // 3. Cliente, projeto e checklist numa transação só (ver
      // supabase/migrations/20261014120000_salvar_briefing.sql)
      setLoadingMessage(
        isEditMode ? "A atualizar briefing..." : "A guardar briefing...",
      );
      const { error: rpcError } = await supabase.rpc("salvar_briefing", {
        p_project_id: isEditMode && projectId ? projectId : null,
        p_cliente: {
          nome: data.nomeCliente,
          telefone: data.telefone,
          endereco: data.endereco,
        },
        p_projeto: {
          titulo_ambiente: data.tituloAmbiente,
          data_prevista_instalacao: data.dataAtendimento,
        },
        p_payload: {
          horarioVisita: data.horarioVisita,
          moveis: data.moveis,
          eletrodomesticos: data.eletrodomesticos,
          especificacoesAmbiente: data.especificacoesAmbiente,
          pontosCriticos: data.pontosCriticos,
          fotosAmbiente: fotosUrls,
          observacoes: data.observacoes,
          assinatura_url: assinaturaUrl,
        },
      });

      if (rpcError) throw rpcError;

      // 4. Na edição, apaga do Storage as fotos/assinatura que saíram do
      // briefing. Falhar aqui não desfaz o que já foi salvo.
      const removidos = arquivosOriginais
        .filter((url) => url !== assinaturaUrl && !fotosUrls.includes(url))
        .map((url) => storagePathFromPublicUrl(url, BUCKET_VISTORIAS))
        .filter((path): path is string => !!path);
      if (removidos.length > 0) {
        await supabase.storage.from(BUCKET_VISTORIAS).remove(removidos);
      }

      setSavedData({
        ...data,
        fotosAmbiente: fotosUrls,
        assinatura: assinaturaUrl,
      });
      setShowSuccessAlert(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Erro ao salvar briefing:", err);
      if (enviados.length > 0) {
        await supabase.storage.from(BUCKET_VISTORIAS).remove(enviados);
      }
      setError(err.message || "Erro ao salvar briefing. Tente novamente.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      salvandoRef.current = false;
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || !savedData) return;

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const opt: any = {
        margin: [10, 10, 10, 10],
        filename: `briefing-${savedData.nomeCliente.replace(/\s+/g, "-")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleNovoFormulario = () => {
    // Sai do modo edição: sem isso, o próximo "Salvar" sobrescrevia o
    // projeto que acabou de ser editado. Sem ?edit, o efeito acima limpa o
    // form; se já não havia ?edit, limpa aqui.
    if (projectId) {
      setSearchParams({});
    } else {
      limparFormulario();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-4xl mx-auto px-2 md:px-4">
      {/* Loading State - Carregando Dados */}
      {loadingData && (
        <div className="mb-6 bg-blue-100 border-2 border-blue-500 rounded-lg p-6 flex items-start gap-4 animate-fade-in">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-blue-800 mb-2">
              Carregando dados do briefing...
            </h3>
            <p className="text-blue-700">
              Aguarde enquanto buscamos as informações.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-100 border-2 border-red-500 rounded-lg p-4 md:p-6 flex items-start gap-3 md:gap-4 animate-fade-in">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg md:text-xl font-bold text-red-800 mb-2">
              Erro ao Prosseguir
            </h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {showSuccessAlert && savedData && (
        <div className="mb-6 bg-green-100 border-2 border-green-500 rounded-lg p-4 md:p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg md:text-xl font-bold text-green-800 mb-2">
                {isEditMode
                  ? "Briefing Atualizado com Sucesso!"
                  : "Briefing Salvo com Sucesso!"}
              </h3>
              <p className="text-green-700">
                Os dados foram {isEditMode ? "atualizados" : "registrados"} no
                sistema.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 px-4 md:px-6 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition w-full sm:w-auto"
            >
              <FileDown className="w-5 h-5" />
              Baixar Resumo em PDF
            </button>
            <button
              onClick={handleNovoFormulario}
              className="flex items-center justify-center gap-2 px-4 md:px-6 h-12 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition w-full sm:w-auto"
            >
              Novo Formulário
            </button>
          </div>
        </div>
      )}

      {!showSuccessAlert && (
        <div className="mb-6 md:mb-8">
          <div className="relative overflow-x-auto pb-2">
            <div
              className="absolute top-6 left-0 right-0 h-1 bg-primor-gray-medium"
              style={{ left: "15%", right: "15%" }}
            />
            <div
              className="absolute top-6 h-1 bg-primor-primary transition-all duration-300"
              style={{
                left: "15%",
                width:
                  currentStep === 1 ? "0%" : currentStep === 2 ? "35%" : "70%",
              }}
            />
            <div className="relative flex justify-between items-start min-w-[300px]">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition z-10 ${
                    currentStep >= 1
                      ? "bg-primor-primary text-primor-text-dark"
                      : "bg-primor-gray-medium text-primor-gray-dark"
                  }`}
                >
                  1
                </div>
                <span className="mt-2 md:mt-3 text-xs md:text-sm font-medium text-primor-gray-dark text-center">
                  Dados Básicos
                </span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition z-10 ${
                    currentStep >= 2
                      ? "bg-primor-primary text-primor-text-dark"
                      : "bg-primor-gray-medium text-primor-gray-dark"
                  }`}
                >
                  2
                </div>
                <span className="mt-2 md:mt-3 text-xs md:text-sm font-medium text-primor-gray-dark text-center">
                  Levantamento
                </span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition z-10 ${
                    currentStep >= 3
                      ? "bg-primor-primary text-primor-text-dark"
                      : "bg-primor-gray-medium text-primor-gray-dark"
                  }`}
                >
                  3
                </div>
                <span className="mt-2 md:mt-3 text-xs md:text-sm font-medium text-primor-gray-dark text-center">
                  Finalização
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showSuccessAlert && !loadingData && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl shadow-lg p-4 md:p-6 lg:p-8"
        >
          {currentStep === 1 && (
            <Step1DadosBasicos
              register={register}
              errors={errors}
              control={control}
            />
          )}
          {currentStep === 2 && (
            <Step2Levantamento
              register={register}
              watch={watch}
              errors={errors}
              control={control}
              setValue={setValue}
              getValues={getValues}
            />
          )}
          {currentStep === 3 && (
            <Step3Finalizacao
              register={register}
              setValue={setValue}
              errors={errors}
              assinaturaAtual={watch("assinatura")}
              assinaturaOriginal={assinaturaOriginal}
            />
          )}

          <div className="flex flex-col md:flex-row items-center justify-between mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-gray-200 gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 md:px-8 h-12 md:h-14 bg-primor-gray-medium hover:brightness-95 text-primor-text-light font-semibold rounded-lg transition text-base md:text-lg"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                Voltar
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                key="btn-avancar"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 md:px-8 h-12 md:h-14 bg-primor-primary hover:brightness-110 text-primor-text-dark font-semibold rounded-lg transition text-base md:text-lg md:ml-auto"
              >
                Avançar
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            ) : (
              <button
                key="btn-salvar"
                type="submit"
                disabled={loading}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 md:px-8 h-12 md:h-14 bg-primor-secondary hover:brightness-110 disabled:opacity-50 text-primor-text-dark font-semibold rounded-lg transition text-base md:text-lg md:ml-auto shadow-md"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {loadingMessage ||
                      (isEditMode ? "Atualizando..." : "Salvando...")}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 md:w-6 md:h-6" />
                    {isEditMode ? "Salvar Alterações" : "Salvar Briefing"}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Template PDF Atualizado */}
      {savedData && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0,
            pointerEvents: "none",
            zIndex: -10,
          }}
        >
          <div ref={pdfRef} className="w-[210mm] bg-white p-8">
            <div className="space-y-6">
              <div
                className="text-center border-b-2 border-gray-300 pb-4"
                style={{ pageBreakInside: "avoid" }}
              >
                <h1 className="text-3xl font-bold text-gray-900">Arquiteck</h1>
                <p className="text-lg text-gray-600">
                  Briefing de Primeira Visita
                </p>
              </div>

              <div style={{ pageBreakInside: "avoid" }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  Dados Básicos
                </h2>
                <p>
                  <strong>Cliente:</strong> {savedData.nomeCliente}
                </p>
                <p>
                  <strong>Telefone:</strong> {savedData.telefone}
                </p>
                <p>
                  <strong>Endereço:</strong> {savedData.endereco}
                </p>
                <p>
                  <strong>Ambiente:</strong> {savedData.tituloAmbiente}
                </p>
                <p>
                  <strong>Data:</strong>{" "}
                  {formatarData(savedData.dataAtendimento)}
                </p>
                <p>
                  <strong>Horário:</strong> {savedData.horarioVisita}
                </p>
              </div>

              <div style={{ pageBreakInside: "avoid" }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">Móveis</h2>
                {savedData.moveis.map((movel, idx) => (
                  <div
                    key={idx}
                    className="mb-4 p-3 border border-gray-300 rounded"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <p className="font-bold">{movel.nome}</p>
                    <p>
                      Medidas: {movel.largura}mm × {movel.altura}mm ×{" "}
                      {movel.profundidade}mm
                    </p>
                    <p>
                      MDF Interno: {movel.corMdfInterna} | MDF Externo:{" "}
                      {movel.corMdfExterna}
                    </p>
                    {movel.temPuxador && (
                      <p>
                        Puxador: {movel.tipoPuxador} - {movel.detalhesPuxador}
                      </p>
                    )}
                    {movel.temCorredicas && (
                      <p>
                        Corrediça: {movel.tipoCorredica} (
                        {movel.finalidadeCorredica})
                      </p>
                    )}
                    {movel.temBascula && <p>Báscula: {movel.tipoBascula}</p>}
                    {movel.temPortaVidro && (
                      <p>Porta Vidro: {movel.tipoPortaVidro}</p>
                    )}
                    {movel.temFitaLed && <p>Fita LED: {movel.tipoFitaLed}</p>}
                    {movel.observacoesMovel && (
                      <p className="text-sm mt-2">
                        Obs: {movel.observacoesMovel}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {savedData.especificacoesAmbiente && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Especificações do Ambiente
                  </h2>
                  {savedData.especificacoesAmbiente.rodape && (
                    <>
                      <p>Rodapé: {savedData.especificacoesAmbiente.rodape}</p>
                      {savedData.especificacoesAmbiente.alturaRodape &&
                        savedData.especificacoesAmbiente.profundidadeRodape && (
                          <p>
                            Dimensões:{" "}
                            {savedData.especificacoesAmbiente.alturaRodape}mm ×{" "}
                            {
                              savedData.especificacoesAmbiente
                                .profundidadeRodape
                            }
                            mm
                          </p>
                        )}
                    </>
                  )}
                  {savedData.especificacoesAmbiente.tipoParede && (
                    <p>
                      Tipo de Parede:{" "}
                      {savedData.especificacoesAmbiente.tipoParede}
                    </p>
                  )}
                  {savedData.especificacoesAmbiente.tubulacoesParede && (
                    <p>
                      Tubulações: Sim -{" "}
                      {savedData.especificacoesAmbiente.localTubulacao}
                    </p>
                  )}
                  <p>
                    Estacionamento:{" "}
                    {savedData.especificacoesAmbiente.temEstacionamento
                      ? "Sim"
                      : "Não"}
                  </p>
                  {savedData.especificacoesAmbiente.temElevador && (
                    <p>
                      Elevador:{" "}
                      {savedData.especificacoesAmbiente.alturaElevador}mm ×{" "}
                      {savedData.especificacoesAmbiente.profundidadeElevador}mm
                    </p>
                  )}
                </div>
              )}

              {savedData.eletrodomesticos.length > 0 && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Eletrodomésticos
                  </h2>
                  {savedData.eletrodomesticos.map((e, idx) => (
                    <p key={idx}>
                      • {e.nome} {e.modelo && `- ${e.modelo}`}
                    </p>
                  ))}
                </div>
              )}

              {savedData.fotosAmbiente &&
                savedData.fotosAmbiente.length > 0 && (
                  <div style={{ pageBreakInside: "avoid" }}>
                    <h2 className="text-xl font-bold text-gray-800 mb-3">
                      Fotos
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {savedData.fotosAmbiente.map((foto, idx) => (
                        <img
                          key={idx}
                          src={foto}
                          alt={`Foto ${idx + 1}`}
                          style={{ maxHeight: "200px", objectFit: "contain" }}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {savedData.observacoes && (
                <div style={{ pageBreakInside: "avoid" }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-3">
                    Observações
                  </h2>
                  <p className="whitespace-pre-wrap">{savedData.observacoes}</p>
                </div>
              )}

              <div style={{ pageBreakInside: "avoid" }}>
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  Assinatura
                </h2>
                <img
                  src={savedData.assinatura}
                  alt="Assinatura"
                  style={{
                    maxWidth: "400px",
                    maxHeight: "150px",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
