import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Search, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, FileText, Percent, Plus, X, Trash2 } from 'lucide-react';
import { api } from '../api';
import { Process, Client, FinancialEntry } from '../types';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

interface TransactionItem {
  id: string;
  isCustom?: boolean;
  rawId?: string;
  clientName?: string;
  subtitle?: string;
  type: 'dispatcher' | 'commission' | 'receita' | 'despesa';
  typeLabel: string;
  value: number;
  paymentDate?: string;
}

export default function FinanceManager() {
  const { setTitle, setActions } = useHeader();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [newType, setNewType] = useState<'receita' | 'despesa'>('receita');
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleOpenCreate = () => {
    setEditingEntryId(null);
    setIsConfirmingDelete(false);
    setNewType('receita');
    setNewName('');
    setNewValue(0);
    setNewDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TransactionItem) => {
    if (!t.isCustom || !t.rawId) return;
    const entry = financialEntries.find(e => e.id === t.rawId);
    setEditingEntryId(t.rawId);
    setIsConfirmingDelete(false);
    setNewType(entry?.type || (t.type === 'despesa' ? 'despesa' : 'receita'));
    setNewName(entry?.name || t.typeLabel);
    setNewValue(entry?.value || t.value);
    setNewDate(entry?.date || t.paymentDate || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    setTitle('Financeiro');
    setActions(
      <button
        onClick={handleOpenCreate}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-white/90 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        title="Nova Receita / Despesa"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Nova Entrada</span>
      </button>
    );

    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses((data as Process[]) || []));
    const unsubClients = api.subscribeToCollection('clients', (data) => setClients((data as Client[]) || []));
    const unsubEntries = api.subscribeToCollection('financial_entries', (data) => setFinancialEntries((data as FinancialEntry[]) || []));

    return () => {
      setActions(null);
      unsubProcesses();
      unsubClients();
      unsubEntries();
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const parseCurrency = (value: string) => {
    const raw = Number(value.replace(/\D/g, '')) / 100;
    return isNaN(raw) ? 0 : raw;
  };

  const getProcessClients = (p: Process) => {
    if (!p) return 'Cliente não encontrado';
    const buyers = p.participants?.filter(part => part && part.type === 'buyer') || [];
    
    if (buyers.length > 0) {
      return buyers.map(b => {
        const client = clients.find(c => c && c.id === b.id);
        return client ? client.name : (b.name || 'Cliente');
      }).join(', ');
    }

    const client = clients.find(c => c && c.id === p.clientId);
    return client ? client.name : 'Cliente não encontrado';
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newValue <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingEntryId) {
        await api.update('financial_entries', editingEntryId, {
          type: newType,
          name: newName.trim(),
          value: newValue,
          date: newDate,
          updatedAt: new Date().toISOString()
        });
      } else {
        await api.create('financial_entries', {
          type: newType,
          name: newName.trim(),
          value: newValue,
          date: newDate,
          createdAt: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      setEditingEntryId(null);
      setNewName('');
      setNewValue(0);
      setNewType('receita');
      setNewDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error("Erro ao salvar lançamento financeiro:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setIsSubmitting(true);
    try {
      await api.delete('financial_entries', id);
      setIsModalOpen(false);
      setEditingEntryId(null);
      setIsConfirmingDelete(false);
    } catch (err) {
      console.error("Erro ao excluir lançamento:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allTransactions: TransactionItem[] = [
    ...(processes || []).flatMap(p => {
      if (!p) return [];
      const items: TransactionItem[] = [];
      const clientName = getProcessClients(p);

      if (p.hasDispatcher && p.isDispatcherPaid) {
        items.push({
          id: `${p.id}-dispatcher`,
          clientName,
          type: 'dispatcher',
          typeLabel: 'Despachante',
          value: p.dispatcherValue || 0,
          paymentDate: p.dispatcherPaymentDate,
        });
      }

      if (p.isCommissionPaid) {
        items.push({
          id: `${p.id}-commission`,
          clientName,
          type: 'commission',
          typeLabel: 'Comissão',
          value: p.commissionValue || 0,
          paymentDate: p.commissionPaymentDate,
        });
      }

      return items;
    }),
    ...(financialEntries || []).map(entry => ({
      id: entry.id || Math.random().toString(),
      isCustom: true,
      rawId: entry.id,
      subtitle: entry.type === 'receita' ? 'Receita' : 'Despesa',
      type: entry.type,
      typeLabel: entry.name || 'Sem nome',
      value: entry.value || 0,
      paymentDate: entry.date
    }))
  ];

  const filteredTransactions = allTransactions
    .filter(t => {
      if (timeFilter === 'all') return true;
      if (!t.paymentDate) return false;

      const paymentDate = new Date(t.paymentDate + 'T12:00:00');

      if (timeFilter === 'year') {
        return paymentDate.getFullYear() === selectedYear;
      }

      if (timeFilter === 'month') {
        return paymentDate.getFullYear() === selectedYear &&
               paymentDate.getMonth() === selectedMonth;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = a.paymentDate || '';
      const dateB = b.paymentDate || '';
      return dateB.localeCompare(dateA);
    });

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'dispatcher') {
      acc.dispatcher += t.value;
      acc.total += t.value;
    } else if (t.type === 'commission') {
      acc.commission += t.value;
      acc.total += t.value;
    } else if (t.type === 'receita') {
      acc.outrasReceitas += t.value;
      acc.total += t.value;
    } else if (t.type === 'despesa') {
      acc.despesas += t.value;
      acc.total -= t.value;
    }
    return acc;
  }, { dispatcher: 0, commission: 0, outrasReceitas: 0, despesas: 0, total: 0 });

  return (
    <div className="space-y-6 pb-20">
      {/* Time Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTimeFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider cursor-pointer",
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
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider cursor-pointer",
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
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider cursor-pointer",
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] border border-black/5 shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-black/40 truncate">Total Despachante</p>
              <p className="text-sm sm:text-xl font-bold text-[#1a1a1a] truncate">{formatCurrency(totals.dispatcher)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] border border-black/5 shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-black/40 truncate">Total Comissão</p>
              <p className="text-sm sm:text-xl font-bold text-[#1a1a1a] truncate">{formatCurrency(totals.commission + totals.outrasReceitas)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] border border-black/5 shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-50 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-black/40 truncate">Total Despesas</p>
              <p className="text-sm sm:text-xl font-bold text-rose-600 truncate">{formatCurrency(totals.despesas)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-black p-3 sm:p-4 rounded-[18px] sm:rounded-[24px] shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/40 truncate">Total Geral Líquido</p>
              <p className="text-sm sm:text-xl font-bold text-white truncate">{formatCurrency(totals.total)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-black/5 flex items-center justify-between">
          <h3 className="font-bold text-[#1a1a1a]">Extrato Financeiro</h3>
          <span className="text-xs font-semibold text-black/40">{filteredTransactions.length} lançamentos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-black/5">
              {filteredTransactions.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => t.isCustom && handleOpenEdit(t)}
                  className={cn(
                    "hover:bg-black/5 transition-colors group",
                    t.isCustom && "cursor-pointer"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#1a1a1a]">{t.typeLabel}</span>
                      {t.clientName ? (
                        <span className="text-[11px] font-medium text-black/50">{t.clientName}</span>
                      ) : t.subtitle ? (
                        <span className={cn(
                          "text-[11px] font-medium",
                          t.type === 'despesa' ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {t.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm font-bold",
                        t.type === 'despesa' ? "text-rose-600" : "text-[#1a1a1a]"
                      )}>
                        {t.type === 'despesa' ? `- ${formatCurrency(t.value)}` : formatCurrency(t.value)}
                      </span>
                      <span className="text-[10px] text-black/40 font-medium">
                        {t.paymentDate ? new Date(t.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
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

      {/* Modal for New Entry */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden border border-black/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
                <h3 className="text-base font-bold text-[#1a1a1a]">
                  {editingEntryId ? 'Editar Lançamento' : 'Nova Receita / Despesa'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveEntry} className="p-6 space-y-5">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black/40">Tipo de Lançamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType('receita')}
                      className={cn(
                        "py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer",
                        newType === 'receita'
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                          : "bg-black/5 border-transparent text-black/50 hover:bg-black/10"
                      )}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('despesa')}
                      className={cn(
                        "py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer",
                        newType === 'despesa'
                          ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                          : "bg-black/5 border-transparent text-black/50 hover:bg-black/10"
                      )}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      Despesa
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black/40">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aluguel da sala, Serviços prestados, Material"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f0] text-sm text-[#1a1a1a] focus:ring-2 focus:ring-black/10 outline-none transition-all"
                  />
                </div>

                {/* Value */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black/40">Valor</label>
                  <input
                    type="text"
                    required
                    value={formatCurrency(newValue)}
                    onChange={(e) => setNewValue(parseCurrency(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f0] text-sm font-bold text-[#1a1a1a] focus:ring-2 focus:ring-black/10 outline-none transition-all"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-black/40">Data</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f0] text-sm text-[#1a1a1a] focus:ring-2 focus:ring-black/10 outline-none transition-all"
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/5">
                  {editingEntryId ? (
                    isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-rose-600 font-bold">Excluir?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(editingEntryId)}
                          disabled={isSubmitting}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="px-2.5 py-1 bg-black/5 text-black/60 rounded-lg text-xs font-bold hover:bg-black/10 transition-colors cursor-pointer"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    )
                  ) : <div />}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-black/60 hover:bg-black/5 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newName.trim() || newValue <= 0}
                      className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-black/80 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
