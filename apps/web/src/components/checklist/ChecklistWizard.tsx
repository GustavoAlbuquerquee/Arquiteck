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
import { uploadBase64Image, caminhoNoBucket } from "@/lib/supabase/storage";
import { useUrlsAssinadas } from "@/lib/useUrlsAssinadas";
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
  // Bucket privado: as imagens do PDF usam URLs assinadas
  const urlDaImagem = useUrlsAssinadas([
    ...(savedData?.fotosAmbiente ?? []),
    savedData?.assinatura,
  ]);

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
    // Devolve o caminho no bucket (privado), que é o que vai para o payload
    const enviar = async (base64: string, path: string) => {
      const caminho = await uploadBase64Image(base64, path, BUCKET_VISTORIAS);
      if (!caminho) {
        throw new Error(
          "Não foi possível enviar as fotos ou a assinatura. Verifique a conexão e tente de novo. Nada foi salvo.",
        );
      }
      enviados.push(caminho);
      return caminho;
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

      // 2. Fotos novas (base64). As já salvas (caminho, ou URL nos briefings
      // antigos) ficam como estão.
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
        .map((valor) => caminhoNoBucket(valor, BUCKET_VISTORIAS))
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
    <div className="mx-auto max-w-4xl">
      {/* Loading State - Carregando Dados */}
      {loadingData && (
        <div role="status" className="alerta alerta-info mb-6 animate-fade-in px-5 py-5">
          <Loader2 aria-hidden="true" className="h-6 w-6 flex-shrink-0 animate-spin text-primor-primary-ink" />
          <div>
            <h3 className="font-display text-lg font-semibold">
              Carregando dados do briefing...
            </h3>
            <p className="mt-1">
              Aguarde enquanto buscamos as informações.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="alerta alerta-erro mb-6 animate-fade-in px-5 py-5 text-base">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-6 w-6 flex-shrink-0" />
          <div>
            <h3 className="font-display text-lg font-semibold">
              Erro ao prosseguir
            </h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {showSuccessAlert && savedData && (
        <div role="status" className="panel mb-6 animate-fade-in overflow-hidden">
          <div className="flex items-start gap-4 border-l-4 border-[#067647] px-5 py-6 md:px-7">
            <CheckCircle aria-hidden="true" className="h-7 w-7 flex-shrink-0 text-[#067647]" />
            <div className="flex-1">
              <p className="etiqueta">Briefing · {savedData.nomeCliente}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold text-primor-secondary">
                {isEditMode
                  ? "Briefing atualizado com sucesso"
                  : "Briefing salvo com sucesso"}
              </h3>
              <p className="mt-1 text-primor-muted">
                Os dados foram {isEditMode ? "atualizados" : "registrados"} no
                sistema.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  <FileDown aria-hidden="true" className="h-5 w-5" />
                  Baixar resumo em PDF
                </button>
                <button
                  type="button"
                  onClick={handleNovoFormulario}
                  className="btn btn-outline w-full sm:w-auto"
                >
                  Novo formulário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showSuccessAlert && (
        // Progresso em forma de trena: cada etapa é um trecho da fita
        <nav aria-label="Etapas do briefing" className="mb-6 md:mb-8">
          <ol className="grid grid-cols-3 gap-2 md:gap-3">
            {["Dados básicos", "Levantamento", "Finalização"].map(
              (rotulo, i) => {
                const etapa = i + 1;
                const alcancada = currentStep >= etapa;
                const atual = currentStep === etapa;
                return (
                  <li key={rotulo} aria-current={atual ? "step" : undefined}>
                    <div
                      aria-hidden="true"
                      className={`h-2.5 rounded-[2px] transition-colors duration-300 ${
                        alcancada ? "trena" : "bg-primor-line"
                      }`}
                    />
                    <div className="mt-2.5 flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-2">
                      <span
                        className={`font-mono text-xs tabular ${
                          alcancada ? "text-primor-primary-ink" : "text-primor-muted"
                        }`}
                      >
                        {String(etapa).padStart(2, "0")}
                      </span>
                      <span
                        className={`text-sm leading-tight ${
                          atual
                            ? "font-semibold text-primor-secondary"
                            : "font-medium text-primor-muted"
                        }`}
                      >
                        {rotulo}
                      </span>
                      <span className="sr-only">
                        {atual ? "(etapa atual)" : currentStep > etapa ? "(concluída)" : ""}
                      </span>
                    </div>
                  </li>
                );
              },
            )}
          </ol>
        </nav>
      )}

      {!showSuccessAlert && !loadingData && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="panel p-5 sm:p-6 md:p-8"
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

          <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t border-dashed border-primor-line pt-6 md:flex-row">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline btn-lg w-full md:w-auto"
              >
                <ChevronLeft aria-hidden="true" className="h-5 w-5" />
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
                className="btn btn-primary btn-lg w-full md:ml-auto md:w-auto"
              >
                Avançar
                <ChevronRight aria-hidden="true" className="h-5 w-5" />
              </button>
            ) : (
              <button
                key="btn-salvar"
                type="submit"
                disabled={loading}
                className="btn btn-secondary btn-lg w-full md:ml-auto md:w-auto"
              >
                {loading ? (
                  <>
                    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span aria-live="polite">
                      {loadingMessage ||
                        (isEditMode ? "Atualizando..." : "Salvando...")}
                    </span>
                  </>
                ) : (
                  <>
                    <Save aria-hidden="true" className="h-5 w-5" />
                    {isEditMode ? "Salvar alterações" : "Salvar briefing"}
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
                          src={urlDaImagem(foto)}
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
                  src={urlDaImagem(savedData.assinatura)}
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
