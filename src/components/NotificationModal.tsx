import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ShieldAlert, CheckCircle, Smartphone, HelpCircle, Send, Loader2, Globe } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const isPushSupported = notificationService.isSupported();
      setSupported(isPushSupported);

      if (isPushSupported) {
        setPermission(Notification.permission);
        notificationService.checkSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      }
    }
  }, [isOpen]);

  const handleToggleSubscription = async () => {
    if (!user) {
      showToast({
        type: 'error',
        title: 'Acesso Negado',
        description: 'Você precisa estar logado para configurar notificações.'
      });
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await notificationService.unsubscribeUser(user.uid);
        setIsSubscribed(false);
        showToast({
          type: 'info',
          title: 'Notificações Desativadas',
          description: 'Este navegador não receberá mais notificações deste sistema.'
        });
      } else {
        await notificationService.subscribeUser(user.uid);
        setIsSubscribed(true);
        setPermission(Notification.permission);
        showToast({
          type: 'success',
          title: 'Notificações Ativadas! 🎉',
          description: 'Seu navegador foi configurado para receber notificações em segundo plano.'
        });
      }
    } catch (err: any) {
      console.error(err);
      setPermission(Notification.permission);
      showToast({
        type: 'error',
        title: 'Erro de Permissão',
        description: err.message || 'Falha ao processar assinatura de notificações.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPush = async () => {
    if (!user) return;
    setTesting(true);
    showToast({
      type: 'info',
      title: 'Teste Agendado 🚀',
      description: 'Enviando em 3 segundos. Bloqueie a tela ou mude de aba para simular segundo plano!'
    });

    try {
      const activeSub = await notificationService.checkSubscription();
      if (!activeSub) {
        showToast({
          type: 'error',
          title: 'Não Inscrito',
          description: 'Ative as notificações push primeiro para realizar o teste.'
        });
        setTesting(false);
        return;
      }

      // Simulate network / processing delay (3s) to let the user close/minimize window
      setTimeout(async () => {
        try {
          const response = await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription: activeSub,
              title: 'Solutz - Teste de Notificação 🎉',
              body: 'A integração Push com Service Worker está ativa e funcionando perfeitamente em segundo plano!',
              url: '/'
            })
          });

          if (!response.ok) {
            throw new Error('Falha no envio do push de teste.');
          }
        } catch (e: any) {
          console.error(e);
        } finally {
          setTesting(false);
        }
      }, 3000);

    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Falha no Teste',
        description: 'Não foi possível disparar a notificação push de teste.'
      });
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal content body */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col z-[130]"
        >
          {/* Header */}
          <div className="bg-black text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl border border-white/5">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg leading-tight">Configurar Notificações</h3>
                <p className="text-[10px] text-white/60 tracking-wider uppercase font-semibold">Central Push / Service Worker</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/10 transition-all text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {!supported ? (
              <div className="space-y-4">
                <div className="bg-[#fcfbf7] border border-amber-200 text-amber-900 p-5 rounded-3xl flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <h4 className="font-bold text-sm">Restrição de Ambiente ou Iframe</h4>
                  </div>
                  <p className="text-xs text-[#1a1a1a]/70 leading-relaxed">
                    Você está visualizando o app dentro do <b>iframe de testes</b> da plataforma. O navegador bloqueia o registro de <b>Service Workers</b> e <b>Web Push</b> por segurança quando o site está aninhado em outra página de terceiros.
                  </p>
                  <p className="text-xs text-[#1a1a1a]/70 font-semibold leading-relaxed border-t border-amber-100 pt-2 shrink-0">
                    💡 Para corrigir e ativar notificações Push, basta abrir a aplicação diretamente em uma <b>nova aba do seu navegador</b>!
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    window.open(window.location.href, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 font-bold text-xs py-3.5 px-4 bg-black text-white hover:bg-black/95 rounded-2xl shadow-md transition-all active:scale-[0.98]"
                >
                  <Globe className="w-4 h-4" />
                  <span>Abrir em Nova Aba</span>
                </button>
              </div>
            ) : (
              <>
                {/* Permission Status bar */}
                <div className="bg-[#f5f5f0] border border-black/5 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Permissão do Navegador</p>
                    <p className="font-sans font-bold text-sm mt-0.5 capitalize">
                      {permission === 'granted' ? 'Permitido ✅' : permission === 'denied' ? 'Bloqueado ❌' : 'Não Solicitado ⏳'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Assinatura Ativa</p>
                    <p className="font-sans font-bold text-sm mt-0.5 text-black/80">
                      {isSubscribed ? 'Sim' : 'Não'}
                    </p>
                  </div>
                </div>

                {/* Subscribing controller toggler */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-black/40 uppercase tracking-wider">Ativar Recebimento</h4>
                  <p className="text-xs text-black/60 leading-relaxed">
                    Ative as notificações push para se manter atualizado sobre aprovações de crédito e andamento de processos de clientes em tempo real, mesmo se a aba estiver fechada ou o celular bloqueado!
                  </p>
                  
                  <button
                    onClick={handleToggleSubscription}
                    disabled={loading}
                    className={`w-full relative flex items-center justify-center gap-2 font-bold text-xs py-3.5 px-4 rounded-2xl transition-all ${
                      isSubscribed
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-black text-white hover:bg-black/90 active:scale-[0.98]'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando Assinatura...</span>
                      </>
                    ) : isSubscribed ? (
                      <span>Desativar Notificações neste Dispositivo</span>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 animate-bounce" />
                        <span>Permitir Notificações Push</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live testing controller */}
                {isSubscribed && (
                  <div className="p-4 rounded-2xl border border-black/10 bg-black/[0.02]/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-black/60" />
                      <h4 className="text-xs font-bold text-black/80">Testar em Segundo Plano</h4>
                    </div>
                    <p className="text-xs text-black/60">
                      Envie uma notificação de simulação para este dispositivo para validar o Service Worker.
                    </p>
                    <button
                      onClick={handleTestPush}
                      disabled={testing}
                      className="w-full flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-4 rounded-xl border border-black bg-white text-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
                    >
                      {testing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Aguarde 3 segundos...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Simular Notificação Push</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Helpful tips */}
                <div className="space-y-2 border-t border-black/5 pt-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-black/40 tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Dicas importantes</span>
                  </div>
                  <ul className="text-[11px] text-black/50 list-disc list-inside space-y-1">
                    <li>Se persistir o erro, redefina a preferência clicando no cadeado ao lado do domínio na barra de endereço.</li>
                    <li>Notificações em aparelhos <b>iOS</b> (iPhone/iPad) requerem que o site seja adicionado à <b>Tela Inicial</b> (Compartilhar &gt; Adicionar à Tela de Início) para que as configurações push ativem.</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#f5f5f0] p-4 border-t border-black/5 flex items-center justify-between text-[10px] text-black/30 font-bold uppercase tracking-widest">
            <span>Solutz Sistemas</span>
            <span>Versão sw v1.0</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
