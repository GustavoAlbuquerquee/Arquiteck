import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-fade-in">
      <div className="bg-primor-secondary text-white rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-lg p-2 flex-shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Instalar Arquiteck</h3>
            <p className="text-sm text-white/80 mb-3">
              Instale o app no seu dispositivo para acesso rápido e uso offline
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-primor-primary text-white font-semibold py-2 px-4 rounded-lg hover:brightness-110 transition"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="bg-white/10 text-white font-semibold py-2 px-4 rounded-lg hover:bg-white/20 transition"
              >
                Agora não
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Fechar"
            className="text-white/80 hover:text-white transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
