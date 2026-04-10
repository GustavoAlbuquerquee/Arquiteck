import { UseFormRegister, UseFormWatch, FieldErrors, Control, useFieldArray, UseFormSetValue } from 'react-hook-form';
import { ChecklistFormData, eletrodomesticosOptions, tipoPuxadorOptions, tipoCorredicas, tipoFitaLedOptions, tipoPortaVidroOptions } from '@/schemas/checklistSchema';
import { Ruler, Zap, AlertCircle, Plus, Trash2, Camera, CheckCircle2, Circle, Building2, Package } from 'lucide-react';
import { useState } from 'react';

interface Step2Props {
  register: UseFormRegister<ChecklistFormData>;
  watch: UseFormWatch<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  control: Control<ChecklistFormData>;
  setValue: UseFormSetValue<ChecklistFormData>;
}

export function Step2Levantamento({ register, watch, errors, control, setValue }: Step2Props) {
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);

  // useFieldArray para móveis dinâmicos
  const { fields: moveisFields, append: appendMovel, remove: removeMovel } = useFieldArray({
    control,
    name: 'moveis',
  });

  // useFieldArray para eletrodomésticos
  const { fields: eletroFields, append: appendEletro, remove: removeEletro } = useFieldArray({
    control,
    name: 'eletrodomesticos',
  });

  const eletrodomesticosSelecionados = watch('eletrodomesticos') || [];
  const especificacoes = watch('especificacoesAmbiente');
  const fotosAmbiente = watch('fotosAmbiente') || [];

  const handleAddMovel = () => {
    appendMovel({
      nome: '',
      largura: '',
      altura: '',
      profundidade: '',
      corMdfInterna: '',
      corMdfExterna: '',
      observacoesMovel: '',
      temPuxador: false,
      tipoPuxador: '',
      detalhesPuxador: '',
      temCorredicas: false,
      tipoCorredica: '',
      finalidadeCorredica: '',
      temBascula: false,
      tipoBascula: undefined,
      temPortaVidro: false,
      tipoPortaVidro: '',
      temFitaLed: false,
      tipoFitaLed: '',
    });
  };

  const toggleEletrodomestico = (nomeEletro: string) => {
    const existe = eletrodomesticosSelecionados.find((e) => e.nome === nomeEletro);
    if (existe) {
      const index = eletrodomesticosSelecionados.findIndex((e) => e.nome === nomeEletro);
      removeEletro(index);
    } else {
      appendEletro({ nome: nomeEletro, modelo: '' });
    }
  };

  const handleFotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fotosBase64: string[] = [];
    const previews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          fotosBase64.push(base64);
          previews.push(base64);
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    // Concatenar com fotos existentes
    const novasFotos = [...fotosAmbiente, ...fotosBase64];
    setValue('fotosAmbiente', novasFotos);
    setFotosPreview([...fotosPreview, ...previews]);
  };

  const handleRemoveFoto = (indexToRemove: number) => {
    const novasFotos = fotosAmbiente.filter((_, index) => index !== indexToRemove);
    const novosPreviews = fotosPreview.filter((_, index) => index !== indexToRemove);
    setValue('fotosAmbiente', novasFotos);
    setFotosPreview(novosPreviews);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Levantamento Técnico</h2>

      {/* Móveis e Medidas Dinâmicas */}
      <div className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Ruler className="w-6 h-6" />
            Móveis e Especificações
          </h3>
          <button
            type="button"
            onClick={handleAddMovel}
            className="flex items-center gap-2 px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Adicionar Móvel
          </button>
        </div>

        {moveisFields.length === 0 && (
          <p className="text-gray-500 text-center py-4">Nenhum móvel adicionado. Clique em "Adicionar Móvel"</p>
        )}

        <div className="space-y-6">
          {moveisFields.map((field, index) => {
            const movel = watch(`moveis.${index}`);
            
            return (
              <div key={field.id} className="border-2 border-gray-300 rounded-xl p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-700">Móvel {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMovel(index)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Nome do Móvel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Móvel *
                    </label>
                    <input
                      type="text"
                      {...register(`moveis.${index}.nome`)}
                      className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                      placeholder="Ex: Armário Aéreo, Balcão"
                    />
                    {errors.moveis?.[index]?.nome && (
                      <p className="text-red-500 text-xs mt-1">{errors.moveis[index]?.nome?.message}</p>
                    )}
                  </div>

                  {/* Medidas em MM */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Largura (mm) *
                      </label>
                      <input
                        type="number"
                        {...register(`moveis.${index}.largura`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        placeholder="3000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Altura (mm) *
                      </label>
                      <input
                        type="number"
                        {...register(`moveis.${index}.altura`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        placeholder="2800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profundidade (mm) *
                      </label>
                      <input
                        type="number"
                        {...register(`moveis.${index}.profundidade`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        placeholder="600"
                      />
                    </div>
                  </div>

                  {/* Cores do MDF */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor MDF Interno *
                      </label>
                      <input
                        type="text"
                        {...register(`moveis.${index}.corMdfInterna`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        placeholder="Ex: Branco Cristal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor MDF Externo *
                      </label>
                      <input
                        type="text"
                        {...register(`moveis.${index}.corMdfExterna`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        placeholder="Ex: Nogueira"
                      />
                    </div>
                  </div>

                  {/* Checkboxes Condicionais */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    {/* Tem Puxador */}
                    <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        {...register(`moveis.${index}.temPuxador`)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Tem Puxador?</span>
                    </label>

                    {/* Tem Corrediças */}
                    <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        {...register(`moveis.${index}.temCorredicas`)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Tem Corrediças?</span>
                    </label>

                    {/* Tem Báscula */}
                    <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        {...register(`moveis.${index}.temBascula`)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Tem Báscula?</span>
                    </label>

                    {/* Tem Porta de Vidro */}
                    <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        {...register(`moveis.${index}.temPortaVidro`)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Tem Porta Vidro?</span>
                    </label>

                    {/* Tem Fita LED */}
                    <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        {...register(`moveis.${index}.temFitaLed`)}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-medium">Tem Fita LED?</span>
                    </label>
                  </div>

                  {/* Campos Condicionais - Puxador */}
                  {movel?.temPuxador && (
                    <div className="grid grid-cols-2 gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Puxador *
                        </label>
                        <select
                          {...register(`moveis.${index}.tipoPuxador`)}
                          className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none transition bg-white"
                        >
                          <option value="">Selecione</option>
                          {tipoPuxadorOptions.map((tipo) => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Detalhes do Puxador *
                        </label>
                        <input
                          type="text"
                          {...register(`moveis.${index}.detalhesPuxador`)}
                          className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none transition"
                          placeholder="Ex: Preto Fosco, 128mm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campos Condicionais - Corrediças */}
                  {movel?.temCorredicas && (
                    <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Corrediça *
                        </label>
                        <select
                          {...register(`moveis.${index}.tipoCorredica`)}
                          className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none transition bg-white"
                        >
                          <option value="">Selecione</option>
                          {tipoCorredicas.map((tipo) => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Para qual finalidade/gaveta? *
                        </label>
                        <input
                          type="text"
                          {...register(`moveis.${index}.finalidadeCorredica`)}
                          className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-500 outline-none transition"
                          placeholder="Ex: Gaveta de talheres, Gaveta de panelas"
                        />
                      </div>
                    </div>
                  )}

                  {/* Campos Condicionais - Báscula */}
                  {movel?.temBascula && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Báscula *
                      </label>
                      <select
                        {...register(`moveis.${index}.tipoBascula`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition bg-white"
                      >
                        <option value="">Selecione</option>
                        <option value="comum">Comum</option>
                        <option value="inversa">Inversa</option>
                      </select>
                    </div>
                  )}

                  {/* Campos Condicionais - Porta de Vidro */}
                  {movel?.temPortaVidro && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Porta de Vidro *
                      </label>
                      <select
                        {...register(`moveis.${index}.tipoPortaVidro`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-yellow-500 outline-none transition bg-white"
                      >
                        <option value="">Selecione</option>
                        {tipoPortaVidroOptions.map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Campos Condicionais - Fita LED */}
                  {movel?.temFitaLed && (
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Fita LED *
                      </label>
                      <select
                        {...register(`moveis.${index}.tipoFitaLed`)}
                        className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-indigo-500 outline-none transition bg-white"
                      >
                        <option value="">Selecione</option>
                        {tipoFitaLedOptions.map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Observações do Móvel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações do Móvel
                    </label>
                    <textarea
                      {...register(`moveis.${index}.observacoesMovel`)}
                      rows={3}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 outline-none transition resize-none"
                      placeholder="Observações específicas deste móvel..."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {errors.moveis && typeof errors.moveis === 'object' && 'message' in errors.moveis && (
          <p className="text-red-500 text-sm mt-2">{errors.moveis.message as string}</p>
        )}
      </div>

      {/* Especificações do Ambiente (NOVO) */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Building2 className="w-6 h-6" />
          Especificações do Ambiente
        </h3>

        <div className="space-y-4">
          {/* Rodapé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rodapé (Material)
            </label>
            <input
              type="text"
              {...register('especificacoesAmbiente.rodape')}
              className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
              placeholder="Ex: Madeira, MDF, Gesso"
            />
          </div>

          {/* Campos Condicionais - Rodapé */}
          {especificacoes?.rodape && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura do Rodapé (mm)
                </label>
                <input
                  type="number"
                  {...register('especificacoesAmbiente.alturaRodape')}
                  className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profundidade do Rodapé (mm)
                </label>
                <input
                  type="number"
                  {...register('especificacoesAmbiente.profundidadeRodape')}
                  className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
                  placeholder="15"
                />
              </div>
            </div>
          )}

          {/* Tipo de Parede */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Parede
            </label>
            <input
              type="text"
              {...register('especificacoesAmbiente.tipoParede')}
              className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
              placeholder="Ex: Alvenaria, Drywall, Concreto"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition">
              <input
                type="checkbox"
                {...register('especificacoesAmbiente.tubulacoesParede')}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Tubulações na Parede?</span>
            </label>

            <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition">
              <input
                type="checkbox"
                {...register('especificacoesAmbiente.temEstacionamento')}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Tem Estacionamento?</span>
            </label>

            <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition">
              <input
                type="checkbox"
                {...register('especificacoesAmbiente.temElevador')}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium">Tem Elevador?</span>
            </label>
          </div>

          {/* Campos Condicionais - Tubulações */}
          {especificacoes?.tubulacoesParede && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indique o local exato *
              </label>
              <input
                type="text"
                {...register('especificacoesAmbiente.localTubulacao')}
                className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-orange-500 outline-none transition"
                placeholder="Ex: Parede esquerda, próximo à janela"
              />
            </div>
          )}

          {/* Campos Condicionais - Elevador */}
          {especificacoes?.temElevador && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altura do Elevador (mm) *
                </label>
                <input
                  type="number"
                  {...register('especificacoesAmbiente.alturaElevador')}
                  className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
                  placeholder="2100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profundidade do Elevador (mm) *
                </label>
                <input
                  type="number"
                  {...register('especificacoesAmbiente.profundidadeElevador')}
                  className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-green-500 outline-none transition"
                  placeholder="1400"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Eletrodomésticos com Modelos */}
      <div className="bg-white border-2 border-purple-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Zap className="w-6 h-6" />
          Eletrodomésticos a Embutir
        </h3>
        <div className="space-y-3">
          {eletrodomesticosOptions.map((eletro) => {
            const eletroSelecionado = eletrodomesticosSelecionados.find((e) => e.nome === eletro);
            const isChecked = !!eletroSelecionado;
            const index = eletrodomesticosSelecionados.findIndex((e) => e.nome === eletro);

            return (
              <div key={eletro} className="border-2 border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEletrodomestico(eletro)}
                    className="hidden"
                  />
                  <div className="flex-shrink-0">
                    {isChecked ? (
                      <CheckCircle2 className="w-8 h-8 text-purple-600" />
                    ) : (
                      <Circle className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <span className={`text-lg flex-1 ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {eletro}
                  </span>
                </label>

                {/* Input de Modelo (renderizado condicionalmente) */}
                {isChecked && index >= 0 && (
                  <div className="mt-3 ml-12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {eletro === 'Outros' ? 'Nome do Eletrodoméstico' : 'Qual o modelo?'}
                    </label>
                    <input
                      type="text"
                      {...register(`eletrodomesticos.${index}.modelo`)}
                      className="w-full h-10 px-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      placeholder={eletro === 'Outros' ? 'Ex: Purificador de Água' : 'Ex: Brastemp BRM56, Electrolux 80L'}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pontos Críticos */}
      <div className="bg-white border-2 border-orange-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <AlertCircle className="w-6 h-6" />
          Pontos Críticos
        </h3>
        <label className="block text-base font-medium text-gray-700 mb-3">
          Posição de Tomadas, Registros de Água e Gás
        </label>
        <textarea
          {...register('pontosCriticos')}
          rows={5}
          className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition resize-none"
          placeholder="Descreva a localização de tomadas, pontos de água, gás, etc..."
        />
        <p className="text-sm text-gray-500 mt-2">Campo opcional</p>
      </div>

      {/* Fotos do Ambiente e Anotações Manuais */}
      <div className="bg-white border-2 border-pink-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Camera className="w-6 h-6" />
          Fotos do ambiente e anotações manuais
        </h3>
        
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium mb-1">Clique para adicionar fotos</p>
            <p className="text-sm text-gray-500">Ou arraste e solte aqui (múltiplas fotos)</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFotosChange}
              className="hidden"
            />
          </div>
        </label>

        {/* Preview das Fotos */}
        {fotosPreview.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {fotosPreview.length} {fotosPreview.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {fotosPreview.map((foto, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                  <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto(index)}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mt-3">Campo opcional - As fotos serão enviadas para o Supabase Storage</p>
      </div>
    </div>
  );
}
