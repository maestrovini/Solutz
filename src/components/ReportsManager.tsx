import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, FileText, Clock, DollarSign, 
  ChevronDown, Filter, Download, Calendar, BarChart3, PieChart as PieChartIcon, Layers
} from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Process, Client, Bank, Broker, Agency } from '../types';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useEffect } from 'react';

interface ReportsManagerProps {
  processes: Process[];
  clients: Client[];
  banks: Bank[];
  brokers: Broker[];
  agencies: Agency[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  processes,
  clients,
  banks,
  brokers,
  agencies
}) => {
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('6m');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Relatórios e Estatísticas');
    setActions(null);
  }, []);

  // Filter processes based on time range and other filters
  const filteredProcesses = useMemo(() => {
    let filtered = [...processes];
    
    if (timeRange !== 'all') {
      const months = timeRange === '6m' ? 6 : 12;
      const startDate = subMonths(new Date(), months);
      filtered = filtered.filter(p => {
        const date = parseISO(p.updatedAt);
        return date >= startDate;
      });
    }

    if (selectedBank !== 'all') {
      filtered = filtered.filter(p => p.bankId === selectedBank);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    return filtered;
  }, [processes, timeRange, selectedBank, selectedType]);

  // Monthly Data
  const monthlyData = useMemo(() => {
    const data: { [key: string]: { month: string, count: number, value: number, timestamp: number } } = {};
    
    filteredProcesses.forEach(p => {
      const date = parseISO(p.updatedAt);
      const monthKey = format(date, 'yyyy-MM');
      const monthDisplay = format(date, 'MMM/yy', { locale: ptBR });
      
      if (!data[monthKey]) {
        data[monthKey] = { 
          month: monthDisplay, 
          count: 0, 
          value: 0,
          timestamp: startOfMonth(date).getTime()
        };
      }
      
      data[monthKey].count += 1;
      data[monthKey].value += p.financingValue || p.value || 0;
    });

    return Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredProcesses]);

  // Stage Distribution
  const stageData = useMemo(() => {
    const stages: { [key: string]: number } = {};
    filteredProcesses.forEach(p => {
      stages[p.stage] = (stages[p.stage] || 0) + 1;
    });
    return Object.entries(stages).map(([name, value]) => ({ name, value }));
  }, [filteredProcesses]);

  // Bank Distribution
  const bankDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};
    filteredProcesses.forEach(p => {
      const bank = banks.find(b => b.id === p.bankId);
      const name = bank?.name || 'Não Definido';
      distribution[name] = (distribution[name] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredProcesses, banks]);

  // Average Duration
  const avgDuration = useMemo(() => {
    const completedProcesses = filteredProcesses.filter(p => p.status === 'Concluído' || p.stage === 'Finalizado');
    if (completedProcesses.length === 0) return 0;

    const totalDays = completedProcesses.reduce((acc, p) => {
      if (!p.stageHistory || p.stageHistory.length < 2) return acc;
      const start = parseISO(p.stageHistory[0].date);
      const end = parseISO(p.stageHistory[p.stageHistory.length - 1].date);
      return acc + differenceInDays(end, start);
    }, 0);

    return Math.round(totalDays / completedProcesses.length);
  }, [filteredProcesses]);

  // Monthly Stages Data
  const monthlyStagesData = useMemo(() => {
    const data: { [key: string]: any } = {};
    const stages = ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'];
    
    filteredProcesses.forEach(p => {
      const date = parseISO(p.updatedAt);
      const monthKey = format(date, 'yyyy-MM');
      const monthDisplay = format(date, 'MMM/yy', { locale: ptBR });
      
      if (!data[monthKey]) {
        data[monthKey] = { 
          month: monthDisplay, 
          timestamp: startOfMonth(date).getTime()
        };
        stages.forEach(s => data[monthKey][s] = 0);
      }
      
      if (stages.includes(p.stage)) {
        data[monthKey][p.stage] += 1;
      }
    });

    return Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredProcesses]);

  // Totals
  const totalValue = useMemo(() => {
    return filteredProcesses.reduce((acc, p) => acc + (p.financingValue || p.value || 0), 0);
  }, [filteredProcesses]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-black/5">
        <div>
          <p className="text-black/40 text-sm">Análise detalhada dos processos de financiamento</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-black/5 p-1 rounded-xl">
            {(['6m', '12m', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  timeRange === range ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/60"
                )}
              >
                {range === '6m' ? '6 Meses' : range === '12m' ? '12 Meses' : 'Tudo'}
              </button>
            ))}
          </div>

          <select 
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="bg-black/5 border-none rounded-xl px-3 py-2 text-xs font-medium focus:ring-0 cursor-pointer"
          >
            <option value="all">Todos os Bancos</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <button className="p-2 bg-black text-white rounded-xl hover:bg-black/80 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Processos', value: filteredProcesses.length, icon: FileText, color: 'bg-blue-500' },
          { label: 'Volume Total', value: formatCurrency(totalValue), icon: DollarSign, color: 'bg-green-500' },
          { label: 'Tempo Médio', value: `${avgDuration} dias`, icon: Clock, color: 'bg-orange-500' },
          { label: 'Ticket Médio', value: formatCurrency(filteredProcesses.length ? totalValue / filteredProcesses.length : 0), icon: TrendingUp, color: 'bg-purple-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-black/40 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-[#1a1a1a]">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Volume Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a1a]">Volume Mensal</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => typeof value === 'number' && value > 1000 ? formatCurrency(value) : value}
                />
                <Legend iconType="circle" />
                <Bar dataKey="count" name="Qtd. Processos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="value" name="Valor Total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stage Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a1a]">Distribuição por Etapa</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Stages Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a1a]">Etapas por Mês</h3>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStagesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Aprovado" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Vistoria" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Contrato" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Registro" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Finalizado" stackId="a" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bank Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a1a]">Volume por Banco</h3>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" name="Processos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Process List with Duration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-[#1a1a1a]">Tempo por Processo</h3>
            </div>
          </div>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredProcesses.slice(0, 10).map((p) => {
              const client = clients.find(c => c.id === p.clientId);
              const duration = p.stageHistory && p.stageHistory.length >= 2
                ? differenceInDays(parseISO(p.stageHistory[p.stageHistory.length - 1].date), parseISO(p.stageHistory[0].date))
                : 0;
              
              return (
                <div key={p.id} className="flex items-center justify-between p-4 bg-black/5 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm text-[#1a1a1a]">{client?.name || 'Cliente Desconhecido'}</p>
                    <p className="text-[10px] text-black/40 uppercase tracking-wider">{p.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-black/60">{duration} dias</p>
                    <div className="w-24 h-1.5 bg-black/10 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          duration > 60 ? "bg-red-500" : duration > 30 ? "bg-orange-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, (duration / 90) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Broker/Agency Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5"
      >
        <h3 className="font-bold text-lg text-[#1a1a1a] mb-6">Performance por Corretor</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-black/5">
                <th className="pb-4 text-[10px] font-bold text-black/40 uppercase tracking-widest">Corretor</th>
                <th className="pb-4 text-[10px] font-bold text-black/40 uppercase tracking-widest">Imobiliária</th>
                <th className="pb-4 text-[10px] font-bold text-black/40 uppercase tracking-widest">Processos</th>
                <th className="pb-4 text-[10px] font-bold text-black/40 uppercase tracking-widest text-right">Volume Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {brokers.map(broker => {
                const brokerProcesses = filteredProcesses.filter(p => p.brokerId === broker.id);
                const agency = agencies.find(a => a.id === broker.agencyId);
                const volume = brokerProcesses.reduce((acc, p) => acc + (p.financingValue || p.value || 0), 0);
                
                if (brokerProcesses.length === 0) return null;

                return (
                  <tr key={broker.id} className="group hover:bg-black/[0.02] transition-colors">
                    <td className="py-4 font-bold text-sm text-[#1a1a1a]">{broker.name}</td>
                    <td className="py-4 text-sm text-black/60">{agency?.name || '-'}</td>
                    <td className="py-4 text-sm text-black/60">{brokerProcesses.length}</td>
                    <td className="py-4 text-sm font-bold text-[#1a1a1a] text-right">{formatCurrency(volume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
