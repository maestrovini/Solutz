import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, Bell, X, ShieldAlert, Sparkles, CreditCard, ArrowRight } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'status' | 'credit';
  title: string;
  description: string;
  duration?: number; // millisecond duration
  clientName?: string;
  oldValue?: string;
  newValue?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  requestPushPermission: () => Promise<boolean>;
  hasPushPermission: boolean;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasPushPermission, setHasPushPermission] = useState<boolean>(false);
  const [simulatedPushPermission, setSimulatedPushPermission] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPushPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window === 'undefined') return false;

    // Check if we are in an iframe (which usually blocks desktop push popups due to cross-origin sandboxing)
    const isInsideIframe = window.self !== window.top;

    if (!('Notification' in window)) {
      setSimulatedPushPermission(true);
      showToast({
        type: 'info',
        title: 'Alertas de Tela Ativos! 🖥️',
        description: 'Seu navegador atual não suporta notificações de sistema, mas o painel inteligente de alertas em tempo real do sistema (Toast) já está ativo!',
      });
      return true;
    }

    try {
      // In typical iframe runtimes, requesting permission directly throws an exception or defaults to denied
      const permission = await Promise.race([
        Notification.requestPermission(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
      ]);

      if (permission === 'granted') {
        setHasPushPermission(true);
        showToast({
          type: 'success',
          title: 'Notificações Push Ativas! 🔔',
          description: 'Você receberá avisos do sistema diretamente na sua Área de Trabalho e Central de Notificações.',
        });
        return true;
      } else {
        setSimulatedPushPermission(true);
        showToast({
          type: 'info',
          title: 'Alertas de Tela Ativos! ℹ️',
          description: 'As notificações nativas do sistema operacional estão desabilitadas, mas todos os alertas inteligentes do sistema já estão funcionando em tempo real.',
        });
        return true;
      }
    } catch (e) {
      console.warn('Notification permission request was rejected/blocked by iframe environment:', e);
      setSimulatedPushPermission(true);
      showToast({
        type: 'info',
        title: 'Alertas Ativados no Painel! ✨',
        description: 'As notificações do sistema de arquivos/área de trabalho estão bloqueadas pelo visualizador seguro do AI Studio (iframe). O sistema ativou os alertas flutuantes inteligentes em tempo real!',
      });
      return true;
    }
  };

  const showToast = (newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastWithId = { ...newToast, id, duration: newToast.duration ?? 5000 };
    
    setToasts((prev) => [...prev, toastWithId]);

    // Native Push Notification fallback if allowed and tab is background/foreground
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const desc = toastWithId.description || 
          (toastWithId.oldValue && toastWithId.newValue ? `${toastWithId.oldValue} ➔ ${toastWithId.newValue}` : '');
        new Notification(toastWithId.title, {
          body: desc,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Erro ao disparar notificação push nativa:', e);
      }
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ 
      toasts, 
      showToast, 
      removeToast, 
      requestPushPermission, 
      hasPushPermission: hasPushPermission || simulatedPushPermission 
    }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}

// Internal Toast Item Component to handle the timeout bar
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const duration = toast.duration || 5000;
  const startTime = useRef(Date.now());
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = 30; // smooth update every 30ms
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remainingProgress = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingProgress);

      if (elapsed >= duration) {
        onClose();
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onClose]);

  const getStyleAndIcon = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-500/20 shadow-emerald-100/40 text-emerald-900',
          progressColor: 'bg-emerald-500',
          icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-rose-50 border-rose-500/20 shadow-rose-100/40 text-rose-900',
          progressColor: 'bg-rose-500',
          icon: <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-500/20 shadow-amber-100/40 text-amber-900',
          progressColor: 'bg-amber-500',
          icon: <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        };
      case 'status':
        return {
          bg: 'bg-indigo-50 border-indigo-500/20 shadow-indigo-100/40 text-indigo-900',
          progressColor: 'bg-indigo-500',
          icon: <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0" />
        };
      case 'credit':
        return {
          bg: 'bg-black text-white border-white/10 shadow-black/30',
          progressColor: 'bg-[#d4af37]', // Gold color accent
          icon: <CreditCard className="w-5 h-5 text-[#d4af37] shrink-0" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-sky-50 border-sky-500/20 shadow-sky-100/40 text-sky-900',
          progressColor: 'bg-sky-500',
          icon: <Bell className="w-5 h-5 text-sky-600 shrink-0" />
        };
    }
  };

  const config = getStyleAndIcon();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={`relative w-full max-w-sm pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md ${config.bg}`}
      style={{ minHeight: '80px' }}
    >
      <div className="flex gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold tracking-tight leading-snug">
            {toast.title}
          </p>
          <p className="text-xs mt-1 text-black/60 dark:text-white/70 leading-relaxed font-medium">
            {toast.description}
          </p>
          
          {toast.clientName && (
            <div className="mt-2 text-[10px] uppercase tracking-wider font-bold opacity-40">
              Cliente: {toast.clientName}
            </div>
          )}

          {(toast.oldValue || toast.newValue) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md w-fit">
              <span className="font-semibold line-through opacity-50">{toast.oldValue || 'Nenhum'}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              <span className="font-bold text-indigo-600 dark:text-amber-300">{toast.newValue || 'Nenhum'}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors h-fit p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Disparar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
        <div 
          className={`h-full transition-all duration-30 ease-out ${config.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
