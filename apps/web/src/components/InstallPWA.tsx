import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { VeioMadeira } from '@/components/marca/VeioMadeira';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    return !!dismissed && Date.now() - parseInt(dismissed) < SEVEN_DAYS;
  } catch {
    return false;
  }
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissedRecently()) setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    // Guardar no localStorage para não mostrar novamente por 7 dias
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Sem storage disponível o banner volta na próxima visita
    }
  };

  if (!showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Instalar o aplicativo"
      className="on-dark fixed bottom-4 left-4 right-4 z-modal animate-fade-in md:left-auto md:right-6 md:max-w-sm"
    >
      <div className="relative overflow-hidden rounded-lg bg-primor-secondary text-white shadow-chapa-lg">
        <VeioMadeira opacidade={0.1} />
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primor-primary" />
        <div className="relative flex items-start gap-3 py-4 pl-5 pr-2">
          <Download aria-hidden="true" strokeWidth={1.75} className="mt-0.5 h-6 w-6 flex-shrink-0 text-primor-primary" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold">Instalar o Arquiteck</h3>
            <p className="mb-3 mt-0.5 text-sm text-white/80">
              Instale o app no seu dispositivo para acesso rápido e uso offline
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleInstallClick} className="btn btn-primary btn-sm flex-1">
                Instalar
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="btn btn-sm text-white hover:bg-white/10"
              >
                Agora não
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar"
            className="btn-icon flex-shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
