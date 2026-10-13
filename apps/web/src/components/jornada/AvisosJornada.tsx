import { useEffect, useRef, useState } from 'react';
import { CircleAlert, MessageCircle, Undo2, X } from 'lucide-react';
import { rotuloEtapa, type Etapa } from '@/lib/jornada/etapas';

export interface MovimentoPendente {
  /** Muda a cada movimento novo (reinicia a contagem) */
  chave: number;
  projetoId: string;
  nome: string;
  de: Etapa;
  para: Etapa;
  /** A etapa de destino manda WhatsApp ao cliente */
  avisa: boolean;
}

export const ESPERA_DESFAZER_MS = 5000;

/**
 * Toast "Movido para X · Desfazer". A gravação (e o aviso ao cliente) só
 * acontece quando a contagem acaba. A contagem pausa com o mouse em cima ou
 * com o foco dentro do toast, para dar tempo de ler e desfazer.
 */
function AvisoDesfazer({
  pendente,
  onExpirar,
  onDesfazer,
}: {
  pendente: MovimentoPendente;
  onExpirar: () => void;
  onDesfazer: () => void;
}) {
  const [restante, setRestante] = useState(ESPERA_DESFAZER_MS);
  const [pausado, setPausado] = useState(false);
  const expirar = useRef(onExpirar);
  expirar.current = onExpirar;

  useEffect(() => setRestante(ESPERA_DESFAZER_MS), [pendente.chave]);

  useEffect(() => {
    if (pausado) return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const agora = performance.now();
      const passou = agora - ultimo;
      ultimo = agora;
      setRestante((r) => Math.max(0, r - passou));
    }, 100);
    return () => window.clearInterval(id);
  }, [pausado, pendente.chave]);

  useEffect(() => {
    if (restante <= 0) expirar.current();
  }, [restante]);

  const segundos = Math.ceil(restante / 1000);

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPausado(false)}
      className="pointer-events-auto relative overflow-hidden rounded-lg border border-primor-line bg-primor-surface shadow-chapa-lg motion-safe:animate-[jornada-toast_240ms_cubic-bezier(0.2,0.7,0.2,1)]"
    >
      <div className="flex items-center gap-3 py-3 pl-4 pr-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-primor-secondary">
            <strong className="font-semibold">{pendente.nome}</strong> movido para{' '}
            <strong className="font-semibold">{rotuloEtapa(pendente.para)}</strong>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primor-muted">
            {pendente.avisa && <MessageCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primor-primary-ink" />}
            <span>
              {pendente.avisa ? 'O cliente será avisado pelo WhatsApp' : 'Grava'} em{' '}
              <span className="font-mono tabular" aria-hidden="true">
                {segundos}s
              </span>
              <span className="sr-only">5 segundos. Para desfazer, use o botão Desfazer ou Ctrl+Z.</span>
              {pausado && <span aria-hidden="true"> · pausado</span>}
            </span>
          </p>
        </div>
        <button type="button" onClick={onDesfazer} className="btn btn-sm shrink-0 bg-primor-realce text-primor-secondary hover:bg-primor-paper-deep">
          <Undo2 aria-hidden="true" className="h-4 w-4" />
          Desfazer
        </button>
      </div>
      {/* Trena que encolhe com o tempo restante */}
      <div aria-hidden="true" className="h-1 bg-primor-paper-deep motion-reduce:hidden">
        <div className="trena h-full" style={{ width: `${(restante / ESPERA_DESFAZER_MS) * 100}%` }} />
      </div>
    </div>
  );
}

function AvisoErro({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onFechar, 10_000);
    return () => window.clearTimeout(id);
  }, [mensagem, onFechar]);
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-lg border border-primor-erro/40 bg-primor-erro-bg py-3 pl-4 pr-2 text-sm text-primor-erro-ink shadow-chapa-lg">
      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">{mensagem}</p>
      <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="btn-icon -my-2 hover:bg-primor-surface/60">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Área de avisos no rodapé. As regiões aria-live ficam sempre montadas para o
 * leitor de tela anunciar o que entra nelas.
 */
export function AvisosJornada({
  pendente,
  erro,
  mensagem,
  onExpirar,
  onDesfazer,
  onFecharErro,
}: {
  pendente: MovimentoPendente | null;
  erro: string | null;
  /** Confirmações curtas, só para leitor de tela ("Registrado", "Desfeito") */
  mensagem: string;
  onExpirar: () => void;
  onDesfazer: () => void;
  onFecharErro: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[45] flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-[26rem]">
      <div role="alert" className="flex flex-col gap-2">
        {erro && <AvisoErro mensagem={erro} onFechar={onFecharErro} />}
      </div>
      <div aria-live="polite" className="flex flex-col gap-2">
        {pendente && (
          <AvisoDesfazer key={pendente.chave} pendente={pendente} onExpirar={onExpirar} onDesfazer={onDesfazer} />
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {mensagem}
      </p>
      <style>{`@keyframes jornada-toast { from { transform: translateY(12px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}
