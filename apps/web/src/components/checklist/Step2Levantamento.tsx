import {
  UseFormRegister,
  UseFormWatch,
  FieldErrors,
  Control,
  useFieldArray,
  UseFormSetValue,
  UseFormGetValues,
} from "react-hook-form";
import {
  ChecklistFormData,
  eletrodomesticosOptions,
  tipoPuxadorOptions,
  tipoCorredicas,
  tipoFitaLedOptions,
  tipoPortaVidroOptions,
} from "@/schemas/checklistSchema";
import {
  Ruler,
  Zap,
  AlertCircle,
  Plus,
  Trash2,
  Camera,
  CheckCircle2,
  Circle,
  Building2,
  Package,
} from "lucide-react";
import { useState } from "react";
import { comprimirImagem } from "@/lib/image";
import { useUrlsAssinadas } from "@/lib/useUrlsAssinadas";

interface Step2Props {
  register: UseFormRegister<ChecklistFormData>;
  watch: UseFormWatch<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  control: Control<ChecklistFormData>;
  setValue: UseFormSetValue<ChecklistFormData>;
  getValues: UseFormGetValues<ChecklistFormData>;
}

export function Step2Levantamento({
  register,
  watch,
  errors,
  control,
  setValue,
  getValues,
}: Step2Props) {
  const [processandoFotos, setProcessandoFotos] = useState(false);
  const [fotoErro, setFotoErro] = useState("");

  // useFieldArray para móveis dinâmicos
  const {
    fields: moveisFields,
    append: appendMovel,
    remove: removeMovel,
  } = useFieldArray({
    control,
    name: "moveis",
  });

  // useFieldArray para eletrodomésticos
  const {
    fields: eletroFields,
    append: appendEletro,
    remove: removeEletro,
  } = useFieldArray({
    control,
    name: "eletrodomesticos",
  });

  const watchedMoveis = watch("moveis") || [];
  const eletrodomesticosSelecionados = watch("eletrodomesticos") || [];
  const especificacoes = watch("especificacoesAmbiente");
  const fotosAmbiente = watch("fotosAmbiente") || [];
  // Fotos já salvas ficam no bucket privado: exibidas por URL assinada
  const urlDaFoto = useUrlsAssinadas(fotosAmbiente);

  const handleAddMovel = () => {
    appendMovel({
      nome: "",
      largura: "",
      altura: "",
      profundidade: "",
      corMdfInterna: "",
      corMdfExterna: "",
      observacoesMovel: "",
      temPuxador: false,
      tipoPuxador: "",
      detalhesPuxador: "",
      temCorredicas: false,
      tipoCorredica: "",
      finalidadeCorredica: "",
      temBascula: false,
      tipoBascula: "",
      temPortaVidro: false,
      tipoPortaVidro: "",
      temFitaLed: false,
      tipoFitaLed: "",
    });
  };

  const toggleEletrodomestico = (nomeEletro: string) => {
    const existe = eletrodomesticosSelecionados.find(
      (e) => e.nome === nomeEletro,
    );
    if (existe) {
      const index = eletrodomesticosSelecionados.findIndex(
        (e) => e.nome === nomeEletro,
      );
      removeEletro(index);
    } else {
      appendEletro({ nome: nomeEletro, modelo: "" });
    }
  };

  const handleFotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    // Limpa o input para que escolher o mesmo arquivo de novo dispare onChange
    input.value = "";
    if (files.length === 0) return;

    setFotoErro("");
    setProcessandoFotos(true);
    const novas: string[] = [];
    let falhas = 0;
    for (const file of files) {
      try {
        novas.push(await comprimirImagem(file));
      } catch {
        falhas++;
      }
    }
    setProcessandoFotos(false);

    // Lê o valor atual do form (não o do render) para não perder fotos
    // adicionadas enquanto as anteriores eram processadas
    setValue("fotosAmbiente", [...(getValues("fotosAmbiente") || []), ...novas]);
    if (falhas > 0) {
      setFotoErro(
        falhas === 1
          ? "Não foi possível carregar 1 foto. Tente adicioná-la de novo."
          : `Não foi possível carregar ${falhas} fotos. Tente adicioná-las de novo.`,
      );
    }
  };

  const handleRemoveFoto = (indexToRemove: number) => {
    setValue(
      "fotosAmbiente",
      fotosAmbiente.filter((_, index) => index !== indexToRemove),
    );
  };

  return (
    <div className="w-full space-y-10">
      <div>
        <p className="etiqueta">Etapa 02</p>
        <h2 className="titulo-secao mt-1">Levantamento técnico</h2>
      </div>

      {/* Móveis e Medidas Dinâmicas */}
      <section aria-labelledby="secao-moveis" className="w-full">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="etiqueta">A · Plano de peças</p>
            <h3 id="secao-moveis" className="mt-1 flex items-center gap-2 text-lg font-semibold text-primor-secondary md:text-xl">
              <Ruler aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
              Móveis e especificações
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAddMovel}
            className="btn btn-primary w-full md:w-auto"
          >
            <Plus aria-hidden="true" className="h-5 w-5" />
            Adicionar móvel
          </button>
        </div>

        {moveisFields.length === 0 && (
          <div className="flex flex-col items-center rounded-md border-[1.5px] border-dashed border-primor-line-strong bg-primor-bg-light px-4 py-8 text-center">
            <Package aria-hidden="true" strokeWidth={1.5} className="h-9 w-9 text-primor-line-strong" />
            <p className="mt-3 text-primor-muted">
              Nenhum móvel adicionado. Clique em "Adicionar Móvel"
            </p>
          </div>
        )}

        <div className="space-y-5">
          {moveisFields.map((field, index) => {
            const movel = watchedMoveis[index] || field;
            const pid = `movel-${index}`;
            const temMedida = movel?.largura || movel?.altura || movel?.profundidade;

            return (
              <div
                key={field.id}
                className="fita rounded-lg border border-primor-line bg-primor-surface py-5 pl-6 pr-4 shadow-chapa md:py-6 md:pl-8 md:pr-6"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="etiqueta">Peça {String(index + 1).padStart(2, "0")}</p>
                    <h4 className="mt-0.5 truncate font-display text-lg font-semibold text-primor-secondary">
                      {movel?.nome || `Móvel ${index + 1}`}
                    </h4>
                    {/* Cota ao vivo: L × A × P, como numa etiqueta de plano de corte */}
                    <p aria-hidden="true" className="mt-1 font-mono text-xs text-primor-muted tabular">
                      {temMedida
                        ? `L ${movel?.largura || "—"} × A ${movel?.altura || "—"} × P ${movel?.profundidade || "—"} mm`
                        : "L — × A — × P — mm"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMovel(index)}
                    aria-label={`Remover ${movel?.nome || `móvel ${index + 1}`}`}
                    className="btn-icon text-primor-erro hover:bg-primor-erro-bg"
                  >
                    <Trash2 aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Nome do Móvel */}
                  <div>
                    <label htmlFor={`${pid}-nome`} className="field-label">
                      Nome do móvel <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                    </label>
                    <input
                      id={`${pid}-nome`}
                      type="text"
                      aria-invalid={!!errors.moveis?.[index]?.nome}
                      {...register(`moveis.${index}.nome`)}
                      className="field"
                      placeholder="Ex: Armário Aéreo, Balcão"
                    />
                    {errors.moveis?.[index]?.nome && (
                      <p className="field-error">
                        {errors.moveis[index]?.nome?.message}
                      </p>
                    )}
                  </div>

                  {/* Medidas em MM */}
                  <fieldset>
                    <legend className="field-label">Medidas</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label htmlFor={`${pid}-largura`} className="mb-1 block text-sm text-primor-muted">
                          Largura <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id={`${pid}-largura`}
                            type="text"
                            inputMode="numeric"
                            {...register(`moveis.${index}.largura`)}
                            className="field pr-12 font-mono tabular"
                            placeholder="3000"
                          />
                          <span aria-hidden="true" className="field-unit">mm</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`${pid}-altura`} className="mb-1 block text-sm text-primor-muted">
                          Altura <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id={`${pid}-altura`}
                            type="text"
                            inputMode="numeric"
                            {...register(`moveis.${index}.altura`)}
                            className="field pr-12 font-mono tabular"
                            placeholder="2800"
                          />
                          <span aria-hidden="true" className="field-unit">mm</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`${pid}-profundidade`} className="mb-1 block text-sm text-primor-muted">
                          Profundidade <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id={`${pid}-profundidade`}
                            type="text"
                            inputMode="numeric"
                            aria-invalid={!!errors.moveis?.[index]?.profundidade}
                            {...register(`moveis.${index}.profundidade`)}
                            className="field pr-12 font-mono tabular"
                            placeholder="600"
                          />
                          <span aria-hidden="true" className="field-unit">mm</span>
                        </div>
                      </div>
                    </div>
                    <p className="sr-only">Medidas em milímetros.</p>
                    {errors.moveis?.[index]?.profundidade && (
                      <p className="field-error">
                        {errors.moveis[index]?.profundidade?.message}
                      </p>
                    )}
                  </fieldset>

                  {/* Cores do MDF */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${pid}-mdf-interno`} className="field-label">
                        Cor MDF interno <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <input
                        id={`${pid}-mdf-interno`}
                        type="text"
                        {...register(`moveis.${index}.corMdfInterna`)}
                        className="field"
                        placeholder="Ex: Branco Cristal"
                      />
                    </div>
                    <div>
                      <label htmlFor={`${pid}-mdf-externo`} className="field-label">
                        Cor MDF externo <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <input
                        id={`${pid}-mdf-externo`}
                        type="text"
                        {...register(`moveis.${index}.corMdfExterna`)}
                        className="field"
                        placeholder="Ex: Nogueira"
                      />
                    </div>
                  </div>

                  {/* Checkboxes Condicionais */}
                  <fieldset>
                    <legend className="field-label">Ferragens e acabamentos</legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Tem Puxador */}
                      <label className="opcao">
                        <input
                          type="checkbox"
                          {...register(`moveis.${index}.temPuxador`, {
                            onChange: (e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setValue(`moveis.${index}.tipoPuxador`, "");
                                setValue(`moveis.${index}.detalhesPuxador`, "");
                              }
                            },
                          })}
                        />
                        <span>Tem puxador?</span>
                      </label>

                      {/* Tem Corrediças */}
                      <label className="opcao">
                        <input
                          type="checkbox"
                          {...register(`moveis.${index}.temCorredicas`, {
                            onChange: (e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setValue(`moveis.${index}.tipoCorredica`, "");
                                setValue(
                                  `moveis.${index}.finalidadeCorredica`,
                                  "",
                                );
                              }
                            },
                          })}
                        />
                        <span>Tem corrediças?</span>
                      </label>

                      {/* Tem Báscula */}
                      <label className="opcao">
                        <input
                          type="checkbox"
                          {...register(`moveis.${index}.temBascula`, {
                            onChange: (e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setValue(`moveis.${index}.tipoBascula`, "");
                              }
                            },
                          })}
                        />
                        <span>Tem báscula?</span>
                      </label>

                      {/* Tem Porta de Vidro */}
                      <label className="opcao">
                        <input
                          type="checkbox"
                          {...register(`moveis.${index}.temPortaVidro`, {
                            onChange: (e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setValue(`moveis.${index}.tipoPortaVidro`, "");
                              }
                            },
                          })}
                        />
                        <span>Tem porta de vidro?</span>
                      </label>

                      {/* Tem Fita LED */}
                      <label className="opcao">
                        <input
                          type="checkbox"
                          {...register(`moveis.${index}.temFitaLed`, {
                            onChange: (e) => {
                              const checked = e.target.checked;
                              if (!checked) {
                                setValue(`moveis.${index}.tipoFitaLed`, "");
                              }
                            },
                          })}
                        />
                        <span>Tem fita LED?</span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Campos Condicionais - Puxador */}
                  <div
                    className={`subpainel grid w-full gap-3 sm:grid-cols-2 ${!movel?.temPuxador ? "hidden" : ""}`}
                  >
                    <div className="w-full">
                      <label htmlFor={`${pid}-tipo-puxador`} className="field-label">
                        Tipo de puxador <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <select
                        id={`${pid}-tipo-puxador`}
                        {...register(`moveis.${index}.tipoPuxador`)}
                        className="field"
                      >
                        <option value="">Selecione</option>
                        {tipoPuxadorOptions.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full">
                      <label htmlFor={`${pid}-detalhes-puxador`} className="field-label">
                        Detalhes do puxador <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <input
                        id={`${pid}-detalhes-puxador`}
                        type="text"
                        {...register(`moveis.${index}.detalhesPuxador`)}
                        className="field"
                        placeholder="Ex: Preto Fosco, 128mm"
                      />
                    </div>
                  </div>

                  {/* Campos Condicionais - Corrediças */}
                  <div
                    className={`subpainel grid w-full gap-3 sm:grid-cols-2 ${!movel?.temCorredicas ? "hidden" : ""}`}
                  >
                    <div className="w-full">
                      <label htmlFor={`${pid}-tipo-corredica`} className="field-label">
                        Tipo de corrediça <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <select
                        id={`${pid}-tipo-corredica`}
                        {...register(`moveis.${index}.tipoCorredica`)}
                        className="field"
                      >
                        <option value="">Selecione</option>
                        {tipoCorredicas.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full">
                      <label htmlFor={`${pid}-finalidade-corredica`} className="field-label">
                        Para qual finalidade/gaveta? <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                      </label>
                      <input
                        id={`${pid}-finalidade-corredica`}
                        type="text"
                        {...register(`moveis.${index}.finalidadeCorredica`)}
                        className="field"
                        placeholder="Ex: Gaveta de talheres, Gaveta de panelas"
                      />
                    </div>
                  </div>

                  {/* Campos Condicionais - Báscula */}
                  <div
                    className={`subpainel w-full ${!movel?.temBascula ? "hidden" : ""}`}
                  >
                    <label htmlFor={`${pid}-tipo-bascula`} className="field-label">
                      Tipo de báscula <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                    </label>
                    <select
                      id={`${pid}-tipo-bascula`}
                      {...register(`moveis.${index}.tipoBascula`)}
                      className="field"
                    >
                      <option value="">Selecione</option>
                      <option value="comum">Comum</option>
                      <option value="inversa">Inversa</option>
                    </select>
                  </div>

                  {/* Campos Condicionais - Porta de Vidro */}
                  <div
                    className={`subpainel w-full ${!movel?.temPortaVidro ? "hidden" : ""}`}
                  >
                    <label htmlFor={`${pid}-tipo-porta-vidro`} className="field-label">
                      Tipo de porta de vidro <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                    </label>
                    <select
                      id={`${pid}-tipo-porta-vidro`}
                      {...register(`moveis.${index}.tipoPortaVidro`)}
                      className="field"
                    >
                      <option value="">Selecione</option>
                      {tipoPortaVidroOptions.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campos Condicionais - Fita LED */}
                  <div
                    className={`subpainel w-full ${!movel?.temFitaLed ? "hidden" : ""}`}
                  >
                    <label htmlFor={`${pid}-tipo-fita-led`} className="field-label">
                      Tipo de fita LED <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                    </label>
                    <select
                      id={`${pid}-tipo-fita-led`}
                      {...register(`moveis.${index}.tipoFitaLed`)}
                      className="field"
                    >
                      <option value="">Selecione</option>
                      {tipoFitaLedOptions.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observações do Móvel */}
                  <div>
                    <label htmlFor={`${pid}-observacoes`} className="field-label">
                      Observações do móvel
                    </label>
                    <textarea
                      id={`${pid}-observacoes`}
                      {...register(`moveis.${index}.observacoesMovel`)}
                      rows={3}
                      className="field resize-none"
                      placeholder="Observações específicas deste móvel..."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errors.moveis &&
          typeof errors.moveis === "object" &&
          "message" in errors.moveis && (
            <p className="field-error">
              {errors.moveis.message as string}
            </p>
          )}
      </section>

      {/* Especificações do Ambiente (NOVO) */}
      <section aria-labelledby="secao-ambiente" className="border-t border-dashed border-primor-line pt-8">
        <p className="etiqueta">B · Local da obra</p>
        <h3 id="secao-ambiente" className="mb-5 mt-1 flex items-center gap-2 text-lg font-semibold text-primor-secondary md:text-xl">
          <Building2 aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
          Especificações do ambiente
        </h3>

        <div className="space-y-5">
          {/* Rodapé */}
          <div>
            <label htmlFor="ambiente-rodape" className="field-label">
              Rodapé (material)
            </label>
            <input
              id="ambiente-rodape"
              type="text"
              {...register("especificacoesAmbiente.rodape")}
              className="field"
              placeholder="Ex: Madeira, MDF, Gesso"
            />
          </div>

          {/* Campos Condicionais - Rodapé */}
          {especificacoes?.rodape && (
            <div className="subpainel grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="ambiente-altura-rodape" className="field-label">
                  Altura do rodapé
                </label>
                <div className="relative">
                  <input
                    id="ambiente-altura-rodape"
                    type="number"
                    {...register("especificacoesAmbiente.alturaRodape")}
                    className="field pr-12 font-mono tabular"
                    placeholder="70"
                  />
                  <span aria-hidden="true" className="field-unit">mm</span>
                </div>
              </div>
              <div>
                <label htmlFor="ambiente-profundidade-rodape" className="field-label">
                  Profundidade do rodapé
                </label>
                <div className="relative">
                  <input
                    id="ambiente-profundidade-rodape"
                    type="number"
                    {...register("especificacoesAmbiente.profundidadeRodape")}
                    className="field pr-12 font-mono tabular"
                    placeholder="15"
                  />
                  <span aria-hidden="true" className="field-unit">mm</span>
                </div>
              </div>
            </div>
          )}

          {/* Tipo de Parede */}
          <div>
            <label htmlFor="ambiente-parede" className="field-label">
              Tipo de parede
            </label>
            <input
              id="ambiente-parede"
              type="text"
              {...register("especificacoesAmbiente.tipoParede")}
              className="field"
              placeholder="Ex: Alvenaria, Drywall, Concreto"
            />
          </div>

          {/* Checkboxes */}
          <fieldset>
            <legend className="field-label">Condições do local</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="opcao">
                <input
                  type="checkbox"
                  {...register("especificacoesAmbiente.tubulacoesParede")}
                />
                <span>Tubulações na parede?</span>
              </label>

              <label className="opcao">
                <input
                  type="checkbox"
                  {...register("especificacoesAmbiente.temEstacionamento")}
                />
                <span>Tem estacionamento?</span>
              </label>

              <label className="opcao">
                <input
                  type="checkbox"
                  {...register("especificacoesAmbiente.temElevador")}
                />
                <span>Tem elevador?</span>
              </label>
            </div>
          </fieldset>

          {/* Campos Condicionais - Tubulações */}
          {especificacoes?.tubulacoesParede && (
            <div className="subpainel">
              <label htmlFor="ambiente-local-tubulacao" className="field-label">
                Indique o local exato <span aria-hidden="true" className="text-primor-primary-ink">*</span>
              </label>
              <input
                id="ambiente-local-tubulacao"
                type="text"
                {...register("especificacoesAmbiente.localTubulacao")}
                className="field"
                placeholder="Ex: Parede esquerda, próximo à janela"
              />
            </div>
          )}

          {/* Campos Condicionais - Elevador */}
          {especificacoes?.temElevador && (
            <div className="subpainel grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="ambiente-altura-elevador" className="field-label">
                  Altura do elevador <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <div className="relative">
                  <input
                    id="ambiente-altura-elevador"
                    type="number"
                    {...register("especificacoesAmbiente.alturaElevador")}
                    className="field pr-12 font-mono tabular"
                    placeholder="2100"
                  />
                  <span aria-hidden="true" className="field-unit">mm</span>
                </div>
              </div>
              <div>
                <label htmlFor="ambiente-profundidade-elevador" className="field-label">
                  Profundidade do elevador <span aria-hidden="true" className="text-primor-primary-ink">*</span>
                </label>
                <div className="relative">
                  <input
                    id="ambiente-profundidade-elevador"
                    type="number"
                    {...register("especificacoesAmbiente.profundidadeElevador")}
                    className="field pr-12 font-mono tabular"
                    placeholder="1400"
                  />
                  <span aria-hidden="true" className="field-unit">mm</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Eletrodomésticos com Modelos */}
      <section aria-labelledby="secao-eletro" className="border-t border-dashed border-primor-line pt-8">
        <p className="etiqueta">C · Embutidos</p>
        <h3 id="secao-eletro" className="mb-5 mt-1 flex items-center gap-2 text-lg font-semibold text-primor-secondary md:text-xl">
          <Zap aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
          Eletrodomésticos a embutir
        </h3>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {eletrodomesticosOptions.map((eletro) => {
            const eletroSelecionado = eletrodomesticosSelecionados.find(
              (e) => e.nome === eletro,
            );
            const isChecked = !!eletroSelecionado;
            const index = eletrodomesticosSelecionados.findIndex(
              (e) => e.nome === eletro,
            );

            return (
              <div
                key={eletro}
                className={`rounded-md border-[1.5px] transition-colors ${
                  isChecked ? "border-primor-secondary bg-primor-realce" : "border-primor-line bg-primor-surface"
                } ${isChecked && index >= 0 ? "md:col-span-2" : ""}`}
              >
                <label className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primor-secondary dark:has-[:focus-visible]:outline-primor-primary">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEletrodomestico(eletro)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="flex-shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="h-7 w-7 text-primor-secondary" />
                    ) : (
                      <Circle className="h-7 w-7 text-primor-line-strong" />
                    )}
                  </span>
                  <span
                    className={`flex-1 text-base ${isChecked ? "font-semibold text-primor-secondary" : "text-primor-secondary"}`}
                  >
                    {eletro}
                  </span>
                </label>

                {/* Input de Modelo (renderizado condicionalmente) */}
                {isChecked && index >= 0 && (
                  <div className="px-4 pb-4 pl-14">
                    <label htmlFor={`eletro-${index}-modelo`} className="mb-1 block text-sm font-medium text-primor-muted">
                      {eletro === "Outros"
                        ? "Nome do eletrodoméstico"
                        : "Qual o modelo?"}
                    </label>
                    <input
                      id={`eletro-${index}-modelo`}
                      type="text"
                      {...register(`eletrodomesticos.${index}.modelo`)}
                      className="field"
                      placeholder={
                        eletro === "Outros"
                          ? "Ex: Purificador de Água"
                          : "Ex: Brastemp BRM56, Electrolux 80L"
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pontos Críticos */}
      <section aria-labelledby="secao-criticos" className="border-t border-dashed border-primor-line pt-8">
        <p className="etiqueta">D · Atenção na montagem</p>
        <h3 id="secao-criticos" className="mb-5 mt-1 flex items-center gap-2 text-lg font-semibold text-primor-secondary md:text-xl">
          <AlertCircle aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
          Pontos críticos
        </h3>
        <label htmlFor="pontos-criticos" className="field-label">
          Posição de tomadas, registros de água e gás
        </label>
        <textarea
          id="pontos-criticos"
          aria-describedby="pontos-criticos-dica"
          {...register("pontosCriticos")}
          rows={5}
          className="field resize-none text-base md:text-lg"
          placeholder="Descreva a localização de tomadas, pontos de água, gás, etc..."
        />
        <p id="pontos-criticos-dica" className="field-hint">Campo opcional</p>
      </section>

      {/* Fotos do Ambiente e Anotações Manuais */}
      <section aria-labelledby="secao-fotos" className="border-t border-dashed border-primor-line pt-8">
        <p className="etiqueta">E · Registro visual</p>
        <h3 id="secao-fotos" className="mb-5 mt-1 flex items-center gap-2 text-lg font-semibold text-primor-secondary md:text-xl">
          <Camera aria-hidden="true" strokeWidth={1.75} className="h-5 w-5 text-primor-primary-ink" />
          Fotos do ambiente e anotações manuais
        </h3>

        <label className="block cursor-pointer rounded-md has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primor-secondary dark:has-[:focus-visible]:outline-primor-primary">
          <div className="rounded-md border-[1.5px] border-dashed border-primor-line-strong bg-primor-bg-light px-6 py-9 text-center transition-colors hover:border-primor-secondary hover:bg-primor-realce">
            <Camera aria-hidden="true" strokeWidth={1.5} className="mx-auto mb-3 h-10 w-10 text-primor-primary-ink" />
            <p className="font-semibold text-primor-secondary">
              Clique para adicionar fotos
            </p>
            <p aria-live="polite" className="mt-1 text-sm text-primor-muted">
              {processandoFotos
                ? "Processando fotos..."
                : "Você pode escolher várias fotos de uma vez"}
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFotosChange}
              disabled={processandoFotos}
              className="sr-only"
            />
          </div>
        </label>

        {fotoErro && <p role="alert" className="field-error">{fotoErro}</p>}

        {/* Preview das Fotos */}
        {fotosAmbiente.length > 0 && (
          <div className="mt-5">
            <p className="etiqueta mb-3">
              <span className="tabular">{fotosAmbiente.length}</span>{" "}
              {fotosAmbiente.length === 1
                ? "foto adicionada"
                : "fotos adicionadas"}
            </p>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {fotosAmbiente.map((foto, index) => (
                <li
                  key={index}
                  className="group relative aspect-square overflow-hidden rounded-md border border-primor-line bg-primor-paper-deep"
                >
                  <img
                    src={urlDaFoto(foto)}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto(index)}
                    className="btn-icon absolute right-1.5 top-1.5 bg-[#b42318] text-white shadow-chapa transition-opacity hover:bg-[#912018] focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                    title="Remover foto"
                    aria-label={`Remover foto ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="field-hint mt-3">
          Campo opcional - As fotos serão enviadas para o Supabase Storage
        </p>
      </section>
    </div>
  );
}
