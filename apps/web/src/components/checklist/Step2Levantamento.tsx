import { UseFormRegister, UseFormWatch, FieldErrors, Control, useFieldArray } from 'react-hook-form';
import { ChecklistFormData, eletrodomesticosOptions, tipoPuxadorOptions } from '@/schemas/checklistSchema';
import { Ruler, Zap, AlertCircle, Palette, Plus, Trash2, Camera, CheckCircle2, Circle, Package } from 'lucide-react';
import { useState } from 'react';

interface Step2Props {
  register: UseFormRegister<ChecklistFormData>;
  watch: UseFormWatch<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
  control: Control<ChecklistFormData>;
}

export function Step2Levantamento({ register, watch, errors, control }: Step2Props) {
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
  const composicao = watch('composicaoProjeto');

  const handleAddMovel = () => {
    appendMovel({ nome: '', largura: '', altura: '', profundidade: '' });
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

    setFotosPreview(previews);
    // Atualizar o formulário com as fotos em Base64
    const currentFotos = watch('fotosAmbiente') || [];
    const novasFotos = [...currentFotos, ...fotosBase64];
    // Usar setValue do react-hook-form (será passado do componente pai)
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Levantamento Técnico</h2>

      {/* Móveis e Medidas Dinâmicas */}
      <div className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Ruler className="w-6 h-6" />
            Móveis e Medidas
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

        <div className="space-y-4">
          {moveisFields.map((field, index) => (
            <div key={field.id} className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-700">Móvel {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeMovel(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nome do Móvel */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Móvel
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

                {/* Largura */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Largura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`moveis.${index}.largura`)}
                    className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    placeholder="300"
                  />
                  {errors.moveis?.[index]?.largura && (
                    <p className="text-red-500 text-xs mt-1">{errors.moveis[index]?.largura?.message}</p>
                  )}
                </div>

                {/* Altura */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`moveis.${index}.altura`)}
                    className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    placeholder="280"
                  />
                  {errors.moveis?.[index]?.altura && (
                    <p className="text-red-500 text-xs mt-1">{errors.moveis[index]?.altura?.message}</p>
                  )}
                </div>

                {/* Profundidade */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profundidade (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`moveis.${index}.profundidade`)}
                    className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    placeholder="60"
                  />
                  {errors.moveis?.[index]?.profundidade && (
                    <p className="text-red-500 text-xs mt-1">{errors.moveis[index]?.profundidade?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {errors.moveis && typeof errors.moveis === 'object' && 'message' in errors.moveis && (
          <p className="text-red-500 text-sm mt-2">{errors.moveis.message as string}</p>
        )}
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
                      Qual o modelo?
                    </label>
                    <input
                      type="text"
                      {...register(`eletrodomesticos.${index}.modelo`)}
                      className="w-full h-10 px-3 text-base border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      placeholder="Ex: Brastemp BRM56, Electrolux 80L"
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

      {/* Preferência de Materiais */}
      <div className="bg-white border-2 border-green-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Palette className="w-6 h-6" />
          Preferência de Materiais
        </h3>
        
        <div className="space-y-4">
          {/* Cor/Padrão do MDF */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Cor/Padrão do MDF
            </label>
            <input
              type="text"
              {...register('preferenciaMateriais.corPadraoMdf')}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
              placeholder="Ex: Branco Cristal, Nogueira, Freijó"
            />
            {errors.preferenciaMateriais?.corPadraoMdf && (
              <p className="text-red-500 text-sm mt-1">{errors.preferenciaMateriais.corPadraoMdf.message}</p>
            )}
          </div>

          {/* Tipo de Puxador */}
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Tipo de Puxador
            </label>
            <select
              {...register('preferenciaMateriais.tipoPuxador')}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition bg-white"
            >
              <option value="">Selecione o tipo de puxador</option>
              {tipoPuxadorOptions.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            {errors.preferenciaMateriais?.tipoPuxador && (
              <p className="text-red-500 text-sm mt-1">{errors.preferenciaMateriais.tipoPuxador.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Composição do Projeto */}
      <div className="bg-white border-2 border-indigo-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Package className="w-6 h-6" />
          Composição do Projeto
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Terá Corrediças */}
          <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <input
              type="checkbox"
              {...register('composicaoProjeto.teraCorredicas')}
              className="hidden"
            />
            <div className="flex-shrink-0">
              {composicao?.teraCorredicas ? (
                <CheckCircle2 className="w-8 h-8 text-indigo-600" />
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <span className={`text-lg ${composicao?.teraCorredicas ? 'font-medium' : ''}`}>
              Terá Corrediças?
            </span>
          </label>

          {/* Terá Gavetas */}
          <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <input
              type="checkbox"
              {...register('composicaoProjeto.teraGavetas')}
              className="hidden"
            />
            <div className="flex-shrink-0">
              {composicao?.teraGavetas ? (
                <CheckCircle2 className="w-8 h-8 text-indigo-600" />
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <span className={`text-lg ${composicao?.teraGavetas ? 'font-medium' : ''}`}>
              Terá Gavetas?
            </span>
          </label>

          {/* Terá Portas */}
          <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <input
              type="checkbox"
              {...register('composicaoProjeto.teraPortas')}
              className="hidden"
            />
            <div className="flex-shrink-0">
              {composicao?.teraPortas ? (
                <CheckCircle2 className="w-8 h-8 text-indigo-600" />
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <span className={`text-lg ${composicao?.teraPortas ? 'font-medium' : ''}`}>
              Terá Portas?
            </span>
          </label>

          {/* Terá Fita de LED */}
          <label className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <input
              type="checkbox"
              {...register('composicaoProjeto.teraFitaLed')}
              className="hidden"
            />
            <div className="flex-shrink-0">
              {composicao?.teraFitaLed ? (
                <CheckCircle2 className="w-8 h-8 text-indigo-600" />
              ) : (
                <Circle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <span className={`text-lg ${composicao?.teraFitaLed ? 'font-medium' : ''}`}>
              Terá Fita de LED?
            </span>
          </label>
        </div>
      </div>

      {/* Fotos do Ambiente */}
      <div className="bg-white border-2 border-pink-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Camera className="w-6 h-6" />
          Fotos do Ambiente
        </h3>
        
        <label className="block">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium mb-1">Clique para adicionar fotos</p>
            <p className="text-sm text-gray-500">Ou arraste e solte aqui</p>
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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {fotosPreview.map((foto, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500 mt-3">Campo opcional - As fotos serão salvas no formato Base64</p>
      </div>
    </div>
  );
}
