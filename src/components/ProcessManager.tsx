import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Process, Client, Bank, Agency, Broker, Participant, Notification } from '../types';
import { Plus, Search, Trash2, Edit2, X, FileText, Clock, DollarSign, Building2, User, Users, CheckCircle2, Ban, Pause, AlertCircle, Save, Phone, Mail, MapPin, Calendar, Briefcase, Filter, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface ProcessManagerProps {
  initialSelectedProcessId?: string | null;
  onCloseDetail?: () => void;
}

export default function ProcessManager({ initialSelectedProcessId, onCloseDetail }: ProcessManagerProps) {
  const { isAdmin } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState<Process | null>(null);
  const [selectedEntityForDetail, setSelectedEntityForDetail] = useState<{ type: 'client' | 'broker' | 'agency', id: string } | null>(null);
  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [entityFormData, setEntityFormData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [notificationData, setNotificationData] = useState({
    date: '',
    reason: ''
  });
  const { setTitle, setActions } = useHeader();
  const [filters, setFilters] = useState({
    bankId: '',
    type: '',
    stage: '',
    brokerId: '',
    agencyId: '',
    financingType: ''
  });
  const [participantSearch, setParticipantSearch] = useState({
    buyer: '',
    seller: '',
    broker: '',
    agency: ''
  });
  const [formData, setFormData] = useState({
    clientId: '',
    participants: [] as Participant[],
    type: 'Financiamento' as Process['type'],
    status: 'Em andamento',
    stage: 'Aprovado',
    bankId: '',
    purchaseValue: 0,
    financingValue: 0,
    financingType: 'SBPE' as Process['financingType'],
    value: 0,
    notes: '',
  });

  const stages = {
    'Aquisição à vista com FGTS': ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'],
    'Despachante': ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'],
    'Financiamento': ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'],
    'Home Equity': ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado']
  };

  const allStages = ['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const handleCurrencyChange = (field: 'purchaseValue' | 'financingValue', value: string) => {
    const numericValue = parseCurrency(value);
    setFormData({ ...formData, [field]: numericValue });
  };

  useEffect(() => {
    if (initialSelectedProcessId && processes.length > 0) {
      const process = processes.find(p => p.id === initialSelectedProcessId);
      if (process) {
        setSelectedProcessForDetail(process);
      }
    }
  }, [initialSelectedProcessId, processes]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProcessForDetail(null);
        onCloseDetail?.();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCloseDetail]);

  useEffect(() => {
    setTitle('Processos');
    setActions(
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSearchOpen(prev => !prev)}
          className={cn(
            "p-2 rounded-lg transition-all border shadow-sm",
            isSearchOpen || searchTerm
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsFilterOpen(prev => !prev)}
          className={cn(
            "p-2 rounded-lg transition-all border shadow-sm relative",
            isFilterOpen || Object.values(filters).some(v => v)
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Filtros"
        >
          <Filter className="w-5 h-5" />
          {Object.values(filters).some(v => v) && !isFilterOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-black rounded-full" />
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingProcess(null);
              setFormData({
                clientId: '',
                participants: [],
                type: 'Financiamento',
                status: 'Em andamento',
                stage: 'Aprovado',
                bankId: '',
                purchaseValue: 0,
                financingValue: 0,
                financingType: 'SBPE',
                value: 0,
                notes: '',
              });
              setIsModalOpen(true);
            }}
            className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
            title="Novo Processo"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, filters, isAdmin]);

  useEffect(() => {
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients(data as Client[]);
    });
    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks(data as Bank[]);
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers(data as Broker[]);
    });

    return () => {
      unsubProcesses();
      unsubClients();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
    };
  }, []);

  const handleCreateNotification = async () => {
    if (!selectedProcessForDetail || !notificationData.date || !notificationData.reason) return;

    let updatedNotifications: Notification[];

    if (editingNotificationId) {
      updatedNotifications = (selectedProcessForDetail.notifications || []).map(n => 
        n.id === editingNotificationId 
          ? { ...n, date: notificationData.date, reason: notificationData.reason }
          : n
      );
    } else {
      const newNotification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        date: notificationData.date,
        reason: notificationData.reason,
        createdAt: new Date().toISOString()
      };
      updatedNotifications = [...(selectedProcessForDetail.notifications || []), newNotification];
    }

    const updatedProcess: Process = {
      ...selectedProcessForDetail,
      notifications: updatedNotifications,
      updatedAt: new Date().toISOString()
    };

    try {
      await api.update('processes', updatedProcess.id!, updatedProcess);
      setSelectedProcessForDetail(updatedProcess);
      setIsNotificationModalOpen(false);
      setNotificationData({ date: '', reason: '' });
      setEditingNotificationId(null);
    } catch (error) {
      console.error("Erro ao salvar notificação:", error);
    }
  };

  const handleDeleteNotification = async (processId: string, notificationId: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process) return;

    const updatedProcess: Process = {
      ...process,
      notifications: (process.notifications || []).filter(n => n.id !== notificationId),
      updatedAt: new Date().toISOString()
    };

    try {
      await api.update('processes', processId, updatedProcess);
      if (selectedProcessForDetail?.id === processId) {
        setSelectedProcessForDetail(updatedProcess);
      }
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  };

  const handleUpdateStage = async (processId: string, newStage: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process || process.stage === newStage) return;

    const historyEntry = {
      stage: newStage,
      date: new Date().toISOString()
    };

    const updatedProcess: Process = {
      ...process,
      stage: newStage,
      stageHistory: [...(process.stageHistory || []), historyEntry],
      updatedAt: new Date().toISOString()
    };

    try {
      await api.update('processes', processId, updatedProcess);
      if (selectedProcessForDetail?.id === processId) {
        setSelectedProcessForDetail(updatedProcess);
      }
    } catch (error) {
      console.error("Erro ao atualizar etapa:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date().toISOString();
    let stageHistory = editingProcess?.stageHistory || [];
    
    // Record history if it's a new process or the stage has changed
    if (!editingProcess || editingProcess.stage !== formData.stage) {
      stageHistory = [...stageHistory, { stage: formData.stage, date: now }];
    }

    const processData = {
      ...formData,
      stageHistory,
      brokerId: 'admin-1',
      updatedAt: now,
    };

    try {
      if (editingProcess?.id) {
        await api.update('processes', editingProcess.id, processData);
      } else {
        await api.create('processes', processData);
      }
      setIsModalOpen(false);
      setEditingProcess(null);
      setFormData({ 
        clientId: '', 
        participants: [], 
        type: 'Financiamento', 
        status: 'Em andamento', 
        stage: 'Aprovado', 
        bankId: '', 
        purchaseValue: 0,
        financingValue: 0,
        financingType: 'SBPE',
        value: 0, 
        notes: '' 
      });
    } catch (error) {
      console.error("Erro ao salvar processo:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete('processes', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Erro ao excluir processo:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Finalizado': return <CheckCircle2 className="w-5 h-5" />;
      case 'Cancelado': return <Ban className="w-5 h-5" />;
      case 'Pausado': return <Pause className="w-5 h-5" />;
      case 'Aguardando Cliente': return <User className="w-5 h-5" />;
      case 'Aguardando Banco': return <Building2 className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const stageConfig: Record<string, { color: string, percent: number }> = {
    'Aprovado': { color: '#3b82f6', percent: 20 },
    'Vistoria': { color: '#f59e0b', percent: 40 },
    'Contrato': { color: '#8b5cf6', percent: 60 },
    'Registro': { color: '#f97316', percent: 80 },
    'Finalizado': { color: '#1a1a1a', percent: 100 },
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || 'N/A';

  const getDaysInCurrentStage = (process: Process) => {
    if (!process.stageHistory || process.stageHistory.length === 0) return 0;
    const lastHistory = process.stageHistory[process.stageHistory.length - 1];
    const startDate = new Date(lastHistory.date);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleEntityEdit = (type: 'client' | 'broker' | 'agency', entity: any) => {
    setEntityFormData({ ...entity });
    setIsEditingEntity(true);
  };

  const handleEntityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityForDetail || !entityFormData) return;

    try {
      const collection = selectedEntityForDetail.type === 'client' ? 'clients' : 
                         selectedEntityForDetail.type === 'broker' ? 'brokers' : 'agencies';
      
      await api.update(collection as any, selectedEntityForDetail.id, entityFormData);
      
      setIsEditingEntity(false);
    } catch (error) {
      console.error("Erro ao atualizar entidade:", error);
    }
  };

  const addParticipant = (type: Participant['type'], id: string, name: string) => {
    if (formData.participants.some(p => p.id === id && p.type === type)) return;
    setFormData({
      ...formData,
      participants: [...formData.participants, { id, type, name }]
    });
  };

  const removeParticipant = (id: string, type: string) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter(p => !(p.id === id && p.type === type))
    });
  };

  const filteredProcesses = processes.filter(process => {
    const buyers = process.participants?.filter(p => p.type === 'buyer') || [];
    const sellers = process.participants?.filter(p => p.type === 'seller') || [];
    const brokersList = process.participants?.filter(p => p.type === 'broker') || [];
    const agenciesList = process.participants?.filter(p => p.type === 'agency') || [];
    
    const searchMatch = 
      buyers.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sellers.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      brokersList.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      agenciesList.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      process.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const bankMatch = !filters.bankId || process.bankId === filters.bankId;
    const typeMatch = !filters.type || process.type === filters.type;
    const stageMatch = !filters.stage || process.stage === filters.stage;
    const brokerMatch = !filters.brokerId || process.brokerId === filters.brokerId || brokersList.some(p => p.id === filters.brokerId);
    
    const agencyMatch = !filters.agencyId || agenciesList.some(p => p.id === filters.agencyId) || (() => {
      const broker = brokers.find(b => b.id === process.brokerId);
      return broker?.agencyId === filters.agencyId;
    })();

    const financingTypeMatch = !filters.financingType || process.financingType === filters.financingType;

    return searchMatch && bankMatch && typeMatch && stageMatch && brokerMatch && agencyMatch && financingTypeMatch;
  });

  return (
    <div className="space-y-6">
      {/* Stage Filter Bar */}
      <div className="grid grid-cols-5 gap-1 bg-white p-1 rounded-xl border border-black/5 shadow-sm">
        {allStages.map((s) => {
          const isSelected = filters.stage === s;
          return (
            <button
              key={s}
              onClick={() => setFilters({ ...filters, stage: isSelected ? '' : s })}
              className={cn(
                "h-10 flex items-center justify-center rounded-lg transition-all border",
                isSelected ? "text-white border-transparent shadow-md scale-[1.02]" : "text-black/40 border-transparent hover:bg-black/5"
              )}
              style={{ 
                backgroundColor: isSelected ? stageConfig[s].color : undefined
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider px-1">{s}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white text-[#1a1a1a] rounded-2xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all placeholder:text-black/40"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Banco</label>
                <select
                  value={filters.bankId}
                  onChange={(e) => setFilters({ ...filters, bankId: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todos os Bancos</option>
                  {banks
                    .filter(b => {
                      if (!filters.type) return true;
                      if (filters.type === 'Home Equity') return b.processTypes?.includes('Home Equity');
                      if (filters.type === 'Financiamento') {
                        return b.processTypes?.some(t => ['MCMV', 'SBPE', 'Pró-Cotista'].includes(t));
                      }
                      return true; // Despachante or FGTS
                    })
                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Tipo de Processo</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todos os Tipos</option>
                  <option value="Aquisição à vista com FGTS">Aquisição à vista com FGTS</option>
                  <option value="Despachante">Despachante</option>
                  <option value="Financiamento">Financiamento</option>
                  <option value="Home Equity">Home Equity</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Etapa</label>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todas as Etapas</option>
                  {['Aprovado', 'Vistoria', 'Contrato', 'Registro', 'Finalizado'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Imobiliária</label>
                <select
                  value={filters.agencyId}
                  onChange={(e) => setFilters({ ...filters, agencyId: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todas as Imobiliárias</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Corretor</label>
                <select
                  value={filters.brokerId}
                  onChange={(e) => setFilters({ ...filters, brokerId: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todos os Corretores</option>
                  {brokers
                    .filter(b => !filters.agencyId || b.agencyId === filters.agencyId)
                    .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Modalidade</label>
                <select
                  value={filters.financingType}
                  onChange={(e) => setFilters({ ...filters, financingType: e.target.value })}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                >
                  <option value="">Todas as Modalidades</option>
                  <option value="SBPE">SBPE</option>
                  <option value="Pró-Cotista">Pró-Cotista</option>
                  <option value="MCMV">MCMV</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <button
                  onClick={() => setFilters({ bankId: '', type: '', stage: '', brokerId: '', agencyId: '', financingType: '' })}
                  className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3">
        {filteredProcesses.map((process) => {
          const buyers = process.participants?.filter(p => p.type === 'buyer') || [];
          const sellers = process.participants?.filter(p => p.type === 'seller') || [];
          const brokersList = process.participants?.filter(p => p.type === 'broker') || [];
          const agenciesList = process.participants?.filter(p => p.type === 'agency') || [];

          const isFinance = process.type === 'Financiamento' || process.type === 'Home Equity';

          const openEditModal = (process: Process) => {
            setEditingProcess(process);
            setFormData({
              clientId: process.clientId,
              participants: process.participants || [],
              type: process.type,
              status: process.status,
              stage: process.stage,
              bankId: process.bankId || '',
              purchaseValue: process.purchaseValue || 0,
              financingValue: process.financingValue || 0,
              financingType: process.financingType || 'SBPE',
              value: process.value,
              notes: process.notes || '',
            });
            setSelectedProcessForDetail(null);
            setIsModalOpen(true);
          };

          const openDetailModal = (process: Process) => {
            setSelectedProcessForDetail(process);
          };

          return (
            <motion.div
              layout
              key={process.id}
              className="bg-white p-5 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all relative"
            >
              <div className="w-full space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Compradores</p>
                    <div className="flex flex-col gap-1">
                      {buyers.length > 0 ? buyers.map((p, i) => (
                        <button 
                          key={i}
                          onClick={() => openDetailModal(process)}
                          className="text-sm font-semibold text-[#1a1a1a] hover:text-black/60 transition-colors text-left"
                        >
                          {p.name}
                        </button>
                      )) : <span className="text-sm text-black/20">-</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Days in stage counter */}
                    <div className="flex items-center gap-1">
                      <div className="h-8 px-2 flex items-center gap-1.5 bg-black/5 rounded-lg border border-black/5" title="Dias na etapa atual">
                        <Clock className="w-3.5 h-3.5 text-black/40" />
                        <span className="text-[10px] font-bold text-[#1a1a1a]">{getDaysInCurrentStage(process)}d</span>
                      </div>
                      {process.notifications?.some(n => n.date >= new Date().toISOString().split('T')[0]) && (
                        <div className="h-8 w-8 flex items-center justify-center bg-amber-50 rounded-lg border border-amber-100" title="Possui notificações ativas">
                          <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                        </div>
                      )}
                    </div>

                    {/* Bank Logo - Top Right */}
                    {(() => {
                      const bankLogo = banks.find(b => b.id === process.bankId)?.logoUrl;
                      return process.bankId && bankLogo ? (
                        <div className="h-8 flex items-center justify-center bg-black/5 p-1 rounded-lg">
                          <img 
                            src={bankLogo} 
                            alt="Bank" 
                            className="h-full max-w-[80px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Compra/Venda</p>
                    <p className="text-sm font-bold text-[#1a1a1a]">
                      R$ {(process.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {isFinance && (
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Financiamento</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">
                        R$ {(process.financingValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Segmented Progress Bar */}
                <div className="grid grid-cols-5 gap-1">
                  {allStages.map((s) => {
                    const isCurrent = s === process.stage;
                    const stageIdx = allStages.indexOf(s);
                    const currentIdx = allStages.indexOf(process.stage);
                    const isPast = stageIdx < currentIdx;
                    
                    return (
                      <div 
                        key={s}
                        className={cn(
                          "h-6 flex items-center justify-center rounded-md transition-all border",
                          isCurrent ? "text-white border-transparent shadow-sm" : 
                          isPast ? "text-black/60 border-transparent" : "text-black/20 border-black/5 bg-[#f5f5f0]/50"
                        )}
                        style={{ 
                          backgroundColor: isCurrent ? stageConfig[s].color : (isPast ? `${stageConfig[s].color}30` : undefined)
                        }}
                      >
                        <span className="text-[8px] font-bold uppercase truncate px-1">{s}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Observations in Main Card */}
                {process.notes && (
                  <div className="pt-2 border-t border-black/5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-black/40 mb-1">Observações</p>
                    <p className="text-xs text-black/60 line-clamp-2 italic">{process.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedProcessForDetail && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedProcessForDetail(null);
                onCloseDetail?.();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {(() => {
                    const bankLogo = banks.find(b => b.id === selectedProcessForDetail.bankId)?.logoUrl;
                    return selectedProcessForDetail.bankId && bankLogo ? (
                      <div className="h-10 flex items-center justify-center bg-black/5 p-1.5 rounded-xl">
                        <img 
                          src={bankLogo} 
                          alt="Bank" 
                          className="h-full max-w-[100px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : null;
                  })()}                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => {
                            setEditingNotificationId(null);
                            setNotificationData({ date: '', reason: '' });
                            setIsNotificationModalOpen(true);
                          }}
                          className="p-2 hover:bg-black/5 rounded-full text-black/40"
                          title="Criar Notificação"
                        >
                          <Bell className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setDeleteConfirmId(selectedProcessForDetail.id!);
                            setSelectedProcessForDetail(null);
                            onCloseDetail?.();
                          }}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            const process = selectedProcessForDetail;
                            setEditingProcess(process);
                            setFormData({
                              clientId: process.clientId,
                              participants: process.participants || [],
                              type: process.type,
                              status: process.status,
                              stage: process.stage,
                              bankId: process.bankId || '',
                              purchaseValue: process.purchaseValue || 0,
                              financingValue: process.financingValue || 0,
                              financingType: process.financingType || 'SBPE',
                              value: process.value,
                              notes: process.notes || '',
                            });
                            setSelectedProcessForDetail(null);
                            onCloseDetail?.();
                            setIsModalOpen(true);
                          }} 
                          className="p-2 hover:bg-black/5 rounded-full text-black/40"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedProcessForDetail(null);
                        onCloseDetail?.();
                      }} 
                      className="p-2 hover:bg-black/5 rounded-full text-black/40"
                    >
                      <X />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Tipo de Processo</p>
                    <p className="text-sm font-semibold text-[#1a1a1a]">
                      {selectedProcessForDetail.type}
                      {selectedProcessForDetail.financingType && ` - ${selectedProcessForDetail.financingType}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Etapa</p>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-black/5 text-black">
                      {selectedProcessForDetail.stage}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Compradores</p>
                      <div className="space-y-1">
                        {selectedProcessForDetail.participants?.filter(p => p.type === 'buyer').map((p, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSelectedEntityForDetail({ type: 'client', id: p.id })}
                            className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Vendedores</p>
                      <div className="space-y-1">
                        {selectedProcessForDetail.participants?.filter(p => p.type === 'seller').map((p, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSelectedEntityForDetail({ type: 'client', id: p.id })}
                            className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Imobiliárias</p>
                      <div className="space-y-1">
                        {selectedProcessForDetail.participants?.filter(p => p.type === 'agency').map((p, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSelectedEntityForDetail({ type: 'agency', id: p.id })}
                            className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Corretores</p>
                      <div className="space-y-1">
                        {selectedProcessForDetail.participants?.filter(p => p.type === 'broker').map((p, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSelectedEntityForDetail({ type: 'broker', id: p.id })}
                            className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Compra/Venda</p>
                      <p className="text-base font-bold text-[#1a1a1a]">{formatCurrency(selectedProcessForDetail.purchaseValue || 0)}</p>
                    </div>
                    {(selectedProcessForDetail.type === 'Financiamento' || selectedProcessForDetail.type === 'Home Equity') && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Financiamento</p>
                        <p className="text-base font-bold text-[#1a1a1a]">{formatCurrency(selectedProcessForDetail.financingValue || 0)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedProcessForDetail.notes && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Observações</p>
                    <p className="text-sm text-black/60 bg-[#f5f5f0] p-4 rounded-2xl border border-black/5">{selectedProcessForDetail.notes}</p>
                  </div>
                )}

                <div className="pt-6 border-t border-black/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-black/40" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-black/40">Histórico e Notificações</h4>
                  </div>
                  <div className="space-y-6">
                    {(() => {
                      const timeline = [
                        ...(selectedProcessForDetail.stageHistory || []).map(h => ({ ...h, type: 'stage' as const })),
                        ...(selectedProcessForDetail.notifications || []).map(n => ({ ...n, type: 'notification' as const }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (timeline.length === 0) {
                        return (
                          <div className="text-center py-4 bg-[#f5f5f0] rounded-2xl border border-dashed border-black/10">
                            <p className="text-xs text-black/40">Nenhum histórico disponível.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {timeline.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 relative">
                              {i !== timeline.length - 1 && (
                                <div className="absolute left-[11px] top-6 bottom-[-16px] w-px bg-black/5" />
                              )}
                              {item.type === 'stage' ? (
                                <>
                                  <div 
                                    className="w-6 h-6 rounded-full border-4 border-white shadow-sm shrink-0 z-10"
                                    style={{ backgroundColor: stageConfig[(item as any).stage]?.color || '#1a1a1a' }}
                                  />
                                  <div className="flex-1 pt-0.5">
                                    <p className="text-sm font-bold text-[#1a1a1a]">{(item as any).stage}</p>
                                    <p className="text-[10px] font-medium text-black/40 uppercase tracking-wider">
                                      {new Date(item.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-amber-500 border-4 border-white shadow-sm shrink-0 z-10 flex items-center justify-center">
                                    <Bell className="w-3 h-3 text-white" />
                                  </div>
                                                                      <div className="flex items-center justify-between group/notif">
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => {
                                          if (!isAdmin) return;
                                          const notif = item as Notification;
                                          setEditingNotificationId(notif.id);
                                          setNotificationData({ date: notif.date, reason: notif.reason });
                                          setIsNotificationModalOpen(true);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-amber-600">Notificação Agendada</p>
                                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-md">
                                            {new Date(item.date).toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                        <p className="text-xs text-black/60 mt-1">{(item as any).reason}</p>
                                        <p className="text-[8px] font-medium text-black/20 uppercase tracking-wider mt-1">
                                          Criada em: {new Date((item as any).createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                      </div>
                                      {isAdmin && (
                                        <button
                                          onClick={() => handleDeleteNotification(selectedProcessForDetail.id!, (item as any).id)}
                                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover/notif:opacity-100 transition-all"
                                          title="Excluir Notificação"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNotificationModalOpen && selectedProcessForDetail && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black/5 rounded-xl">
                    <Bell className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">
                    {editingNotificationId ? 'Editar Notificação' : 'Criar Notificação'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setIsNotificationModalOpen(false);
                    setEditingNotificationId(null);
                    setNotificationData({ date: '', reason: '' });
                  }} 
                  className="p-2 hover:bg-black/5 rounded-full text-black/40"
                >
                  <X />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Data da Notificação</label>
                    <input
                      type="date"
                      value={notificationData.date}
                      onChange={(e) => setNotificationData({ ...notificationData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Motivo da Notificação</label>
                    <textarea
                      rows={4}
                      placeholder="Digite o motivo da notificação..."
                      value={notificationData.reason}
                      onChange={(e) => setNotificationData({ ...notificationData, reason: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  {editingNotificationId && (
                    <button
                      onClick={() => {
                        handleDeleteNotification(selectedProcessForDetail.id!, editingNotificationId);
                        setIsNotificationModalOpen(false);
                        setEditingNotificationId(null);
                        setNotificationData({ date: '', reason: '' });
                      }}
                      className="p-3 rounded-full font-bold border border-red-100 text-red-500 hover:bg-red-50 transition-all"
                      title="Excluir Notificação"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsNotificationModalOpen(false);
                      setEditingNotificationId(null);
                      setNotificationData({ date: '', reason: '' });
                    }}
                    className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateNotification}
                    className="flex-1 px-6 py-3 rounded-full font-bold bg-black text-white hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingNotificationId ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEntityForDetail && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h3 className="text-xl font-sans font-bold text-[#1a1a1a]">
                  {selectedEntityForDetail.type === 'client' ? (clients.find(c => c.id === selectedEntityForDetail.id)?.name || 'Detalhes do Cliente') : 
                   selectedEntityForDetail.type === 'broker' ? (brokers.find(b => b.id === selectedEntityForDetail.id)?.name || 'Detalhes do Corretor') : 
                   (agencies.find(a => a.id === selectedEntityForDetail.id)?.name || 'Detalhes da Imobiliária')}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditingEntity && (
                    <button 
                      onClick={() => {
                        const entity = selectedEntityForDetail.type === 'client' ? clients.find(c => c.id === selectedEntityForDetail.id) :
                                       selectedEntityForDetail.type === 'broker' ? brokers.find(b => b.id === selectedEntityForDetail.id) :
                                       agencies.find(a => a.id === selectedEntityForDetail.id);
                        handleEntityEdit(selectedEntityForDetail.type, entity);
                      }}
                      className="p-2 hover:bg-black/5 rounded-full text-black/40"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedEntityForDetail(null);
                      setIsEditingEntity(false);
                      setEntityFormData(null);
                    }} 
                    className="p-2 hover:bg-black/5 rounded-full text-black/40"
                  >
                    <X />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {isEditingEntity ? (
                  <form onSubmit={handleEntityUpdate} className="space-y-4">
                    {selectedEntityForDetail.type === 'client' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Nome</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.name}
                            onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Email</label>
                          <input
                            required
                            type="email"
                            value={entityFormData.email}
                            onChange={(e) => setEntityFormData({ ...entityFormData, email: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Telefone</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.phone}
                            onChange={(e) => setEntityFormData({ ...entityFormData, phone: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">CPF</label>
                          <input
                            type="text"
                            value={entityFormData.cpf || ''}
                            onChange={(e) => setEntityFormData({ ...entityFormData, cpf: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                      </>
                    )}
                    {selectedEntityForDetail.type === 'broker' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Nome</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.name}
                            onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">CRECI</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.creci}
                            onChange={(e) => setEntityFormData({ ...entityFormData, creci: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Email</label>
                          <input
                            required
                            type="email"
                            value={entityFormData.email}
                            onChange={(e) => setEntityFormData({ ...entityFormData, email: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Telefone</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.phone}
                            onChange={(e) => setEntityFormData({ ...entityFormData, phone: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                      </>
                    )}
                    {selectedEntityForDetail.type === 'agency' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Nome</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.name}
                            onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">CNPJ</label>
                          <input
                            type="text"
                            value={entityFormData.cnpj || ''}
                            onChange={(e) => setEntityFormData({ ...entityFormData, cnpj: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Email</label>
                          <input
                            required
                            type="email"
                            value={entityFormData.email}
                            onChange={(e) => setEntityFormData({ ...entityFormData, email: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-black/40 mb-1">Telefone</label>
                          <input
                            required
                            type="text"
                            value={entityFormData.phone}
                            onChange={(e) => setEntityFormData({ ...entityFormData, phone: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditingEntity(false)}
                        className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 rounded-full font-bold bg-black text-white hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Salvar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {selectedEntityForDetail.type === 'client' && (() => {
                      const client = clients.find(c => c.id === selectedEntityForDetail.id);
                      if (!client) return <p className="text-sm text-black/40">Cliente não encontrado.</p>;
                      return (
                        <div className="space-y-4">
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{client.phone}</span>
                            </div>
                            {client.phone2 && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <Phone className="w-4 h-4 shrink-0" />
                                <span>{client.phone2}</span>
                              </div>
                            )}
                            {client.cpf && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <FileText className="w-4 h-4 shrink-0" />
                                <span>CPF: {client.cpf}</span>
                              </div>
                            )}
                            {client.birthDate && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <Calendar className="w-4 h-4 shrink-0" />
                                <span>Nascimento: {new Date(client.birthDate).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {selectedEntityForDetail.type === 'broker' && (() => {
                      const broker = brokers.find(b => b.id === selectedEntityForDetail.id);
                      if (!broker) return <p className="text-sm text-black/40">Corretor não encontrado.</p>;
                      return (
                        <div className="space-y-4">
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span className="truncate">{broker.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{broker.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <FileText className="w-4 h-4 shrink-0" />
                              <span>CRECI: {broker.creci}</span>
                            </div>
                            {broker.agencyId && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <Building2 className="w-4 h-4 shrink-0" />
                                <span>{agencies.find(a => a.id === broker.agencyId)?.name || 'Imobiliária não identificada'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {selectedEntityForDetail.type === 'agency' && (() => {
                      const agency = agencies.find(a => a.id === selectedEntityForDetail.id);
                      if (!agency) return <p className="text-sm text-black/40">Imobiliária não encontrada.</p>;
                      return (
                        <div className="space-y-4">
                          <div className="pt-4 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span className="truncate">{agency.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-black/60">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{agency.phone}</span>
                            </div>
                            {agency.cnpj && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <FileText className="w-4 h-4 shrink-0" />
                                <span>CNPJ: {agency.cnpj}</span>
                              </div>
                            )}
                            {agency.address && (
                              <div className="flex items-center gap-3 text-sm text-black/60">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span>{agency.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingProcess ? 'Editar Processo' : 'Novo Processo'}</h2>
                <div className="flex items-center gap-2">
                  {editingProcess && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setDeleteConfirmId(editingProcess.id!);
                      }}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    type="submit"
                    form="process-form"
                    className="p-2 hover:bg-black/5 text-[#1a1a1a] rounded-full transition-colors"
                    title="Salvar"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full text-black/40">
                    <X />
                  </button>
                </div>
              </div>
              <form id="process-form" onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-sans font-bold border-b border-black/5 pb-2 text-[#1a1a1a]">Participantes do Processo</h3>
                    
                    <div className="flex flex-col gap-4">
                      {/* Compradores */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-black/60">Compradores</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar no cadastro de clientes..."
                            value={participantSearch.buyer}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, buyer: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        {participantSearch.buyer && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                            {clients
                              .filter(c => c.name.toLowerCase().includes(participantSearch.buyer.toLowerCase()))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    addParticipant('buyer', c.id!, c.name);
                                    setParticipantSearch({ ...participantSearch, buyer: '' });
                                  }}
                                  className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                >
                                  <span>{c.name}</span>
                                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 transition-all">
                          {formData.participants.filter(p => p.type === 'buyer').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-xs text-blue-600 border border-blue-100">
                                {p.name}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-blue-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vendedores */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-black/60">Vendedores</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar no cadastro de clientes..."
                            value={participantSearch.seller}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, seller: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        {participantSearch.seller && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                            {clients
                              .filter(c => c.name.toLowerCase().includes(participantSearch.seller.toLowerCase()))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    addParticipant('seller', c.id!, c.name);
                                    setParticipantSearch({ ...participantSearch, seller: '' });
                                  }}
                                  className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                >
                                  <span>{c.name}</span>
                                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'seller').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full text-xs text-purple-600 border border-purple-100">
                                {p.name}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-purple-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Corretores */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-black/60">Corretores</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar corretor..."
                            value={participantSearch.broker}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, broker: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        {participantSearch.broker && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                            {brokers
                              .filter(b => b.name.toLowerCase().includes(participantSearch.broker.toLowerCase()))
                              .map(b => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    addParticipant('broker', b.id!, b.name);
                                    setParticipantSearch({ ...participantSearch, broker: '' });
                                  }}
                                  className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                >
                                  {b.name}
                                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                </button>
                              ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'broker').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full text-xs text-amber-600 border border-amber-100">
                                {p.name}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-amber-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Imobiliárias */}
                      <div className="space-y-2 relative">
                        <label className="block text-sm font-medium text-black/60">Imobiliárias</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar imobiliária..."
                            value={participantSearch.agency}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, agency: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                        </div>
                        {participantSearch.agency && (
                          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                            {agencies.filter(a => a.name.toLowerCase().includes(participantSearch.agency.toLowerCase())).length > 0 ? (
                              agencies
                                .filter(a => a.name.toLowerCase().includes(participantSearch.agency.toLowerCase()))
                                .map(a => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                      addParticipant('agency', a.id!, a.name);
                                      setParticipantSearch({ ...participantSearch, agency: '' });
                                    }}
                                    className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                  >
                                    {a.name}
                                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                  </button>
                                ))
                            ) : (
                              <div className="p-2 text-xs text-black/40 text-center">Nenhuma imobiliária encontrada</div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'agency').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-black/5 px-3 py-1 rounded-full text-xs text-black border border-black/10">
                                {p.name}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-black"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Tipo de Processo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const type = e.target.value as Process['type'];
                        setFormData({ ...formData, type, stage: (stages as any)[type][0] });
                      }}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    >
                      <option value="Aquisição à vista com FGTS">Aquisição à vista com FGTS</option>
                      <option value="Despachante">Despachante</option>
                      <option value="Financiamento">Financiamento</option>
                      <option value="Home Equity">Home Equity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Valor Compra/Venda</label>
                    <input
                      required
                      type="text"
                      value={formatCurrency(formData.purchaseValue)}
                      onChange={(e) => handleCurrencyChange('purchaseValue', e.target.value)}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                  {(formData.type === 'Financiamento' || formData.type === 'Home Equity') && (
                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Valor Financiamento</label>
                      <input
                        required
                        type="text"
                        value={formatCurrency(formData.financingValue)}
                        onChange={(e) => handleCurrencyChange('financingValue', e.target.value)}
                        className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                      />
                    </div>
                  )}
                  {formData.type === 'Financiamento' && (
                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Tipo de Financiamento</label>
                      <select
                        value={formData.financingType}
                        onChange={(e) => setFormData({ ...formData, financingType: e.target.value as any })}
                        className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                      >
                        <option value="SBPE">SBPE</option>
                        <option value="MCMV">MCMV</option>
                        <option value="Pró-Cotista">Pró-Cotista</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Etapa Atual</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    >
                      {(stages as any)[formData.type].map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Banco</label>
                    <select
                      value={formData.bankId}
                      onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    >
                      <option value="">Selecione um banco</option>
                      {banks
                        .filter(b => {
                          if (formData.type === 'Home Equity') {
                            return b.processTypes?.includes('Home Equity');
                          }
                          if (formData.type === 'Financiamento') {
                            return b.processTypes?.includes(formData.financingType as any);
                          }
                          return true; // Despachante and FGTS show all banks
                        })
                        .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Observações</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none resize-none"
                    />
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center border border-black/10"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#1a1a1a]">Excluir Processo?</h3>
              <p className="text-black/60 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 px-6 py-3 rounded-full font-bold bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
