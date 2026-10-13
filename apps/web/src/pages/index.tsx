import { ChecklistWizard } from '@/components/checklist/ChecklistWizard';

export function NovaVisita() {
  return (
    <div>
      <header className="entrada mx-auto mb-8 max-w-4xl">
        <p className="etiqueta">Atendimento no local</p>
        <h1 className="titulo-pagina mt-2">Briefing · primeira visita</h1>
        <p className="mt-2 max-w-prose text-primor-muted">Preencha o formulário durante o atendimento ao cliente para captar todas as informações necessárias</p>
      </header>
      <ChecklistWizard />
    </div>
  );
}

export function Checklists() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Histórico</h1>
      <p className="text-gray-600">Em desenvolvimento...</p>
    </div>
  );
}

export { Configuracoes } from './Configuracoes';
