import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Process, Agency, Broker, Bank } from '../types';
import { Users, Building2, User, ChevronDown, ChevronUp, Trophy, TrendingUp, Award, BarChart3, Star, Layers, Landmark, X, Cake, CalendarDays, AlertCircle, Bell } from 'lucide-react';
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
  const [activeView, setActiveView] = useState<'agencies' | 'brokers' | 'stages' | 'banks' | null>(null);
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Dashboard Solutz');
    setActions(null);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getData();
        setClients(data.clients || []);
        setProcesses(data.processes || []);
        setBanks(data.banks || []);
        setAgencies(data.agencies || []);
        setBrokers(data.brokers || []);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: 'Clientes', value: clients.length, icon: Users, color: 'bg-blue-500' },
  ];

  const interactiveStats = [
    { 
      label: 'Imobiliárias', 
      value: agencies.length, 
      icon: Building2, 
      color: 'bg-black', 
      isExpanded: activeView === 'agencies', 
      toggle: () => setActiveView(activeView === 'agencies' ? null : 'agencies')
    },
    { 
      label: 'Corretores', 
      value: brokers.length, 
      icon: User, 
      color: 'bg-amber-500', 
      isExpanded: activeView === 'brokers', 
      toggle: () => setActiveView(activeView === 'brokers' ? null : 'brokers')
    },
    { 
      label: 'Etapas', 
      value: processes.length, 
      icon: Layers, 
      color: 'bg-emerald-500', 
      isExpanded: activeView === 'stages', 
      toggle: () => setActiveView(activeView === 'stages' ? null : 'stages')
    },
    { 
      label: 'Bancos', 
      value: banks.length, 
      icon: Landmark, 
      color: 'bg-indigo-500', 
      isExpanded: activeView === 'banks', 
      toggle: () => setActiveView(activeView === 'banks' ? null : 'banks')
    },
  ];

  const stages = ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'];
  
  const stageConfig: Record<string, { color: string }> = {
    'Aprovado': { color: '#3b82f6' },
    'Vistoria': { color: '#f59e0b' },
    'Contrato': { color: '#8b5cf6' },
    'Registro': { color: '#f97316' },
    'Finalizado': { color: '#1a1a1a' },
  };

  const getStageStats = (stage: string) => {
    const stageProcesses = processes.filter(p => p.stage === stage);
    const totalFinancing = stageProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
    return {
      count: stageProcesses.length,
      totalFinancing
    };
  };

  const getBankStats = (bankId: string) => {
    const bankProcesses = processes.filter(p => p.bankId === bankId);
    const totalFinancing = bankProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
    return {
      count: bankProcesses.length,
      totalFinancing
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTopPerformers = () => {
    const agencyStats = agencies.map(agency => {
      const agencyProcesses = processes.filter(p => 
        p.participants?.some(part => part.type === 'agency' && part.id === agency.id)
      );
      const count = agencyProcesses.length;
      const totalFinancing = agencyProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
      return { name: agency.name, count, totalFinancing };
    });

    const brokerStats = brokers.map(broker => {
      const brokerProcesses = processes.filter(p => 
        p.participants?.some(part => part.type === 'broker' && part.id === broker.id)
      );
      const count = brokerProcesses.length;
      const totalFinancing = brokerProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
      return { name: broker.name, count, totalFinancing };
    });

    const topAgencyByCount = [...agencyStats].sort((a, b) => b.count - a.count)[0];
    const topAgencyByVolume = [...agencyStats].sort((a, b) => b.totalFinancing - a.totalFinancing)[0];
    const topBrokerByCount = [...brokerStats].sort((a, b) => b.count - a.count)[0];
    const topBrokerByVolume = [...brokerStats].sort((a, b) => b.totalFinancing - a.totalFinancing)[0];

    return { topAgencyByCount, topAgencyByVolume, topBrokerByCount, topBrokerByVolume };
  };

  const getBirthdaysOfMonth = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    
    const clientBirthdays = clients
      .filter(c => {
        if (!c.birthDate) return false;
        const birthDate = new Date(c.birthDate);
        return birthDate.getMonth() === currentMonth;
      })
      .map(c => ({ name: c.name, date: c.birthDate!, type: 'Cliente' as const }));

    const brokerBirthdays = brokers
      .filter(b => {
        if (!b.birthDate) return false;
        const birthDate = new Date(b.birthDate);
        return birthDate.getMonth() === currentMonth;
      })
      .map(b => ({ name: b.name, date: b.birthDate!, type: 'Corretor' as const }));

    return [...clientBirthdays, ...brokerBirthdays].sort((a, b) => {
      const dayA = new Date(a.date).getDate();
      const dayB = new Date(b.date).getDate();
      return dayA - dayB;
    });
  };

  const getNotificationsToday = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayNotifications: { processId: string, clientName: string, reason: string, date: string }[] = [];

    processes.forEach(p => {
      if (p.notifications) {
        p.notifications.forEach(n => {
          if (n.date === today) {
            const client = clients.find(c => c.id === p.clientId);
            todayNotifications.push({
              processId: p.id!,
              clientName: client?.name || 'Cliente Desconhecido',
              reason: n.reason,
              date: n.date
            });
          }
        });
      }
    });

    return todayNotifications;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const { topAgencyByCount, topAgencyByVolume, topBrokerByCount, topBrokerByVolume } = getTopPerformers();
  const birthdays = getBirthdaysOfMonth();
  const todayNotifications = getNotificationsToday();

  return (
    <div className="space-y-6">
      {/* Notifications Section */}
      {todayNotifications.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 p-6 rounded-[24px] shadow-sm border border-amber-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-900 leading-none">Notificações de Hoje</h2>
              <p className="text-[10px] text-amber-700/60 uppercase tracking-wider mt-1">Lembretes agendados</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {todayNotifications.map((n, i) => (
              <button 
                key={i} 
                onClick={() => onOpenProcess?.(n.processId)}
                className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col gap-2 text-left hover:border-amber-300 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    </div>
                    <p className="text-xs font-bold text-amber-900 truncate max-w-[120px]">{n.clientName}</p>
                  </div>
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-md">Hoje</span>
                </div>
                <p className="text-[11px] text-amber-800/70 leading-tight line-clamp-2">{n.reason}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Stats Row */}
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-3 rounded-[20px] shadow-sm border border-black/5 flex flex-col items-center justify-center gap-1"
          >
            <div className={`${stat.color} w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-[#1a1a1a]">{stat.value}</p>
          </motion.div>
        ))}
        {interactiveStats.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.1 }}
            onClick={stat.toggle}
            className={cn(
              "p-3 rounded-[20px] shadow-sm border transition-all flex flex-col items-center justify-center gap-1 group",
              stat.isExpanded 
                ? "bg-black border-black text-white" 
                : "bg-white border-black/5 text-[#1a1a1a] hover:border-black/20"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shrink-0 transition-colors",
              stat.isExpanded ? "bg-white/20 text-white" : `${stat.color} text-white`
            )}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-center gap-1">
              <p className="text-lg font-bold">{stat.value}</p>
              {stat.isExpanded ? <ChevronUp className="w-3 h-3 opacity-40" /> : <ChevronDown className="w-3 h-3 opacity-40" />}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Overlay View */}
      <AnimatePresence>
        {activeView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#f5f5f5] flex flex-col"
          >
            {/* Content Area - Preserving original card styles */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-7xl mx-auto pt-12">
                {activeView === 'agencies' && (
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 relative">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Destaques Imobiliárias</h2>
                      <button 
                        onClick={() => setActiveView(null)}
                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-lg"
                        title="Fechar"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-y-0 md:gap-x-12">
                      {[
                        { title: 'Top Imobiliária (Qtd)', data: topAgencyByCount, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { title: 'Top Imobiliária (Vol)', data: topAgencyByVolume, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                      ].map((item, i) => (
                        <div key={item.title} className="relative flex items-center gap-4">
                          {i !== 0 && <div className="hidden md:block absolute -left-6 top-0 bottom-0 w-px bg-black/5" />}
                          <div className={`${item.bg} p-3 rounded-2xl shrink-0`}>
                            <item.icon className={`w-8 h-8 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-[#1a1a1a] truncate leading-tight" title={item.data?.name || 'N/A'}>
                              {item.data?.name || 'Sem dados'}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end shrink-0 text-right">
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${item.color} mb-1`}>{item.title}</span>
                            <span className="text-xs font-bold text-[#1a1a1a] leading-tight">{item.data?.count || 0} Processos</span>
                            <span className="text-xs font-bold text-[#1a1a1a] leading-tight mt-0.5">{formatCurrency(item.data?.totalFinancing || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeView === 'brokers' && (
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 relative">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Destaques Corretores</h2>
                      <button 
                        onClick={() => setActiveView(null)}
                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-lg"
                        title="Fechar"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 md:gap-y-0 md:gap-x-12">
                      {[
                        { title: 'Top Corretor (Qtd)', data: topBrokerByCount, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { title: 'Top Corretor (Vol)', data: topBrokerByVolume, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      ].map((item, i) => (
                        <div key={item.title} className="relative flex items-center gap-4">
                          {i !== 0 && <div className="hidden md:block absolute -left-6 top-0 bottom-0 w-px bg-black/5" />}
                          <div className={`${item.bg} p-3 rounded-2xl shrink-0`}>
                            <item.icon className={`w-8 h-8 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-[#1a1a1a] truncate leading-tight" title={item.data?.name || 'N/A'}>
                              {item.data?.name || 'Sem dados'}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end shrink-0 text-right">
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${item.color} mb-1`}>{item.title}</span>
                            <span className="text-xs font-bold text-[#1a1a1a] leading-tight">{item.data?.count || 0} Processos</span>
                            <span className="text-xs font-bold text-[#1a1a1a] leading-tight mt-0.5">{formatCurrency(item.data?.totalFinancing || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeView === 'stages' && (
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 relative">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Processos por Etapa</h2>
                      <button 
                        onClick={() => setActiveView(null)}
                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-lg"
                        title="Fechar"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-8 lg:gap-y-0 lg:gap-x-12">
                      {stages.map((stage, i) => {
                        const { count, totalFinancing } = getStageStats(stage);
                        return (
                          <div key={stage} className="relative flex flex-col space-y-3">
                            {i % 5 !== 0 && <div className="hidden lg:block absolute -left-6 top-0 bottom-0 w-px bg-black/5" />}
                            <div 
                              className="w-full py-1.5 rounded-lg text-white text-[9px] font-bold uppercase tracking-widest shadow-sm text-center"
                              style={{ backgroundColor: stageConfig[stage].color }}
                            >
                              {stage}
                            </div>
                            <div className="flex items-center justify-between gap-2 px-1">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-[#1a1a1a]">{count}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-black/40">Processos</span>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-[#1a1a1a] truncate">
                                  {formatCurrency(totalFinancing)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeView === 'banks' && (
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 relative">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Processos por Banco</h2>
                      <button 
                        onClick={() => setActiveView(null)}
                        className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-lg"
                        title="Fechar"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 lg:gap-y-0 lg:gap-x-12">
                      {banks.map((bank, i) => {
                        const { count, totalFinancing } = getBankStats(bank.id!);
                        return (
                          <div key={bank.id} className="relative flex flex-col space-y-3">
                            {i % 4 !== 0 && <div className="hidden lg:block absolute -left-6 top-0 bottom-0 w-px bg-black/5" />}
                            <div className="w-full py-1.5 rounded-lg text-white text-[9px] font-bold uppercase tracking-widest shadow-sm text-center bg-[#1a1a1a]">
                              {bank.name}
                            </div>
                            <div className="flex items-center justify-between gap-2 px-1">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-[#1a1a1a]">{count}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-black/40">Processos</span>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-[#1a1a1a] truncate">
                                  {formatCurrency(totalFinancing)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
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
              const date = new Date(b.date);
              const day = date.getDate();
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
