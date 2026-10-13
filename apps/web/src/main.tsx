import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Aplica a preferência de tema e passa a acompanhar o sistema (ver index.html)
import './lib/tema';
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível! Deseja atualizar?')) {
      updateSW(true);
    }
  },
});

const root = createRoot(document.getElementById('root')!);

// Sem as variáveis do Supabase o cliente lança erro ao ser importado e a tela fica em branco
const missingEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
  (key) => !import.meta.env[key],
);

if (missingEnv.length > 0) {
  root.render(
    <div className="min-h-screen flex items-center justify-center bg-primor-bg-light p-4">
      <div className="max-w-md bg-primor-surface rounded-xl shadow p-6 text-primor-secondary">
        <h1 className="text-xl font-bold mb-2">Configuração incompleta</h1>
        <p className="text-sm mb-3">
          Defina as variáveis abaixo em <code>apps/web/.env</code> (veja <code>.env.example</code>) e
          reinicie o servidor:
        </p>
        <ul className="text-sm font-mono list-disc pl-5">
          {missingEnv.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </div>,
  );
} else {
  // Limpa o cache antigo de respostas da API (ver clearApiCache)
  if ('caches' in window) caches.delete('supabase-cache').catch(() => {});

  import('./App.tsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}
