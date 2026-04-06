import React, { useState, useMemo, useEffect } from 'react';
import { 
  Filter, Download, 
  FileSpreadsheet, File as FilePdf,
  Users, Building2, User, Layers, Landmark,
  ChevronDown, ChevronUp, X, Trophy, TrendingUp, Award, BarChart3
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, subMonths, eachMonthOfInterval, startOfYear, endOfYear, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Process, Client, Bank, Broker, Agency } from '../types';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsManagerProps {
  processes: Process[];
  clients: Client[];
  banks: Bank[];
  brokers: Broker[];
  agencies: Agency[];
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  processes,
  clients,
  banks,
  brokers,
  agencies
}) => {
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedBroker, setSelectedBroker] = useState<string>('all');
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [excludeBank, setExcludeBank] = useState(false);
  const [excludeType, setExcludeType] = useState(false);
  const [excludeStage, setExcludeStage] = useState(false);
  const [excludeBroker, setExcludeBroker] = useState(false);
  const [excludeAgency, setExcludeAgency] = useState(false);
  const [excludePeriod, setExcludePeriod] = useState(false);
  const [periodType, setPeriodType] = useState<'month' | 'year' | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'agencies' | 'brokers' | 'stages' | 'banks' | null>(null);
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Relatórios e Estatísticas');
    setActions(null);
  }, []);

  // Available months and years from data
  const { availableMonths, availableYears } = useMemo(() => {
    const months = new Set<string>();
    const years = new Set<string>();
    processes.forEach(p => {
      const date = parseISO(p.updatedAt);
      months.add(format(date, 'yyyy-MM'));
      years.add(format(date, 'yyyy'));
    });
    return {
      availableMonths: Array.from(months).sort().reverse(),
      availableYears: Array.from(years).sort().reverse()
    };
  }, [processes]);

  // Filter processes based on period and other filters
  const filteredProcesses = useMemo(() => {
    let filtered = [...processes];
    
    if (periodType === 'month' && selectedMonth) {
      filtered = filtered.filter(p => {
        const date = parseISO(p.updatedAt);
        const matches = format(date, 'yyyy-MM') === selectedMonth;
        return excludePeriod ? !matches : matches;
      });
    } else if (periodType === 'year' && selectedYear) {
      filtered = filtered.filter(p => {
        const date = parseISO(p.updatedAt);
        const matches = format(date, 'yyyy') === selectedYear;
        return excludePeriod ? !matches : matches;
      });
    }

    if (selectedBank !== 'all') {
      filtered = filtered.filter(p => {
        const matches = selectedBank === 'none' ? !p.bankId : p.bankId === selectedBank;
        return excludeBank ? !matches : matches;
      });
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(p => {
        const matches = selectedType === 'none' ? !p.type : p.type === selectedType;
        return excludeType ? !matches : matches;
      });
    }

    if (selectedStage !== 'all') {
      filtered = filtered.filter(p => {
        const matches = selectedStage === 'none' ? !p.stage : p.stage === selectedStage;
        return excludeStage ? !matches : matches;
      });
    }

    if (selectedBroker !== 'all') {
      filtered = filtered.filter(p => {
        const matches = selectedBroker === 'none' ? !p.brokerId : p.brokerId === selectedBroker;
        return excludeBroker ? !matches : matches;
      });
    }

    if (selectedAgency !== 'all') {
      filtered = filtered.filter(p => {
        const broker = brokers.find(b => b.id === p.brokerId);
        const matches = selectedAgency === 'none' ? !broker?.agencyId : broker?.agencyId === selectedAgency;
        return excludeAgency ? !matches : matches;
      });
    }

    return filtered;
  }, [processes, periodType, selectedMonth, selectedYear, selectedBank, selectedType, selectedStage, selectedBroker, selectedAgency, brokers, excludeBank, excludeType, excludeStage, excludeBroker, excludeAgency, excludePeriod]);

  // Totals
  const totalValue = useMemo(() => {
    return filteredProcesses.reduce((acc, p) => acc + (p.financingValue || p.value || 0), 0);
  }, [filteredProcesses]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const stages = ['Aprovado', 'Vistoria', 'Análise', 'Contrato', 'Registro', 'Finalizado'];
  
  const stageConfig: Record<string, { color: string }> = {
    'Aprovado': { color: '#dcfce7' },
    'Vistoria': { color: '#bbf7d0' },
    'Análise': { color: '#86efac' },
    'Contrato': { color: '#4ade80' },
    'Registro': { color: '#22c55e' },
    'Finalizado': { color: '#16a34a' },
  };

  const getStageStats = (stage: string) => {
    const stageProcesses = filteredProcesses.filter(p => p.stage === stage);
    const totalFinancing = stageProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
    return {
      count: stageProcesses.length,
      totalFinancing
    };
  };

  const getBankStats = (bankId: string) => {
    const bankProcesses = filteredProcesses.filter(p => p.bankId === bankId);
    const totalFinancing = bankProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
    return {
      count: bankProcesses.length,
      totalFinancing
    };
  };

  const getTopPerformers = () => {
    const agencyStats = agencies.map(agency => {
      const agencyProcesses = filteredProcesses.filter(p => 
        p.participants?.some(part => part.type === 'agency' && part.id === agency.id)
      );
      const count = agencyProcesses.length;
      const totalFinancing = agencyProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
      return { name: agency.name, count, totalFinancing };
    });

    const brokerStats = brokers.map(broker => {
      const brokerProcesses = filteredProcesses.filter(p => 
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

  const { topAgencyByCount, topAgencyByVolume, topBrokerByCount, topBrokerByVolume } = getTopPerformers();

  const exportToCSV = () => {
    const headers = ['Data', 'Compradores', 'Vendedores', 'Tipo', 'Banco', 'Etapa', 'Valor Compra', 'Valor Financiado', 'Corretor', 'Imobiliária'];
    const rows = filteredProcesses.map(p => {
      const buyers = p.participants?.filter(part => part.type === 'buyer').map(part => part.name).join('; ') || 'N/A';
      const sellers = p.participants?.filter(part => part.type === 'seller').map(part => part.name).join('; ') || 'N/A';
      const bank = banks.find(b => b.id === p.bankId);
      const broker = brokers.find(b => b.id === p.brokerId);
      const agency = agencies.find(a => a.id === broker?.agencyId);
      
      return [
        format(parseISO(p.updatedAt), 'dd/MM/yyyy'),
        buyers,
        sellers,
        p.type,
        bank?.name || 'N/A',
        p.stage,
        p.purchaseValue || 0,
        p.financingValue || 0,
        broker?.name || 'N/A',
        agency?.name || 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_processos_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Processos', 14, 22);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    
    // Summary Stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumo Geral', 14, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Processos', filteredProcesses.length.toString()],
        ['Volume Total', formatCurrency(totalValue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 26] }
    });

    // Process List
    doc.addPage();
    doc.text('Lista de Processos', 14, 22);
    
    const processRows = filteredProcesses.map(p => {
      const buyers = p.participants?.filter(part => part.type === 'buyer').map(part => part.name).join(', ') || 'N/A';
      const sellers = p.participants?.filter(part => part.type === 'seller').map(part => part.name).join(', ') || 'N/A';
      const bank = banks.find(b => b.id === p.bankId);
      const broker = brokers.find(b => b.id === p.brokerId);
      
      return [
        format(parseISO(p.updatedAt), 'dd/MM/yy'),
        buyers,
        sellers,
        p.type,
        bank?.name || 'N/A',
        p.stage,
        formatCurrency(p.purchaseValue || 0),
        formatCurrency(p.financingValue || 0),
        broker?.name || 'N/A'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Data', 'Compradores', 'Vendedores', 'Tipo', 'Banco', 'Etapa', 'V. Compra', 'V. Finan.', 'Corretor']],
      body: processRows,
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 26] },
      styles: { fontSize: 7 }
    });

    doc.save(`relatorio_processos_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-2 pb-4">
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-5 gap-1.5">
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-black/5 flex flex-col items-center justify-center gap-0.5">
          <div className="bg-blue-500 w-5 h-5 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <Users className="w-2.5 h-2.5" />
          </div>
          <p className="text-[11px] font-bold text-[#1a1a1a]">{clients.length}</p>
          <p className="text-[7px] font-bold text-black/40 uppercase tracking-wider">Clientes</p>
        </div>

        <button
          onClick={() => setActiveView(activeView === 'agencies' ? null : 'agencies')}
          className={cn(
            "p-1.5 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center gap-0.5 group",
            activeView === 'agencies' ? "bg-black border-black text-white" : "bg-white border-black/5 text-[#1a1a1a] hover:border-black/20"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-colors",
            activeView === 'agencies' ? "bg-white/20 text-white" : "bg-black text-white"
          )}>
            <Building2 className="w-2.5 h-2.5" />
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <p className="text-[11px] font-bold">{agencies.length}</p>
            {activeView === 'agencies' ? <ChevronUp className="w-2 h-2 opacity-40" /> : <ChevronDown className="w-2 h-2 opacity-40" />}
          </div>
          <p className={cn("text-[7px] font-bold uppercase tracking-wider", activeView === 'agencies' ? "text-white/60" : "text-black/40")}>Imobiliárias</p>
        </button>

        <button
          onClick={() => setActiveView(activeView === 'brokers' ? null : 'brokers')}
          className={cn(
            "p-1.5 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center gap-0.5 group",
            activeView === 'brokers' ? "bg-black border-black text-white" : "bg-white border-black/5 text-[#1a1a1a] hover:border-black/20"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-colors",
            activeView === 'brokers' ? "bg-white/20 text-white" : "bg-amber-500 text-white"
          )}>
            <User className="w-2.5 h-2.5" />
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <p className="text-[11px] font-bold">{brokers.length}</p>
            {activeView === 'brokers' ? <ChevronUp className="w-2 h-2 opacity-40" /> : <ChevronDown className="w-2 h-2 opacity-40" />}
          </div>
          <p className={cn("text-[7px] font-bold uppercase tracking-wider", activeView === 'brokers' ? "text-white/60" : "text-black/40")}>Corretores</p>
        </button>

        <button
          onClick={() => setActiveView(activeView === 'stages' ? null : 'stages')}
          className={cn(
            "p-1.5 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center gap-0.5 group",
            activeView === 'stages' ? "bg-black border-black text-white" : "bg-white border-black/5 text-[#1a1a1a] hover:border-black/20"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-colors",
            activeView === 'stages' ? "bg-white/20 text-white" : "bg-emerald-500 text-white"
          )}>
            <Layers className="w-2.5 h-2.5" />
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <p className="text-[11px] font-bold">{filteredProcesses.length}</p>
            {activeView === 'stages' ? <ChevronUp className="w-2 h-2 opacity-40" /> : <ChevronDown className="w-2 h-2 opacity-40" />}
          </div>
          <p className={cn("text-[7px] font-bold uppercase tracking-wider", activeView === 'stages' ? "text-white/60" : "text-black/40")}>Etapas</p>
        </button>

        <button
          onClick={() => setActiveView(activeView === 'banks' ? null : 'banks')}
          className={cn(
            "p-1.5 rounded-xl shadow-sm border transition-all flex flex-col items-center justify-center gap-0.5 group",
            activeView === 'banks' ? "bg-black border-black text-white" : "bg-white border-black/5 text-[#1a1a1a] hover:border-black/20"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg flex items-center justify-center shadow-sm shrink-0 transition-colors",
            activeView === 'banks' ? "bg-white/20 text-white" : "bg-indigo-500 text-white"
          )}>
            <Landmark className="w-2.5 h-2.5" />
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <p className="text-[11px] font-bold">{banks.length}</p>
            {activeView === 'banks' ? <ChevronUp className="w-2 h-2 opacity-40" /> : <ChevronDown className="w-2 h-2 opacity-40" />}
          </div>
          <p className={cn("text-[7px] font-bold uppercase tracking-wider", activeView === 'banks' ? "text-white/60" : "text-black/40")}>Bancos</p>
        </button>
      </div>

      {/* Overlay View */}
      <AnimatePresence>
        {activeView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-[24px] shadow-sm border border-black/5 mb-2 relative">
              <button 
                onClick={() => setActiveView(null)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/5 text-black/40 flex items-center justify-center hover:bg-black/10 transition-all"
              >
                <X className="w-3 h-3" />
              </button>

              {activeView === 'agencies' && (
                <div>
                  <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Destaques Imobiliárias</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'Top Imobiliária (Qtd)', data: topAgencyByCount, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                      { title: 'Top Imobiliária (Vol)', data: topAgencyByVolume, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-3">
                        <div className={`${item.bg} p-2 rounded-xl shrink-0`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-[#1a1a1a] truncate leading-tight">
                            {item.data?.name || 'Sem dados'}
                          </h3>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-black/40 mt-0.5">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#1a1a1a]">{item.data?.count || 0} Proc.</p>
                          <p className="text-[10px] font-bold text-black/60">{formatCurrency(item.data?.totalFinancing || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'brokers' && (
                <div>
                  <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Destaques Corretores</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'Top Corretor (Qtd)', data: topBrokerByCount, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { title: 'Top Corretor (Vol)', data: topBrokerByVolume, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-3">
                        <div className={`${item.bg} p-2 rounded-xl shrink-0`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-[#1a1a1a] truncate leading-tight">
                            {item.data?.name || 'Sem dados'}
                          </h3>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-black/40 mt-0.5">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#1a1a1a]">{item.data?.count || 0} Proc.</p>
                          <p className="text-[10px] font-bold text-black/60">{formatCurrency(item.data?.totalFinancing || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'stages' && (
                <div>
                  <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Processos por Etapa</h2>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {stages.map((stage, idx) => {
                      const { count, totalFinancing } = getStageStats(stage);
                      const colors = [
                        "bg-green-100 text-green-800",
                        "bg-green-200 text-green-900",
                        "bg-green-300 text-green-900",
                        "bg-green-400 text-white",
                        "bg-green-500 text-white",
                        "bg-green-600 text-white",
                      ];
                      return (
                        <div key={stage} className="flex flex-col space-y-1.5">
                          <div 
                            className={cn(
                              "w-full py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest shadow-sm text-center",
                              colors[idx]
                            )}
                          >
                            {stage}
                          </div>
                          <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold text-[#1a1a1a]">{count} Proc.</p>
                            <p className="text-[10px] font-bold text-black/40">{formatCurrency(totalFinancing)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeView === 'banks' && (
                <div>
                  <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Processos por Banco</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {banks.map((bank) => {
                      const { count, totalFinancing } = getBankStats(bank.id!);
                      return (
                        <div key={bank.id} className="flex flex-col space-y-1.5">
                          <div className="w-full py-1 rounded-lg text-white text-[8px] font-bold uppercase tracking-widest shadow-sm text-center bg-[#1a1a1a]">
                            {bank.name}
                          </div>
                          <div className="flex flex-col items-center text-center">
                            <p className="text-xs font-bold text-[#1a1a1a]">{count} Proc.</p>
                            <p className="text-[10px] font-bold text-black/40">{formatCurrency(totalFinancing)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Filters */}
      <div className="flex flex-col gap-2 bg-white p-4 rounded-[32px] shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
          <div>
            <p className="text-black/40 text-[10px]">Filtre relatórios detalhados</p>
          </div>
        </div>

        {/* Advanced Filters - Always Visible */}
        <div className="border-t border-black/5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Banco</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludeBank} 
                    onChange={(e) => setExcludeBank(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludeBank ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludeBank && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todos os Bancos</option>
                <option value="none">Nenhum Banco</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Tipo de Processo</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludeType} 
                    onChange={(e) => setExcludeType(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludeType ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludeType && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todos os Tipos</option>
                <option value="none">Nenhum Tipo</option>
                <option value="Aquisição à vista com FGTS">Aquisição à vista com FGTS</option>
                <option value="Despachante">Despachante</option>
                <option value="Financiamento">Financiamento</option>
                <option value="Home Equity">Home Equity</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Etapa</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludeStage} 
                    onChange={(e) => setExcludeStage(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludeStage ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludeStage && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todas as Etapas</option>
                <option value="none">Nenhuma Etapa</option>
                {Array.from(new Set(processes.map(p => p.stage))).map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Corretor</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludeBroker} 
                    onChange={(e) => setExcludeBroker(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludeBroker ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludeBroker && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todos os Corretores</option>
                <option value="none">Nenhum Corretor</option>
                {brokers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Imobiliária</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludeAgency} 
                    onChange={(e) => setExcludeAgency(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludeAgency ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludeAgency && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todas as Imobiliárias</option>
                <option value="none">Nenhuma Imobiliária</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Período</label>
                <label className="flex items-center gap-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={excludePeriod} 
                    onChange={(e) => setExcludePeriod(e.target.checked)}
                    className="w-2.5 h-2.5 rounded border-black/10 text-black focus:ring-0 cursor-pointer"
                  />
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-tighter transition-colors",
                    excludePeriod ? "text-red-500" : "text-black/20 group-hover:text-black/40"
                  )}>Não incluir</span>
                </label>
              </div>
              <select 
                value={periodType}
                onChange={(e) => {
                  const val = e.target.value as 'month' | 'year' | 'all';
                  setPeriodType(val);
                  if (val === 'month' && !selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0]);
                  if (val === 'year' && !selectedYear && availableYears.length > 0) setSelectedYear(availableYears[0]);
                }}
                className={cn(
                  "w-full bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer transition-all",
                  excludePeriod && "opacity-60 ring-1 ring-red-500/20 bg-red-50/50"
                )}
              >
                <option value="all">Todo o Período</option>
                <option value="month">Mês Específico</option>
                <option value="year">Ano Inteiro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Period Sub-selection */}
        {(periodType === 'month' || periodType === 'year') && (
          <div className="border-t border-black/5 pt-2">
            {periodType === 'month' && (
              <div className="flex items-center gap-2">
                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar scroll-smooth">
                  {availableMonths.map((month) => {
                    const date = parseISO(month + '-01');
                    const label = format(date, 'MMMM yyyy', { locale: ptBR });
                    return (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(month)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border capitalize",
                          selectedMonth === month 
                            ? (excludePeriod ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-black text-white border-black shadow-md") 
                            : "bg-white text-black/60 border-black/5 hover:border-black/20",
                          excludePeriod && selectedMonth === month && "line-through"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {periodType === 'year' && (
              <div className="flex items-center gap-2">
                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar scroll-smooth">
                  {availableYears.map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                        selectedYear === year 
                          ? (excludePeriod ? "bg-red-500 text-white border-red-500 shadow-md" : "bg-black text-white border-black shadow-md") 
                          : "bg-white text-black/60 border-black/5 hover:border-black/20",
                        excludePeriod && selectedYear === year && "line-through"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Button & Stats Integrated into Filter Card */}
        <div className="mt-1 flex flex-col md:flex-row items-center justify-between gap-2 border-t border-black/5 pt-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-black/40 text-[9px] uppercase tracking-widest font-bold">Total de Processos</span>
              <span className="font-bold text-base text-black">{filteredProcesses.length}</span>
            </div>
            <div className="w-px h-6 bg-black/5" />
            <div className="flex flex-col">
              <span className="text-black/40 text-[9px] uppercase tracking-widest font-bold">Volume Total</span>
              <span className="font-bold text-base text-black">{formatCurrency(totalValue)}</span>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors flex items-center gap-2 shadow-md shadow-black/5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Exportar Relatório</span>
            </button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: -5, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-2xl shadow-xl border border-black/5 z-20 overflow-hidden"
                  >
                    <button
                      onClick={exportToCSV}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-black/60 hover:bg-black/5 transition-colors text-left"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-green-500" />
                      <span>Exportar CSV</span>
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-black/60 hover:bg-black/5 transition-colors text-left border-t border-black/5"
                    >
                      <FilePdf className="w-3.5 h-3.5 text-red-500" />
                      <span>Exportar PDF</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
