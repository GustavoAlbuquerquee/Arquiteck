import { useId, useRef, useState, type FormEvent } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { Dialogo } from './Dialogo';

/** Lead direto no board, sem passar pelo wizard de Nova Visita */
export function NovoContato({
  aberto,
  onFechar,
  onCriar,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriar: (dados: { nome: string; telefone: string; observacao: string }) => Promise<void>;
}) {
  const id = useId();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);

  const limpar = () => {
    setNome('');
    setTelefone('');
    setObservacao('');
    setErro(null);
    setTentou(false);
  };

  const fechar = () => {
    if (enviando) return;
    limpar();
    onFechar();
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setTentou(true);
    if (!nome.trim()) {
      nomeRef.current?.focus();
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await onCriar({ nome: nome.trim(), telefone: telefone.trim(), observacao: observacao.trim() });
      limpar();
    } catch (err) {
      console.error('Erro ao criar contato:', err);
      setErro('Não foi possível criar o contato. Confira a conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  const nomeInvalido = tentou && !nome.trim();

  return (
    <Dialogo aberto={aberto} onFechar={fechar} rotuloId={`${id}-titulo`} variante="centro" focoInicial={nomeRef}>
      <form onSubmit={enviar} noValidate className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primor-realce text-primor-primary-ink">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-titulo`} className="titulo-secao">
              Novo contato
            </h2>
            <p className="mt-0.5 text-sm text-primor-muted">
              Entra na etapa “Novo contato” com o relógio de resposta já contando.
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="btn-icon -mr-2 -mt-2 text-primor-secondary hover:bg-primor-paper-deep"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div aria-hidden="true" className="regua mt-5" />

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor={`${id}-nome`} className="field-label">
              Nome do cliente <span className="text-primor-erro">*</span>
            </label>
            <input
              ref={nomeRef}
              id={`${id}-nome`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="off"
              required
              maxLength={120}
              aria-invalid={nomeInvalido}
              aria-describedby={nomeInvalido ? `${id}-nome-erro` : undefined}
              className="field"
            />
            {nomeInvalido && (
              <p id={`${id}-nome-erro`} className="field-error">
                Informe o nome do cliente.
              </p>
            )}
          </div>
          <div>
            <label htmlFor={`${id}-tel`} className="field-label">
              Telefone / WhatsApp
            </label>
            <input
              id={`${id}-tel`}
              type="tel"
              inputMode="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              autoComplete="off"
              maxLength={30}
              placeholder="(11) 99999-0000"
              className="field"
            />
          </div>
          <div>
            <label htmlFor={`${id}-obs`} className="field-label">
              Observação
            </label>
            <textarea
              id={`${id}-obs`}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex.: quer cozinha e lavanderia, indicação da Ana"
              aria-describedby={`${id}-obs-dica`}
              className="field resize-y"
            />
            <p id={`${id}-obs-dica`} className="field-hint">
              Fica como anotação no histórico do card.
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="alerta alerta-erro mt-4">
            {erro}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={fechar} className="btn btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className="btn btn-primary">
            {enviando ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <UserPlus aria-hidden="true" className="h-4 w-4" />}
            Criar contato
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
