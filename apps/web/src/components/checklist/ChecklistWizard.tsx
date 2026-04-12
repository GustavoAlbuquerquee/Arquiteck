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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import html2pdf from "html2pdf.js";
import {
  uploadBase64Image,
  uploadMultipleBase64Images,
} from "@/lib/supabase/storage";
import { useSearchParams } from "react-router-dom";

export function ChecklistWizard() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("edit");
  const isEditMode = !!projectId;

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [savedData, setSavedData] = useState<ChecklistFormData | null>(null);
  const [existingClientId, setExistingClientId] = useState<string | null>(null);
  const [existingChecklistId, setExistingChecklistId] = useState<string | null>(
    null,
  );
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
    },
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

      console.log("🔵 Validação Step 1:", { isValid, errors });

      if (isValid) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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

  // Buscar dados do projeto para edição
  useEffect(() => {
    if (isEditMode && projectId) {
      loadProjectData(projectId);
    }
  }, [isEditMode, projectId]);

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

      // Mapear dados para o formato do formulário
      const checklist = data.checklists[0];
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

      console.log("🟢 Dados carregados e formatados:", formData);

      setExistingClientId(data.clients.id);
      setExistingChecklistId(checklist?.id || null);
      reset(formData);
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Erro ao carregar dados do briefing");
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: ChecklistFormData) => {
    console.log("🔵 onSubmit chamado", { isEditMode, projectId, data });
    setLoading(true);
    setError("");

    try {
      const tenant_id = user?.user_metadata?.tenant_id;

      if (!tenant_id) {
        throw new Error(
          "Tenant ID não encontrado. Faça logout e login novamente.",
        );
      }

      if (isEditMode && projectId) {
        // MODO DE EDIÇÃO (UPDATE)
        setLoadingMessage("A processar imagens...");

        // Processar assinatura (nova ou existente)
        let assinaturaUrl = data.assinatura;
        if (data.assinatura && data.assinatura.startsWith("data:")) {
          const assinaturaPath = `${tenant_id}/assinaturas/assinatura-${Date.now()}.png`;
          const uploadedUrl = await uploadBase64Image(
            data.assinatura,
            assinaturaPath,
          );
          if (uploadedUrl) assinaturaUrl = uploadedUrl;
        }

        // Processar fotos (novas ou existentes)
        setLoadingMessage("A enviar fotos...");
        const fotosUrls: string[] = [];
        if (data.fotosAmbiente && data.fotosAmbiente.length > 0) {
          for (let i = 0; i < data.fotosAmbiente.length; i++) {
            const foto = data.fotosAmbiente[i];
            if (foto.startsWith("data:")) {
              // Nova foto Base64 - fazer upload
              const fotoPath = `${tenant_id}/fotos/foto-${Date.now()}-${i}.jpg`;
              const uploadedUrl = await uploadBase64Image(foto, fotoPath);
              if (uploadedUrl) fotosUrls.push(uploadedUrl);
            } else {
              // Foto já existente (URL) - manter
              fotosUrls.push(foto);
            }
          }
        }

        // Atualizar cliente
        if (existingClientId) {
          setLoadingMessage("A atualizar dados do cliente...");
          const { error: clientError } = await supabase
            .from("clients")
            .update({
              nome: data.nomeCliente,
              telefone: data.telefone,
              endereco: data.endereco,
            })
            .eq("id", existingClientId);

          if (clientError) throw clientError;
        }

        // Atualizar projeto
        if (projectId) {
          setLoadingMessage("A atualizar projeto...");
          const { error: projectError } = await supabase
            .from("projects")
            .update({
              titulo_ambiente: data.tituloAmbiente,
              data_prevista_instalacao: data.dataAtendimento,
            })
            .eq("id", projectId);

          if (projectError) throw projectError;
        }

        // Atualizar checklist
        if (existingChecklistId) {
          setLoadingMessage("A finalizar...");
          const payload = {
            horarioVisita: data.horarioVisita,
            moveis: data.moveis,
            eletrodomesticos: data.eletrodomesticos,
            especificacoesAmbiente: data.especificacoesAmbiente,
            pontosCriticos: data.pontosCriticos,
            fotosAmbiente: fotosUrls,
            observacoes: data.observacoes,
            assinatura_url: assinaturaUrl,
          };

          const { error: checklistError } = await supabase
            .from("checklists")
            .update({ payload })
            .eq("id", existingChecklistId);

          if (checklistError) throw checklistError;
        }

        console.log("✅ Briefing atualizado com sucesso!");

        const dataComUrls = {
          ...data,
          fotosAmbiente: fotosUrls,
          assinatura: assinaturaUrl,
        };

        setSavedData(dataComUrls);
        setShowSuccessAlert(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // MODO DE CRIAÇÃO (INSERT)
        // 1. Upload da assinatura
        setLoadingMessage("A enviar assinatura...");
        let assinaturaUrl = "";
        if (data.assinatura) {
          const assinaturaPath = `${tenant_id}/assinaturas/assinatura-${Date.now()}.png`;
          const uploadedUrl = await uploadBase64Image(
            data.assinatura,
            assinaturaPath,
          );
          if (!uploadedUrl) {
            throw new Error("Erro ao fazer upload da assinatura");
          }
          assinaturaUrl = uploadedUrl;
        }

        // 2. Upload das fotos do ambiente
        setLoadingMessage("A enviar fotos...");
        let fotosUrls: string[] = [];
        if (data.fotosAmbiente && data.fotosAmbiente.length > 0) {
          const fotosPathPrefix = `${tenant_id}/fotos`;
          fotosUrls = await uploadMultipleBase64Images(
            data.fotosAmbiente,
            fotosPathPrefix,
          );
          if (fotosUrls.length !== data.fotosAmbiente.length) {
            console.warn("Algumas fotos falharam no upload");
          }
        }

        // 3. Criar cliente com telefone e endereço
        setLoadingMessage("A guardar dados do cliente...");
        const { data: cliente, error: clientError } = await supabase
          .from("clients")
          .insert({
            tenant_id: tenant_id,
            nome: data.nomeCliente,
            telefone: data.telefone,
            endereco: data.endereco,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        if (!cliente) throw new Error("Erro ao criar cliente");

        // 4. Criar projeto
        setLoadingMessage("A criar projeto...");
        const { data: projeto, error: projectError } = await supabase
          .from("projects")
          .insert({
            tenant_id: tenant_id,
            client_id: cliente.id,
            titulo_ambiente: data.tituloAmbiente,
            data_prevista_instalacao: data.dataAtendimento,
            status: "orcamento",
          })
          .select()
          .single();

        if (projectError) throw projectError;
        if (!projeto) throw new Error("Erro ao criar projeto");

        // 5. Criar checklist com URLs ao invés de Base64
        setLoadingMessage("A finalizar...");
        const payload = {
          horarioVisita: data.horarioVisita,
          moveis: data.moveis,
          eletrodomesticos: data.eletrodomesticos,
          especificacoesAmbiente: data.especificacoesAmbiente,
          pontosCriticos: data.pontosCriticos,
          fotosAmbiente: fotosUrls,
          observacoes: data.observacoes,
          assinatura_url: assinaturaUrl,
        };

        const { error: checklistError } = await supabase
          .from("checklists")
          .insert({
            tenant_id: tenant_id,
            project_id: projeto.id,
            tipo_etapa: "pre_producao",
            payload: payload,
          });

        if (checklistError) throw checklistError;

        console.log("🎉 Briefing salvo com sucesso!", {
          cliente,
          projeto,
          payload,
        });

        // Atualizar savedData com URLs para o PDF
        const dataComUrls = {
          ...data,
          fotosAmbiente: fotosUrls,
          assinatura: assinaturaUrl,
        };

        setSavedData(dataComUrls);
        setShowSuccessAlert(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error("Erro ao salvar briefing:", err);
      setError(err.message || "Erro ao salvar briefing. Tente novamente.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
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
    reset();
    setSavedData(null);
    setShowSuccessAlert(false);
    setCurrentStep(1);
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
            />
          )}
          {currentStep === 3 && (
            <Step3Finalizacao
              register={register}
              setValue={setValue}
              errors={errors}
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
                onClick={() => {
                  console.log("🔴 Botão clicado", {
                    errors,
                    errorsDetalhado: JSON.stringify(errors, null, 2),
                    isEditMode,
                    loading,
                  });
                  if (errors.moveis) {
                    console.log("❌ Erros nos móveis:", errors.moveis);
                  }
                }}
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
                  {new Date(savedData.dataAtendimento).toLocaleDateString(
                    "pt-BR",
                  )}
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
