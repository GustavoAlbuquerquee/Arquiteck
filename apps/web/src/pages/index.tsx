import { ChecklistWizard } from '@/components/checklist/ChecklistWizard';

export function NovaVisita() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Briefing - Primeira Visita</h1>
        <p className="text-gray-600 mt-2">Preencha o formulário durante o atendimento ao cliente para captar todas as informações necessárias</p>
      </div>
      <ChecklistWizard />
    </div>
  );
}

export function Checklists() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Checklists</h1>
      <p className="text-gray-600">Em desenvolvimento...</p>
    </div>
  );
}

export function Configuracoes() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      <p className="text-gray-600">Em desenvolvimento...</p>
    </div>
  );
}
