import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const dismissed = localStorage.getItem('acai_pwa_install_dismissed');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS and not dismissed and not in standalone mode, show banner after 2 seconds
    if (isIOSDevice && !dismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('acai_pwa_install_dismissed', 'true');
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  // If neither Android install prompt nor iOS device is detected, don't show
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto bg-gradient-to-r from-purple-900 via-purple-950 to-purple-900 border-2 border-purple-400/50 text-white rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-fade-in flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 border border-purple-300/40 shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
            <img src="/icon-192.png" alt="Açaí Delivery" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <span>Açaí Delivery</span>
              <span className="text-[10px] bg-purple-500/40 text-purple-200 px-1.5 py-0.5 rounded font-mono font-semibold">OFICIAL</span>
            </h4>
            <p className="text-[11px] text-purple-200/90 leading-tight">
              Instale o aplicativo na sua tela inicial!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-purple-950 to-purple-900 border border-purple-400/40 p-5 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-purple-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0">
                  <img src="/apple-touch-icon.png" alt="Açaí Delivery" className="w-full h-full object-contain rounded-md" />
                </div>
                <h3 className="font-bold text-sm text-white">Instalar no iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-purple-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-purple-100">
              <div className="flex items-start gap-2.5 bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 font-bold flex items-center justify-center shrink-0 text-white text-[11px]">
                  1
                </div>
                <p>
                  No Safari, toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima) na barra inferior.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 font-bold flex items-center justify-center shrink-0 text-white text-[11px]">
                  2
                </div>
                <p>
                  Role as opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 bg-purple-900/60 p-2.5 rounded-xl border border-purple-700/50">
                <div className="w-6 h-6 rounded-full bg-purple-600 font-bold flex items-center justify-center shrink-0 text-white text-[11px]">
                  3
                </div>
                <p>
                  Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone oficial do Açaí Delivery aparecerá na sua tela inicial!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                setShowBanner(false);
                localStorage.setItem('acai_pwa_install_dismissed', 'true');
              }}
              className="mt-5 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 font-bold text-xs py-2.5 rounded-xl shadow-md text-white transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
