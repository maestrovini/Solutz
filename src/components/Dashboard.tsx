import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Process, Agency, Broker, Bank, Participant } from '../types';
import { resolveParticipantName } from '../utils/participantUtils';
import { Users, Building2, User, ChevronDown, ChevronUp, Trophy, TrendingUp, Award, BarChart3, Star, Layers, Landmark, X, Cake, CalendarDays, AlertCircle, Bell, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

interface DashboardProps {
  onOpenProcess?: (id: string) => void;
}

export default function Dashboard({ onOpenProcess }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [concludeConfirm, setConcludeConfirm] = useState<{ processId: string, notificationId: string } | null>(null);
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Dashboard Solutz');
    setActions(null);
  }, []);

  useEffect(() => {
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients(data as Client[]);
    });
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks(data as Bank[]);
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers(data as Broker[]);
      if (loading) setLoading(false);
    });

    return () => {
      unsubClients();
      unsubProcesses();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
    };
  }, [loading]);

  const getBirthdaysOfMonth = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    
    const clientBirthdays = clients
      .filter(c => {
        if (!c.birthDate) return false;
        const [y, m, d] = c.birthDate.split('-');
        return (parseInt(m) - 1) === currentMonth;
      })
      .map(c => ({ name: c.name, date: c.birthDate!, type: 'Cliente' as const }));

    const brokerBirthdays = brokers
      .filter(b => {
        if (!b.birthDate) return false;
        const [y, m, d] = b.birthDate.split('-');
        return (parseInt(m) - 1) === currentMonth;
      })
      .map(b => ({ name: b.name, date: b.birthDate!, type: 'Corretor' as const }));

    return [...clientBirthdays, ...brokerBirthdays].sort((a, b) => {
      const dayA = parseInt(a.date.split('-')[2]);
      const dayB = parseInt(b.date.split('-')[2]);
      return dayA - dayB;
    });
  };

  const getCategorizedNotifications = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const categorized: {
      hoje: { processId: string, notificationId: string, clientName: string, reason: string, date: string }[],
      futuras: { processId: string, notificationId: string, clientName: string, reason: string, date: string }[],
      pendentes: { processId: string, notificationId: string, clientName: string, reason: string, date: string }[]
    } = { hoje: [], futuras: [], pendentes: [] };

    processes.forEach(p => {
      if (p.notifications) {
        p.notifications.forEach(n => {
          if (!n.completed) {
            const buyers = p.participants?.filter(part => part.type === 'buyer').map(part => resolveParticipantName(part, clients, brokers, agencies)).join(', ');
            const client = clients.find(c => c.id === p.clientId);
            const clientName = buyers || client?.name || 'Cliente Desconhecido';

            const notification = {
              processId: p.id!,
              notificationId: n.id,
              clientName,
              reason: n.reason,
              date: n.date
            };

            if (n.date === today) {
              categorized.hoje.push(notification);
            } else if (n.date > today) {
              categorized.futuras.push(notification);
            } else {
              categorized.pendentes.push(notification);
            }
          }
        });
      }
    });

    return categorized;
  };

  const handleConcludeNotification = async (processId: string, notificationId: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process || !process.notifications) return;

    const updatedNotifications = process.notifications.map(n => 
      n.id === notificationId ? { ...n, completed: true } : n
    );

    try {
      await api.update('processes', processId, {
        notifications: updatedNotifications
      });
    } catch (error) {
      console.error('Erro ao concluir notificação:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const birthdays = getBirthdaysOfMonth();
  const { hoje, futuras, pendentes } = getCategorizedNotifications();
  const allNotifications = [...pendentes, ...hoje, ...futuras];

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Notifications Section */}
      {allNotifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Notificações</h2>
              <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">Acompanhamento de processos</p>
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allNotifications.map((n) => {
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isToday = n.date === today;
                const isPending = n.date < today;
                const isFuture = n.date > today;

                return (
                  <div 
                    key={`${n.processId}-${n.notificationId}`}
                    className={cn(
                      "p-3 rounded-xl border shadow-sm flex flex-col gap-2 text-left transition-all group relative",
                      isToday ? "bg-amber-50 border-amber-200" :
                      isPending ? "bg-red-50 border-red-200" :
                      "bg-green-50 border-green-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button 
                          onClick={() => onOpenProcess?.(n.processId)}
                          className="flex items-center gap-2 text-left hover:opacity-70 transition-opacity mb-1 w-full"
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                            isToday ? "bg-amber-100 group-hover:bg-amber-200" :
                            isPending ? "bg-red-100 group-hover:bg-red-200" :
                            "bg-green-100 group-hover:bg-green-200"
                          )}>
                            <AlertCircle className={cn(
                              "w-3 h-3",
                              isToday ? "text-amber-600" :
                              isPending ? "text-red-600" :
                              "text-green-600"
                            )} />
                          </div>
                          <p className={cn(
                            "text-xs font-bold truncate",
                            isToday ? "text-amber-900" :
                            isPending ? "text-red-900" :
                            "text-green-900"
                          )}>{n.clientName}</p>
                        </button>
                        <p className={cn(
                          "text-[11px] leading-tight line-clamp-2",
                          isToday ? "text-amber-800/70" :
                          isPending ? "text-red-800/70" :
                          "text-green-800/70"
                        )}>{n.reason}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                          isToday ? "bg-amber-100 text-amber-600" :
                          isPending ? "bg-red-100 text-red-600" :
                          "bg-green-100 text-green-600"
                        )}>
                          {isToday ? 'Hoje' : formatDate(n.date)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConcludeConfirm({ processId: n.processId, notificationId: n.notificationId });
                          }}
                          className={cn(
                            "p-1 rounded-full transition-colors",
                            isToday ? "hover:bg-amber-200 text-amber-600" :
                            isPending ? "hover:bg-red-200 text-red-600" :
                            "hover:bg-green-200 text-green-600"
                          )}
                          title="Concluir"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {concludeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-black/10 p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Concluir Notificação?</h3>
              <p className="text-sm text-black/40 mb-8">
                Esta notificação será removida do seu Dashboard. Você confirma a conclusão?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConcludeConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleConcludeNotification(concludeConfirm.processId, concludeConfirm.notificationId);
                    setConcludeConfirm(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-full font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Birthdays Section */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 border border-pink-500/20">
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Aniversariantes do Mês</h2>
            <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">Celebre com seus parceiros</p>
          </div>
        </div>

        {birthdays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {birthdays.map((b, i) => {
              const day = parseInt(b.date.split('-')[2]);
              const isToday = day === new Date().getDate();

              return (
                <motion.div
                  key={`${b.name}-${b.date}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-3 rounded-xl border flex items-center gap-3 transition-all",
                    isToday 
                      ? "bg-pink-50 border-pink-200 shadow-md ring-2 ring-pink-500/20" 
                      : "bg-[#f5f5f0]/50 border-black/5 hover:border-black/10"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border",
                    isToday ? "bg-pink-500 text-white border-pink-400" : "bg-white text-[#1a1a1a] border-black/5"
                  )}>
                    <span className="text-base font-bold leading-none">{day}</span>
                    <span className="text-[7px] font-bold uppercase tracking-tighter opacity-60">MAR</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1a1a1a] truncate leading-tight">{b.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={cn(
                        "text-[8px] font-bold uppercase px-1 py-0.5 rounded",
                        b.type === 'Cliente' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {b.type}
                      </span>
                      {isToday && (
                        <span className="text-[8px] font-bold text-pink-500 animate-pulse">HOJE!</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#f5f5f0]/30 rounded-2xl border border-dashed border-black/10">
            <CalendarDays className="w-10 h-10 text-black/10 mx-auto mb-2" />
            <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Nenhum aniversariante</p>
          </div>
        )}
      </div>
    </div>
  );
}
