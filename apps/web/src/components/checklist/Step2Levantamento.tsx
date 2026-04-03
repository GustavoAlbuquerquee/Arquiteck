import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { ChecklistFormData, eletrodomesticosOptions, tipoPuxadorOptions } from '@/schemas/checklistSchema';
import { Ruler, Zap, AlertCircle, Palette, CheckCircle2, Circle } from 'lucide-react';

interface Step2Props {
  register: UseFormRegister<ChecklistFormData>;
  watch: UseFormWatch<ChecklistFormData>;
  errors: FieldErrors<ChecklistFormData>;
}

export function Step2Levantamento({ register, watch, errors }: Step2Props) {
  const eletrodomesticosSelecionados = watch('eletrodomesticos') || [];

  const toggleEletrodomestico = (eletro: string) => {
    const current = eletrodomesticosSelecionados;
    return current.includes(eletro)
      ? current.filter((e) => e !== eletro)
      : [...current, eletro];
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Levantamento Técnico</h2>

      {/* Dimensões Principais */}
      <div className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Ruler className="w-6 h-6" />
          Dimensões Principais (em cm)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Largura (cm)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('dimensoes.largura')}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              placeholder="Ex: 300"
            />
            {errors.dimensoes?.largura && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensoes.largura.message}</p>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Altura (cm)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('dimensoes.altura')}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              placeholder="Ex: 280"
            />
            {errors.dimensoes?.altura && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensoes.altura.message}</p>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Profundidade (cm)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('dimensoes.profundidade')}
              className="w-full h-14 px-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              placeholder="Ex: 60"
            />
            {errors.dimensoes?.profundidade && (
              <p className="text-red-500 text-sm mt-1">{errors.dimensoes.profundidade.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Eletrodomésticos a Embutir */}
      <div className="bg-white border-2 border-purple-300 rounded-xl p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
          <Zap className="w-6 h-6" />
          Eletrodomésticos a Embutir
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {eletrodomesticosOptions.map((eletro) => {
            const isChecked = eletrodomesticosSelecionados.includes(eletro);
            return (
              <label
                key={eletro}
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all"
              >
                <input
                  type="checkbox"
                  value={eletro}
                  {...register('eletrodomesticos')}
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
    </div>
  );
}
