import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X, CheckCircle2, Share, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'sidebar-item' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone app, hide
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar-item' ? (
        <button
          onClick={handleAction}
          type="button"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium text-sm text-left group ${className}`}
          title="Instalar Solutz no celular ou computador"
        >
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs leading-none text-white">Instalar App</p>
            <p className="text-[10px] text-white/50 mt-1 truncate">Xiaomi, Android e iPhone</p>
          </div>
        </button>
      ) : (
        <button
          onClick={handleAction}
          type="button"
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1a1a] text-white text-xs font-semibold shadow-sm hover:bg-black transition-all active:scale-95 border border-white/10 ${className}`}
          title="Instalar Solutz no celular"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar App</span>
        </button>
      )}

      {/* Guide Modal for Android (Xiaomi / Samsung) & iOS Safari */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl border border-black/10 text-left relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center p-2 shadow-md">
                    <img src="/pwa-192x192.png" alt="Solutz" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-[#1a1a1a] leading-tight">Instalar Solutz</h3>
                    <p className="text-xs text-black/50 font-medium">Na tela inicial do seu celular</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isInstallable ? (
                <div className="space-y-4 py-2">
                  <p className="text-xs text-black/70 leading-relaxed">
                    O aplicativo está pronto para ser instalado com 1 toque no seu dispositivo.
                  </p>
                  <button
                    onClick={async () => {
                      await install();
                      setShowGuideModal(false);
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-black text-white font-bold text-sm shadow-lg hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Confirmar Instalação
                  </button>
                </div>
              ) : isIOS ? (
                <div className="space-y-3 py-1">
                  <div className="p-3 bg-[#f5f5f0] rounded-2xl space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-xs text-black/80">
                        No <strong>Safari</strong> do iPhone, toque no botão de <strong className="inline-flex items-center gap-1 font-bold">Compartilhar <Share className="w-3.5 h-3.5 inline" /></strong> na barra inferior.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-xs text-black/80">
                        Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-xs text-black/80">
                        Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Android / Xiaomi MIUI flow */
                <div className="space-y-3 py-1">
                  <div className="p-3 bg-[#f5f5f0] rounded-2xl space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <p className="text-xs text-black/80">
                        Toque no menu de <strong>três pontos <MoreVertical className="w-3.5 h-3.5 inline text-black" /></strong> no canto superior direito do seu navegador (Google Chrome ou Navegador Xiaomi).
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <p className="text-xs text-black/80">
                        Toque na opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        3
                      </div>
                      <p className="text-xs text-black/80">
                        O ícone oficial do <strong>Solutz</strong> será adicionado à sua tela de início sem erro de formato!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-black/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-black/60 hover:text-black hover:bg-black/5 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
