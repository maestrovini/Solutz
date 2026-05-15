import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, Search, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, FileText } from 'lucide-react';
import { api } from '../api';
import { Process, Client } from '../types';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

export default function FinanceManager() {
  const { setTitle, setActions } = useHeader();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month'>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    setTitle('Financeiro');
    setActions(null);

    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses(data as Process[]));
    const unsubClients = api.subscribeToCollection('clients', (data) => setClients(data as Client[]));

    return () => {
      unsubProcesses();
      unsubClients();
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getProcessClients = (p: Process) => {
    const buyers = p.participants?.filter(part => part.type === 'buyer') || [];
    
    if (buyers.length > 0) {
      return buyers.map(b => {
        const client = clients.find(c => c.id === b.id);
        return client ? client.name : b.name;
      }).join(', ');
    }

    const client = clients.find(c => c.id === p.clientId);
    return client ? client.name : 'Cliente não encontrado';
  };

  const filteredProcesses = processes.filter(p => {
    if (!p.hasDispatcher || !p.isDispatcherPaid) return false;
    
    if (timeFilter === 'all') return true;
    
    if (!p.dispatcherPaymentDate) return false;
    
    const paymentDate = new Date(p.dispatcherPaymentDate + 'T12:00:00');
    const now = new Date();
    
    if (timeFilter === 'year') {
      return paymentDate.getFullYear() === selectedYear;
    }
    
    if (timeFilter === 'month') {
      return paymentDate.getFullYear() === selectedYear && 
             paymentDate.getMonth() === selectedMonth;
    }
    
    return true;
  });

  const totals = filteredProcesses.reduce((acc, p) => ({
    dispatcher: acc.dispatcher + (p.dispatcherValue || 0),
    total: acc.total + (p.dispatcherValue || 0)
  }), { dispatcher: 0, total: 0 });

  return (
    <div className="space-y-6 pb-20">
      {/* Time Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTimeFilter('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
            timeFilter === 'all'
              ? "bg-black text-white border-black"
              : "bg-white text-black/40 border-black/10 hover:bg-black/5"
          )}
        >
          Todos
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeFilter('year')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
              timeFilter === 'year'
                ? "bg-black text-white border-black"
                : "bg-white text-black/40 border-black/10 hover:bg-black/5"
            )}
          >
            Ano
          </button>
          {timeFilter === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-black/10 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeFilter('month')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
              timeFilter === 'month'
                ? "bg-black text-white border-black"
                : "bg-white text-black/40 border-black/10 hover:bg-black/5"
            )}
          >
            Mês
          </button>
          {timeFilter === 'month' && (
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-black/10 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-black/10 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-[24px] border border-black/5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Total Despachante</p>
              <p className="text-xl font-bold text-[#1a1a1a]">{formatCurrency(totals.dispatcher)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black p-4 rounded-[24px] shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Total Geral</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-black/40">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-black/40 text-right">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredProcesses.map((p) => (
                <tr key={p.id} className="hover:bg-black/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#1a1a1a]">{getProcessClients(p)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#1a1a1a]">
                        {formatCurrency(p.dispatcherValue || 0)}
                      </span>
                      <span className="text-[10px] text-black/40 font-medium">
                        {p.dispatcherPaymentDate ? new Date(p.dispatcherPaymentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProcesses.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-black/20 italic text-sm">
                    Nenhum registro financeiro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
