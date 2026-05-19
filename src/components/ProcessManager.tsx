import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Process, Client, Bank, Agency, Broker, Participant, Notification, Property } from '../types';
import { resolveParticipantName } from '../utils/participantUtils';
import { Plus, Search, Trash2, Edit2, X, FileText, Clock, DollarSign, Building2, User, Users, CheckCircle2, Ban, Pause, AlertCircle, Save, Phone, Mail, MapPin, Calendar, Briefcase, Filter, Bell, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba, getContrastColor } from '../utils/colors';
import PropertyModal from './PropertyModal';
import ClientModal from './ClientModal';

interface ProcessManagerProps {
  initialSelectedProcessId?: string | null;
  initialNewProcessClientId?: string | null;
  initialNewProcessRole?: 'buyer' | 'seller' | null;
  onCloseDetail?: () => void;
  onOpenClient?: (id: string) => void;
}

export default function ProcessManager({ initialSelectedProcessId, initialNewProcessClientId, initialNewProcessRole, onCloseDetail, onOpenClient }: ProcessManagerProps) {
  const { isAdmin } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [currentClientRole, setCurrentClientRole] = useState<'buyer' | 'seller'>('buyer');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [selectedProcessForDetail, setSelectedProcessForDetail] = useState<Process | null>(null);
  const [selectedEntityForDetail, setSelectedEntityForDetail] = useState<{ type: 'client' | 'broker' | 'agency', id: string } | null>(null);
  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [entityFormData, setEntityFormData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('updated-desc');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [editingHistoryDate, setEditingHistoryDate] = useState<{ type: 'stage' | 'notification' | 'dispatcher', index?: number, id?: string, date: string, label: string } | null>(null);
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
    agency: '',
    proxy: ''
  });
  const [formData, setFormData] = useState({
    clientId: '',
    participants: [] as Participant[],
    type: 'Financiamento' as Process['type'],
    status: 'Em andamento',
    stage: 'Aprovado',
    bankId: '',
    propertyId: '',
    purchaseValue: 0,
    financingValue: 0,
    financingType: 'SBPE' as Process['financingType'],
    isAssistedPurchase: false,
    assistedPurchaseValue: 0,
    hasDispatcher: false,
    dispatcherValue: 0,
    isDispatcherPaid: false,
    dispatcherPaymentDate: new Date().toISOString().split('T')[0],
    hasIQ: false,
    iqBankId: '',
    iqDebtValue: 0,
    value: 0,
    agency: '',
    signatureType: '' as 'Digital' | 'Física' | '',
    notes: '',
  });

  const stages = {
    'Aquisição à vista com FGTS': ['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado'],
    'Despachante': ['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado'],
    'Financiamento': ['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado'],
    'Home Equity': ['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado']
  };

  const allStages = ['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const handleCurrencyChange = (field: 'purchaseValue' | 'financingValue' | 'dispatcherValue' | 'assistedPurchaseValue' | 'iqDebtValue', value: string) => {
    const numericValue = parseCurrency(value);
    setFormData({ ...formData, [field]: numericValue });
  };

  useEffect(() => {
    if (initialNewProcessClientId && clients.length > 0) {
      setEditingProcess(null);
      const clientName = getClientName(initialNewProcessClientId);
      setFormData({
        clientId: initialNewProcessClientId,
        participants: [{ 
          id: initialNewProcessClientId, 
          type: initialNewProcessRole || 'buyer', 
          name: clientName 
        }],
        type: 'Financiamento',
        status: 'Em andamento',
        stage: 'Aprovado',
        bankId: '',
        propertyId: '',
        purchaseValue: 0,
        financingValue: 0,
        financingType: 'SBPE',
        isAssistedPurchase: false,
        assistedPurchaseValue: 0,
        hasDispatcher: false,
        dispatcherValue: 0,
        isDispatcherPaid: false,
        dispatcherPaymentDate: new Date().toISOString().split('T')[0],
        hasIQ: false,
        iqBankId: '',
        iqDebtValue: 0,
        value: 0,
        agency: '',
        signatureType: '' as 'Digital' | 'Física' | '',
        notes: '',
      });
      setIsModalOpen(true);
    }
  }, [initialNewProcessClientId, initialNewProcessRole, clients]);
  useEffect(() => {
    if (initialSelectedProcessId && processes.length > 0) {
      const process = processes.find(p => p.id === initialSelectedProcessId);
      if (process) {
        setSelectedProcessForDetail(process);
      }
    }
  }, [initialSelectedProcessId, processes]);

  useEffect(() => {
    if (selectedProcessForDetail) {
      const updatedProcess = processes.find(p => p.id === selectedProcessForDetail.id);
      if (updatedProcess && JSON.stringify(updatedProcess) !== JSON.stringify(selectedProcessForDetail)) {
        setSelectedProcessForDetail(updatedProcess);
      }
    }
  }, [processes, selectedProcessForDetail]);

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

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Desconhecido';
  const getBankName = (id: string) => banks.find(b => b.id === id)?.name || 'N/A';
  const getParticipantName = (p: Participant) => resolveParticipantName(p, clients, brokers, agencies);

  const filteredProcesses = processes.filter(process => {
    const buyers = process.participants?.filter(p => p.type === 'buyer') || [];
    const sellers = process.participants?.filter(p => p.type === 'seller') || [];
    const brokersList = process.participants?.filter(p => p.type === 'broker') || [];
    const agenciesList = process.participants?.filter(p => p.type === 'agency') || [];
    
    const searchMatch = 
      buyers.some(p => getParticipantName(p).toLowerCase().includes(searchTerm.toLowerCase())) ||
      sellers.some(p => getParticipantName(p).toLowerCase().includes(searchTerm.toLowerCase())) ||
      brokersList.some(p => getParticipantName(p).toLowerCase().includes(searchTerm.toLowerCase())) ||
      agenciesList.some(p => getParticipantName(p).toLowerCase().includes(searchTerm.toLowerCase())) ||
      process.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const bankMatch = !filters.bankId || process.bankId === filters.bankId;
    const typeMatch = !filters.type || process.type === filters.type;
    
    // Logic: 'Finalizado' processes only appear if explicitly selected in the filter
    const stageMatch = filters.stage 
      ? process.stage === filters.stage 
      : process.stage !== 'Finalizado';

    const brokerMatch = !filters.brokerId || process.brokerId === filters.brokerId || brokersList.some(p => p.id === filters.brokerId);
    
    const agencyMatch = !filters.agencyId || agenciesList.some(p => p.id === filters.agencyId) || (() => {
      const broker = brokers.find(b => b.id === process.brokerId);
      return broker?.agencyId === filters.agencyId;
    })();

    const financingTypeMatch = !filters.financingType || process.financingType === filters.financingType;

    return searchMatch && bankMatch && typeMatch && stageMatch && brokerMatch && agencyMatch && financingTypeMatch;
  });

  const sortedProcesses = [...filteredProcesses].sort((a, b) => {
    switch (sortOrder) {
      case 'value-desc':
        return (b.purchaseValue || 0) - (a.purchaseValue || 0);
      case 'value-asc':
        return (a.purchaseValue || 0) - (b.purchaseValue || 0);
      case 'buyer-asc': {
        const buyerA = a.participants?.find(p => p.type === 'buyer');
        const buyerB = b.participants?.find(p => p.type === 'buyer');
        const nameA = buyerA ? resolveParticipantName(buyerA, clients, brokers, agencies) : '';
        const nameB = buyerB ? resolveParticipantName(buyerB, clients, brokers, agencies) : '';
        return nameA.localeCompare(nameB);
      }
      case 'stage-asc': {
        return allStages.indexOf(a.stage) - allStages.indexOf(b.stage);
      }
      default: // updated-desc
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    }
  });

  useEffect(() => {
    setTitle('Processos');
    setActions(
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 text-white border border-white/10 font-black text-sm shadow-sm">
          {sortedProcesses.length}
        </div>
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
        <button
          onClick={() => setIsSortOpen(prev => !prev)}
          className={cn(
            "p-2 rounded-lg transition-all border shadow-sm",
            isSortOpen
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Ordernar"
        >
          <ArrowUpDown className="w-5 h-5" />
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
                propertyId: '',
                purchaseValue: 0,
                financingValue: 0,
                financingType: 'SBPE',
                isAssistedPurchase: false,
                assistedPurchaseValue: 0,
                hasDispatcher: false,
                dispatcherValue: 0,
                isDispatcherPaid: false,
                dispatcherPaymentDate: new Date().toISOString().split('T')[0],
                hasIQ: false,
                iqBankId: '',
                iqDebtValue: 0,
                value: 0,
                agency: '',
                signatureType: '' as 'Digital' | 'Física' | '',
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
  }, [isSearchOpen, searchTerm, isFilterOpen, filters, isSortOpen, sortOrder, isAdmin, sortedProcesses.length]);

  useEffect(() => {
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients((data as Client[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks((data as Bank[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies((data as Agency[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers((data as Broker[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubProperties = api.subscribeToCollection('properties', (data) => {
      setProperties((data as Property[]).sort((a, b) => a.address.localeCompare(b.address)));
    });

    return () => {
      unsubProcesses();
      unsubClients();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
      unsubProperties();
    };
  }, []);

  const handleUpdateHistoryDate = async () => {
    if (!selectedProcessForDetail || !editingHistoryDate) return;

    const updatedProcess = { ...selectedProcessForDetail };
    
    if (editingHistoryDate.type === 'stage' && editingHistoryDate.index !== undefined) {
      const history = [...(updatedProcess.stageHistory || [])];
      // Keep the time if it's a stage (ISO string)
      const oldDate = new Date(history[editingHistoryDate.index].date);
      const newDateParts = editingHistoryDate.date.split('-'); // YYYY-MM-DD
      const updatedDate = new Date(oldDate);
      updatedDate.setFullYear(parseInt(newDateParts[0]));
      updatedDate.setMonth(parseInt(newDateParts[1]) - 1);
      updatedDate.setDate(parseInt(newDateParts[2]));
      
      history[editingHistoryDate.index] = { ...history[editingHistoryDate.index], date: updatedDate.toISOString() };
      updatedProcess.stageHistory = history;
    } else if (editingHistoryDate.type === 'dispatcher') {
      updatedProcess.dispatcherPaymentDate = editingHistoryDate.date;
    } else if (editingHistoryDate.type === 'notification' && editingHistoryDate.id) {
      updatedProcess.notifications = (updatedProcess.notifications || []).map(n => 
        n.id === editingHistoryDate.id ? { ...n, date: editingHistoryDate.date } : n
      );
    }

    updatedProcess.updatedAt = new Date().toISOString();

    try {
      await api.update('processes', updatedProcess.id!, updatedProcess);
      setSelectedProcessForDetail(updatedProcess);
      setEditingHistoryDate(null);
    } catch (error) {
      console.error("Erro ao atualizar data do histórico:", error);
    }
  };

  const handleCreateNotification = async () => {
    if (!selectedProcessForDetail || !notificationData.date || !notificationData.reason) return;

    let updatedNotifications: Notification[];

    if (editingNotificationId) {
      updatedNotifications = (selectedProcessForDetail.notifications || []).map(n => 
        n.id === editingNotificationId 
          ? { ...n, date: notificationData.date, reason: notificationData.reason, completed: false }
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

    let updatedNotifications = process.notifications || [];
    if (newStage === 'Vistoria') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 6);
      
      const newNotification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        date: dueDate.toISOString().split('T')[0],
        reason: 'Vistoria',
        createdAt: new Date().toISOString(),
        completed: false
      };
      updatedNotifications = [...updatedNotifications, newNotification];
    }

    const updatedProcess: Process = {
      ...process,
      stage: newStage,
      stageHistory: [...(process.stageHistory || []), historyEntry],
      notifications: updatedNotifications,
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
    let notifications = editingProcess?.notifications || [];
    
    // Record history if it's a new process or the stage has changed or history is empty
    if (!editingProcess || editingProcess.stage !== formData.stage || stageHistory.length === 0) {
      stageHistory = [...stageHistory, { stage: formData.stage, date: now }];

      // Auto notification for Vistoria
      if (formData.stage === 'Vistoria') {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 6);
        
        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          date: dueDate.toISOString().split('T')[0],
          reason: 'Vistoria',
          createdAt: now,
          completed: false
        };
        notifications = [...notifications, newNotification];
      }
    }

    const processData = {
      ...formData,
      stageHistory,
      notifications,
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
      onCloseDetail?.();
      setFormData({ 
        clientId: '', 
        participants: [], 
        type: 'Financiamento', 
        status: 'Em andamento', 
        stage: 'Aprovado', 
        bankId: '', 
        propertyId: '',
        purchaseValue: 0,
        financingValue: 0,
        financingType: 'SBPE',
        isAssistedPurchase: false,
        assistedPurchaseValue: 0,
        hasDispatcher: false,
        dispatcherValue: 0,
        isDispatcherPaid: false,
        dispatcherPaymentDate: new Date().toISOString().split('T')[0],
        hasIQ: false,
        iqBankId: '',
        iqDebtValue: 0,
        value: 0,
        agency: '',
        signatureType: '' as 'Digital' | 'Física' | '',
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
    'Aprovado': { color: '#ffedd5', percent: 11.1 },
    'Vistoria': { color: '#fed7aa', percent: 22.2 },
    'Documentos': { color: '#fcd34d', percent: 33.3 },
    'Conformidade': { color: '#fdba74', percent: 44.4 },
    'Recursos': { color: '#fbbf24', percent: 55.5 },
    'Contrato': { color: '#fb923c', percent: 66.6 },
    'ITBI': { color: '#f97316', percent: 77.7 },
    'Registro': { color: '#ea580c', percent: 88.8 },
    'Finalizado': { color: '#c2410c', percent: 100 },
  };

  const getDaysInCurrentStage = (process: Process) => {
    const lastHistory = process.stageHistory && process.stageHistory.length > 0 
      ? process.stageHistory[process.stageHistory.length - 1]
      : { date: process.updatedAt || new Date().toISOString() };

    const startDate = new Date(lastHistory.date);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days === 0 ? 1 : days; // Show at least 1 day if it's in the stage
  };

  const getFinishedDate = (process: Process) => {
    const finishedEntry = process.stageHistory?.find(h => h.stage === 'Finalizado');
    const dateStr = finishedEntry?.date || process.updatedAt || new Date().toISOString();
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleEntityEdit = (type: 'client' | 'broker' | 'agency', entity: any) => {
    setEntityFormData({ ...entity });
    setIsEditingEntity(true);
  };

  const handleEntityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityForDetail || !entityFormData) return;

    const capitalize = (str: string) => {
      if (!str) return '';
      return str.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
    };

    try {
      const collection = selectedEntityForDetail.type === 'client' ? 'clients' : 
                         selectedEntityForDetail.type === 'broker' ? 'brokers' : 'agencies';
      
      const formattedData = { ...entityFormData };
      
      if (formattedData.name) formattedData.name = capitalize(formattedData.name);
      if (formattedData.email) formattedData.email = formattedData.email.toLowerCase();
      if (formattedData.address) formattedData.address = capitalize(formattedData.address);
      if (formattedData.neighborhood) formattedData.neighborhood = capitalize(formattedData.neighborhood);
      if (formattedData.city) formattedData.city = capitalize(formattedData.city);
      if (formattedData.complement) formattedData.complement = capitalize(formattedData.complement);
      
      await api.update(collection as any, selectedEntityForDetail.id, formattedData);
      
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

  return (
    <div className="space-y-6">
      {/* Stage Filter Bar */}
      <div className="grid grid-cols-9 gap-1 bg-white p-1 rounded-xl border border-black/5 shadow-sm">
        {allStages.map((s) => {
          const isSelected = filters.stage === s;
          
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilters({ ...filters, stage: isSelected ? '' : s })}
              className={cn(
                "h-5 flex items-center justify-start rounded-md transition-all border px-1.5 outline-none truncate",
                isSelected 
                  ? "bg-black text-white border-transparent shadow-sm ring-1 ring-black/10 ring-offset-1 scale-[1.02] z-10" 
                  : "bg-[#f3f4f6] text-black/30 border-transparent hover:bg-black/5"
              )}
            >
              <span className="text-[6.5px] font-bold uppercase tracking-tighter transition-colors">
                {s}
              </span>
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
                  {['Aprovado', 'Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro', 'Finalizado'].map(s => (
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

      <AnimatePresence>
        {isSortOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-4 rounded-[24px] border border-black/5 shadow-sm flex flex-wrap gap-2">
              <button
                onClick={() => setSortOrder('value-desc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'value-desc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Valor: Maior → Menor
              </button>
              <button
                onClick={() => setSortOrder('value-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'value-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Valor: Menor → Maior
              </button>
              <button
                onClick={() => setSortOrder('buyer-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'buyer-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Comprador: A-Z
              </button>
              <button
                onClick={() => setSortOrder('stage-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'stage-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Etapa do Processo
              </button>
              <button
                onClick={() => setSortOrder('updated-desc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'updated-desc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Mais Recentes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3">
        {sortedProcesses.map((process) => {
          const buyers = process.participants?.filter(p => p.type === 'buyer') || [];
          const sellers = process.participants?.filter(p => p.type === 'seller') || [];
          const brokersList = process.participants?.filter(p => p.type === 'broker') || [];
          const agenciesList = process.participants?.filter(p => p.type === 'agency') || [];

          const isFinance = process.type === 'Financiamento' || process.type === 'Home Equity';
          const bankColor = banks.find(b => b.id === process.bankId)?.color || stageConfig[process.stage]?.color || '#000000';

          const openEditModal = (process: Process) => {
            setEditingProcess(process);
            setFormData({
              clientId: process.clientId,
              participants: process.participants || [],
              type: process.type,
              status: process.status,
              stage: process.stage,
              bankId: process.bankId || '',
              propertyId: process.propertyId || '',
              purchaseValue: process.purchaseValue || 0,
              financingValue: process.financingValue || 0,
              financingType: process.financingType || 'SBPE',
              isAssistedPurchase: process.isAssistedPurchase || false,
              assistedPurchaseValue: process.assistedPurchaseValue || 0,
              hasDispatcher: process.hasDispatcher || false,
              dispatcherValue: process.dispatcherValue || 0,
              isDispatcherPaid: process.isDispatcherPaid || false,
              dispatcherPaymentDate: process.dispatcherPaymentDate || new Date().toISOString().split('T')[0],
              hasIQ: process.hasIQ || false,
              iqBankId: process.iqBankId || '',
              iqDebtValue: process.iqDebtValue || 0,
              value: process.value,
              agency: process.agency || '',
              signatureType: process.signatureType || '',
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
              onClick={() => openDetailModal(process)}
              className="bg-white p-4 rounded-[24px] shadow-sm border hover:shadow-md transition-all relative cursor-pointer"
              style={{ 
                borderColor: hexToRgba(bankColor, 0.3)
              }}
            >
              <div className="w-full space-y-2.5">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Compradores</p>
                    <div className="flex flex-col gap-1">
                      {buyers.length > 0 ? buyers.map((p, i) => (
                          <div 
                            key={i}
                            className="text-sm font-semibold text-[#1a1a1a]"
                          >
                            {getParticipantName(p)}
                          </div>
                      )) : <span className="text-sm text-black/20">-</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Days in stage counter or Finish date */}
                    <div className="flex items-center gap-1">
                      {process.stage === 'Finalizado' ? (
                        <div 
                          className="h-8 px-2 flex items-center gap-1.5 rounded-lg border transition-colors" 
                          title="Data de Finalização"
                          style={{ 
                            backgroundColor: hexToRgba(bankColor, 0.05),
                            borderColor: hexToRgba(bankColor, 0.1)
                          }}
                        >
                          <Calendar className="w-3.5 h-3.5" style={{ color: bankColor }} />
                          <span className="text-[10px] font-bold" style={{ color: bankColor }}>{getFinishedDate(process)}</span>
                        </div>
                      ) : (
                        <div 
                          className="h-8 px-2 flex items-center gap-1.5 rounded-lg border transition-colors" 
                          title="Dias na etapa atual"
                          style={{ 
                            backgroundColor: hexToRgba(bankColor, 0.05),
                            borderColor: hexToRgba(bankColor, 0.1)
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" style={{ color: bankColor }} />
                          <span className="text-[10px] font-bold" style={{ color: bankColor }}>{getDaysInCurrentStage(process)}d</span>
                        </div>
                      )}
                      {process.notifications?.some(n => {
                        const now = new Date();
                        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        return n.date >= today;
                      }) && (
                        <div 
                          className="h-8 w-8 flex items-center justify-center rounded-lg border transition-colors" 
                          title="Possui notificações ativas"
                          style={{ 
                            backgroundColor: hexToRgba(bankColor, 0.05),
                            borderColor: hexToRgba(bankColor, 0.1)
                          }}
                        >
                          <Bell className="w-3.5 h-3.5" style={{ color: bankColor, fill: hexToRgba(bankColor, 0.2) }} />
                        </div>
                      )}
                    </div>

                    {/* Bank Logo - Top Right */}
                    {(() => {
                      const bankLogo = banks.find(b => b.id === process.bankId)?.logoUrl;
                      return process.bankId && bankLogo ? (
                        <div className="h-8 w-8 bg-black/5 rounded-lg overflow-hidden shrink-0">
                          <img 
                            src={bankLogo} 
                            alt="Bank" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {process.propertyId && (() => {
                  const property = properties.find(p => p.id === process.propertyId);
                  if (!property) return null;
                  return (
                    <div 
                      className="flex items-center gap-2 py-1.5 px-2 rounded-xl border transition-colors"
                      style={{ 
                        backgroundColor: hexToRgba(bankColor, 0.05),
                        borderColor: hexToRgba(bankColor, 0.1)
                      }}
                    >
                      <MapPin className="w-3 h-3" style={{ color: bankColor }} />
                      <span className="text-[10px] font-bold truncate" style={{ color: bankColor }}>
                        {property.address}{property.number ? `, ${property.number}` : ''} - {property.neighborhood}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Compra/Venda</p>
                    <p className="text-sm font-bold text-[#1a1a1a]">
                      R$ {(process.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {isFinance && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Financiamento</p>
                        {process.financingType === 'MCMV' && process.isAssistedPurchase && (
                          <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded">Assistida</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#1a1a1a]">
                        R$ {(process.financingValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Segmented Progress Bar */}
                <div className="grid grid-cols-9 gap-1">
                  {allStages.map((s, idx) => {
                    const isCurrent = s === process.stage;
                    const stageIdx = allStages.indexOf(s);
                    const currentIdx = allStages.indexOf(process.stage);
                    const isPast = stageIdx < currentIdx;
                    
                    const bank = banks.find(b => b.id === process.bankId);
                    const baseColor = bank?.color || '#f97316'; // Default to orange-500
                    const opacities = [0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.75, 0.85, 1];
                    const opacity = opacities[idx] || 1;
                    
                    const bgColor = hexToRgba(baseColor, opacity);
                    const textColor = opacity > 0.5 ? getContrastColor(baseColor) : 'rgba(0, 0, 0, 0.6)';
                    const borderColor = hexToRgba(baseColor, opacity + 0.1);

                    return (
                      <div 
                        key={s}
                        className={cn(
                          "h-5 flex items-center justify-start rounded-md transition-all border px-1.5",
                          (isCurrent || isPast) ? "" : "text-black/20 border-black/5 bg-[#f5f5f0]/50",
                          isCurrent && "shadow-sm ring-1"
                        )}
                        style={{ 
                          backgroundColor: (isCurrent || isPast) ? bgColor : undefined,
                          color: (isCurrent || isPast) ? textColor : undefined,
                          borderColor: (isCurrent || isPast) ? borderColor : undefined,
                          boxShadow: isCurrent ? `0 0 0 2px ${hexToRgba(baseColor, 0.2)}` : undefined
                        }}
                      >
                        <span className="text-[6.5px] font-bold uppercase truncate tracking-tighter">{s}</span>
                      </div>
                    );
                  })}
                </div>
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
              <div className="px-5 pt-6 pb-4 border-b border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  {/* Bank, Type and Stage */}
                  <div className="flex items-center gap-3 bg-black/5 p-3 rounded-2xl">
                    {(() => {
                      const bankLogo = banks.find(b => b.id === selectedProcessForDetail.bankId)?.logoUrl;
                      return selectedProcessForDetail.bankId && bankLogo ? (
                        <div className="h-10 w-10 bg-white rounded-xl overflow-hidden shrink-0 shadow-sm border border-black/5">
                          <img 
                            src={bankLogo} 
                            alt="Bank" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : null;
                    })()}
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-[#1a1a1a] uppercase tracking-wider">
                        {selectedProcessForDetail.type}
                        {selectedProcessForDetail.financingType && ` - ${selectedProcessForDetail.financingType}`}
                      </p>
                      {selectedProcessForDetail.agency && (
                        <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                          Agência: {selectedProcessForDetail.agency}
                        </p>
                      )}
                      {selectedProcessForDetail.signatureType && (
                        <p className="text-[9px] font-bold text-blue-600 uppercase mt-0.5">
                          Assinatura: {selectedProcessForDetail.signatureType}
                        </p>
                      )}
                      <p className="text-[10px] font-medium text-black/40 uppercase tracking-widest mt-0.5">
                        {selectedProcessForDetail.stage}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
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
                              propertyId: process.propertyId || '',
                              purchaseValue: process.purchaseValue || 0,
                              financingValue: process.financingValue || 0,
                              financingType: process.financingType || 'SBPE',
                              isAssistedPurchase: process.isAssistedPurchase || false,
                              assistedPurchaseValue: process.assistedPurchaseValue || 0,
                              hasDispatcher: process.hasDispatcher || false,
                              dispatcherValue: process.dispatcherValue || 0,
                              isDispatcherPaid: process.isDispatcherPaid || false,
                              dispatcherPaymentDate: process.dispatcherPaymentDate || new Date().toISOString().split('T')[0],
                              hasIQ: process.hasIQ || false,
                              iqBankId: process.iqBankId || '',
                              iqDebtValue: process.iqDebtValue || 0,
                              value: process.value,
                              agency: process.agency || '',
                              signatureType: process.signatureType || '',
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
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 
                    onClick={() => {
                      if (selectedProcessForDetail.clientId) onOpenClient?.(selectedProcessForDetail.clientId);
                    }}
                    className="text-2xl font-bold text-[#1a1a1a] hover:text-black/60 transition-colors cursor-pointer"
                  >
                    {clients.find(c => c.id === selectedProcessForDetail.clientId)?.name}
                  </h2>
                </div>
              </div>
              <div className="px-5 pt-4 pb-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Compradores</p>
                        <div className="space-y-0.5">
                          {selectedProcessForDetail.participants?.filter(p => p.type === 'buyer').map((p, i) => (
                            <button 
                              key={i} 
                              onClick={() => {
                                if (p.id) onOpenClient?.(p.id);
                              }}
                              className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                            >
                              {getParticipantName(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Vendedores</p>
                        <div className="space-y-0.5">
                          {selectedProcessForDetail.participants?.filter(p => p.type === 'seller').map((p, i) => (
                            <button 
                              key={i} 
                              onClick={() => {
                                if (p.id) onOpenClient?.(p.id);
                              }}
                              className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                            >
                              {getParticipantName(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedProcessForDetail.participants?.some(p => p.type === 'proxy') && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Procuradores</p>
                        <div className="space-y-2">
                          {selectedProcessForDetail.participants?.filter(p => p.type === 'proxy').map((p, i) => (
                            <div key={i} className="text-sm">
                              <button 
                                onClick={() => {
                                  if (p.id) onOpenClient?.(p.id);
                                }}
                                className="text-[#1a1a1a] font-medium hover:text-black/60 transition-colors"
                              >
                                {getParticipantName(p)}
                              </button>
                              {p.representsIds && p.representsIds.length > 0 && (
                                <span className="text-[10px] text-black/40 italic ml-2">
                                  (Procurador de: {p.representsIds.map(rid => {
                                    const rep = selectedProcessForDetail.participants?.find(part => part.id === rid);
                                    return rep ? getParticipantName(rep) : 'N/A';
                                  }).join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProcessForDetail.propertyId && (() => {
                      const property = properties.find(p => p.id === selectedProcessForDetail.propertyId);
                      if (!property) return null;
                      return (
                        <div className="p-4 bg-[#f5f5f0] rounded-2xl border border-black/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-black/40" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Imóvel</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-[#1a1a1a]">
                              {property.address}{property.number ? `, ${property.number}` : ''}{property.complement ? ` - ${property.complement}` : ''}
                            </p>
                            <p className="text-xs text-black/60">
                              {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city} - {property.state}
                            </p>
                            {(property.registrationNumber || property.zone) && (
                              <div className="flex gap-3 pt-1">
                                {property.registrationNumber && (
                                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">
                                    Matrícula: <span className="text-black/60">{property.registrationNumber}</span>
                                  </p>
                                )}
                                {property.zone && (
                                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">
                                    Zona: <span className="text-black/60">{property.zone}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Imobiliárias</p>
                        <div className="space-y-0.5">
                          {selectedProcessForDetail.participants?.filter(p => p.type === 'agency').map((p, i) => (
                            <button 
                              key={i} 
                              onClick={() => setSelectedEntityForDetail({ type: 'agency', id: p.id })}
                              className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                            >
                              {getParticipantName(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Corretores</p>
                        <div className="space-y-0.5">
                          {selectedProcessForDetail.participants?.filter(p => p.type === 'broker').map((p, i) => (
                            <button 
                              key={i} 
                              onClick={() => setSelectedEntityForDetail({ type: 'broker', id: p.id })}
                              className="text-sm text-[#1a1a1a] font-medium hover:text-black/60 transition-colors block text-left"
                            >
                              {getParticipantName(p)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
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
                  {selectedProcessForDetail.financingType === 'MCMV' && selectedProcessForDetail.isAssistedPurchase && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Compra Assistida</p>
                      <p className="text-sm font-bold text-blue-600">Marcado como compra assistida</p>
                    </div>
                  )}
                  {selectedProcessForDetail.hasDispatcher && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Despachante</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">{formatCurrency(selectedProcessForDetail.dispatcherValue || 0)}</p>
                    </div>
                  )}
                  {selectedProcessForDetail.hasIQ && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Interveniente Quitante</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">
                        {getBankName(selectedProcessForDetail.iqBankId || '')} - {formatCurrency(selectedProcessForDetail.iqDebtValue || 0)}
                      </p>
                    </div>
                  )}
                  </div>
                </div>

                {selectedProcessForDetail.notes && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Observações</p>
                    <p className="text-sm text-black/60 bg-[#f5f5f0] p-3 rounded-2xl border border-black/5">{selectedProcessForDetail.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-black/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-black/40" />
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-black/40">Histórico e Notificações</h4>
                  </div>
                  <div className="space-y-4">
                    {(() => {
                      const timelineData = [
                        ...(selectedProcessForDetail.stageHistory || []).map(h => ({ ...h, type: 'stage' as const })),
                        ...(selectedProcessForDetail.notifications || []).map(n => ({ ...n, type: 'notification' as const })),
                        ...(selectedProcessForDetail.isDispatcherPaid && selectedProcessForDetail.dispatcherPaymentDate ? [{
                          stage: `Despachante - ${formatCurrency(selectedProcessForDetail.dispatcherValue || 0)}`,
                          date: selectedProcessForDetail.dispatcherPaymentDate,
                          type: 'dispatcher' as const
                        }] : [])
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (timelineData.length === 0) {
                        return (
                          <div className="text-center py-4 bg-[#f5f5f0] rounded-2xl border border-dashed border-black/10">
                            <p className="text-xs text-black/40">Nenhum histórico disponível.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {timelineData.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 relative">
                              {i !== timelineData.length - 1 && (
                                <div className="absolute left-[11px] top-6 bottom-[-16px] w-px bg-black/5" />
                              )}
                              {item.type === 'stage' || item.type === 'dispatcher' ? (
                                <>
                                  <div 
                                    className={cn(
                                      "w-6 h-6 rounded-full border-4 border-white shadow-sm shrink-0 z-10",
                                    )}
                                    style={{
                                      backgroundColor: (() => {
                                        if (item.type === 'dispatcher') return '#10b981';
                                        const stageName = (item as any).stage;
                                        const idx = allStages.indexOf(stageName);
                                        const bank = banks.find(b => b.id === selectedProcessForDetail.bankId);
                                        const baseColor = bank?.color || '#f97316';
                                        const opacities = [0.15, 0.2, 0.3, 0.4, 0.5, 0.65, 0.75, 0.85, 1];
                                        return hexToRgba(baseColor, opacities[idx] || 1);
                                      })()
                                    }}
                                  />
                                  <div 
                                    className={cn(
                                      "flex-1 pt-0.5 group/stage",
                                      isAdmin && "cursor-pointer"
                                    )}
                                    onClick={() => {
                                      if (!isAdmin) return;
                                      if (item.type === 'dispatcher') {
                                        setEditingHistoryDate({
                                          type: 'dispatcher',
                                          date: item.date,
                                          label: item.stage
                                        });
                                        return;
                                      }
                                      const stageItem = item as any;
                                      // Find the real index in stageHistory
                                      const realIndex = (selectedProcessForDetail.stageHistory || []).findIndex(h => h.stage === stageItem.stage && h.date === stageItem.date);
                                      if (realIndex !== -1) {
                                        setEditingHistoryDate({
                                          type: 'stage',
                                          index: realIndex,
                                          date: stageItem.date.split('T')[0],
                                          label: stageItem.stage
                                        });
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-[#1a1a1a]">{ (item as any).stage }</p>
                                      {isAdmin && <Edit2 className="w-3 h-3 text-black/10 opacity-0 group-hover/stage:opacity-100 transition-opacity" />}
                                    </div>
                                    <p className="text-[10px] font-medium text-black/40 uppercase tracking-wider">
                                      {new Date(item.date + (item.type === 'dispatcher' ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        ...(item.type !== 'dispatcher' && {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      })}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-amber-500 border-4 border-white shadow-sm shrink-0 z-10 flex items-center justify-center">
                                    <Bell className="w-3 h-3 text-white" />
                                  </div>
                                              <div className="flex-1">
                                    <div className="flex items-center justify-between group/notif">
                                      <div 
                                        className="flex-1 cursor-pointer group/date"
                                        onClick={() => {
                                          if (!isAdmin) return;
                                          const notif = item as Notification;
                                          setEditingHistoryDate({
                                            type: 'notification',
                                            id: notif.id,
                                            date: notif.date,
                                            label: notif.reason
                                          });
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold text-amber-600">Notificação Agendada</p>
                                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-md flex items-center gap-1 group-hover/date:bg-amber-200 transition-colors">
                                            {(() => {
                                              const [y, m, d] = item.date.split('-');
                                              return `${d}/${m}/${y}`;
                                            })()}
                                            {isAdmin && <Edit2 className="w-2 h-2" />}
                                          </span>
                                        </div>
                                        <p className="text-xs text-black/60 mt-1">{(item as any).reason}</p>
                                        <p className="text-[8px] font-medium text-black/20 uppercase tracking-wider mt-1">
                                          Criada em: {(() => {
                                            const [datePart] = (item as any).createdAt.split('T');
                                            const [y, m, d] = datePart.split('-');
                                            return `${d}/${m}/${y}`;
                                          })()}
                                        </p>
                                      </div>
                                      {isAdmin && (
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => {
                                              const notif = item as Notification;
                                              setEditingNotificationId(notif.id);
                                              setNotificationData({ date: notif.date, reason: notif.reason });
                                              setIsNotificationModalOpen(true);
                                            }}
                                            className="p-1.5 text-black/20 hover:text-black/40 hover:bg-black/5 rounded-lg opacity-0 group-hover/notif:opacity-100 transition-all"
                                            title="Editar Motivo"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteNotification(selectedProcessForDetail.id!, (item as any).id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover/notif:opacity-100 transition-all"
                                            title="Excluir Notificação"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
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
        {editingHistoryDate && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xs rounded-[32px] shadow-2xl overflow-hidden border border-black/10"
            >
              <div className="p-5 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-black/40" />
                  <h3 className="text-sm font-bold text-[#1a1a1a]">Alterar Data</h3>
                </div>
                <button 
                  onClick={() => setEditingHistoryDate(null)} 
                  className="p-1.5 hover:bg-black/5 rounded-full text-black/40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2">{editingHistoryDate.label}</p>
                  <input
                    type="date"
                    value={editingHistoryDate.date}
                    onChange={(e) => setEditingHistoryDate({ ...editingHistoryDate, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingHistoryDate(null)}
                    className="flex-1 px-4 py-2 text-xs font-bold border border-black/10 rounded-xl text-black/60 hover:bg-black/5 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateHistoryDate}
                    className="flex-1 px-4 py-2 text-xs font-bold bg-black text-white rounded-xl hover:bg-black/80 transition-all"
                  >
                    Salvar
                  </button>
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
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      onCloseDetail?.();
                    }} 
                    className="p-2 hover:bg-black/5 rounded-full text-black/40"
                  >
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
                        <label className="block text-sm font-medium text-black/60 flex items-center justify-between">
                          Compradores
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentClientRole('buyer');
                              setIsClientModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-black/40 hover:text-black transition-colors"
                            title="Cadastrar Novo Comprador"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Novo</span>
                          </button>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar no cadastro de clientes..."
                            value={participantSearch.buyer}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, buyer: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                          {participantSearch.buyer && (
                            <div className="absolute top-full left-0 z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
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
                        </div>
                        <div className="flex flex-wrap gap-2 transition-all">
                          {formData.participants.filter(p => p.type === 'buyer').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-xs text-blue-600 border border-blue-100">
                                {getParticipantName(p)}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-blue-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vendedores */}
                      <div className="space-y-2 text-[#1a1a1a]">
                        <label className="block text-sm font-medium text-black/60 flex items-center justify-between">
                          Vendedores
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentClientRole('seller');
                              setIsClientModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-black/40 hover:text-black transition-colors"
                            title="Cadastrar Novo Vendedor"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Novo</span>
                          </button>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar no cadastro de clientes..."
                            value={participantSearch.seller}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, seller: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                          {participantSearch.seller && (
                            <div className="absolute top-full left-0 z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
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
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'seller').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full text-xs text-purple-600 border border-purple-100">
                                {getParticipantName(p)}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-purple-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Procuradores */}
                      <div className="space-y-2 text-[#1a1a1a]">
                        <label className="block text-sm font-medium text-black/60 flex items-center justify-between">
                          Procuradores
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentClientRole('buyer'); // Actually doesn't matter much as we'll set type proxy
                              setIsClientModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-black/40 hover:text-black transition-colors"
                            title="Cadastrar Novo Procurador"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Novo</span>
                          </button>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                          <input
                            type="text"
                            placeholder="Buscar procurador..."
                            value={participantSearch.proxy}
                            onChange={(e) => setParticipantSearch({ ...participantSearch, proxy: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] outline-none focus:ring-2 focus:ring-black/5"
                          />
                          {participantSearch.proxy && (
                            <div className="absolute top-full left-0 z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
                              {clients
                                .filter(c => c.name.toLowerCase().includes(participantSearch.proxy.toLowerCase()))
                                .map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      addParticipant('proxy', c.id!, c.name);
                                      setParticipantSearch({ ...participantSearch, proxy: '' });
                                    }}
                                    className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                  >
                                    <span>{c.name}</span>
                                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {formData.participants.filter(p => p.type === 'proxy').map((p, idx) => (
                            <div key={idx} className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-700">
                                  <span className="text-xs font-bold">{getParticipantName(p)}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 px-1.5 py-0.5 rounded-md">Procurador</span>
                                </div>
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Vinculado a:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.participants.filter(op => op.type === 'buyer' || op.type === 'seller').map(op => {
                                    const isLinked = p.representsIds?.includes(op.id);
                                    return (
                                      <button
                                        key={op.id}
                                        type="button"
                                        onClick={() => {
                                          const currentRepresents = p.representsIds || [];
                                          const newRepresents = isLinked 
                                            ? currentRepresents.filter(rid => rid !== op.id)
                                            : [...currentRepresents, op.id];
                                          
                                          setFormData({
                                            ...formData,
                                            participants: formData.participants.map(part => 
                                              part.id === p.id && part.type === 'proxy' 
                                                ? { ...part, representsIds: newRepresents }
                                                : part
                                            )
                                          });
                                        }}
                                        className={cn(
                                          "px-2 py-0.5 rounded-md text-[10px] font-medium transition-all border",
                                          isLinked 
                                            ? op.type === 'buyer' 
                                              ? "bg-blue-100 text-blue-700 border-blue-200" 
                                              : "bg-purple-100 text-purple-700 border-purple-200"
                                            : "bg-white text-black/40 border-black/5 hover:bg-black/5"
                                        )}
                                      >
                                        {getParticipantName(op)}
                                      </button>
                                    );
                                  })}
                                  {formData.participants.filter(op => op.type === 'buyer' || op.type === 'seller').length === 0 && (
                                    <p className="text-[10px] text-black/20 italic">Adicione compradores ou vendedores primeiro</p>
                                  )}
                                </div>
                              </div>
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
                          {participantSearch.broker && (
                            <div className="absolute top-full left-0 z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
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
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'broker').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full text-xs text-amber-600 border border-amber-100">
                                {getParticipantName(p)}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-amber-800"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Imobiliárias */}
                      <div className="space-y-2">
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
                          {participantSearch.agency && (
                            <div className="absolute top-full left-0 z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2">
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
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.participants.filter(p => p.type === 'agency').map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-black/5 px-3 py-1 rounded-full text-xs text-black border border-black/10">
                                {getParticipantName(p)}
                                <button type="button" onClick={() => removeParticipant(p.id, p.type)} className="hover:text-black"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1 flex items-center justify-between">
                      Imóvel
                      <button
                        type="button"
                        onClick={() => setIsPropertyModalOpen(true)}
                        className="flex items-center gap-1 text-black/40 hover:text-black transition-colors"
                        title="Cadastrar Novo Imóvel"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Novo Imóvel</span>
                      </button>
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    >
                      <option value="">Selecione um imóvel</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.address}{p.number ? `, ${p.number}` : ''} - {p.neighborhood} ({p.city})
                        </option>
                      ))}
                    </select>
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
                  {formData.type === 'Financiamento' && formData.financingType === 'MCMV' && (
                    <div className="pb-2">
                        <label className="flex items-center gap-2 mb-1 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={formData.isAssistedPurchase}
                              onChange={() => setFormData({ ...formData, isAssistedPurchase: !formData.isAssistedPurchase })}
                              className="sr-only"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                              formData.isAssistedPurchase 
                                ? "bg-black border-black" 
                                : "bg-[#f5f5f0] border-black/10 group-hover:border-black/20"
                            )}>
                              {formData.isAssistedPurchase && <Plus className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-black/60">Compra Assistida</span>
                        </label>
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
                    <label className="block text-sm font-medium text-black/60 mb-1">Agência</label>
                    <input
                      type="text"
                      placeholder="Nome ou número da agência"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-black/5">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={formData.hasIQ}
                            onChange={() => setFormData({ ...formData, hasIQ: !formData.hasIQ })}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                            formData.hasIQ 
                              ? "bg-black border-black" 
                              : "bg-[#f5f5f0] border-black/10 group-hover:border-black/20"
                          )}>
                            {formData.hasIQ && <Plus className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-black/60">Interveniente Quitante</span>
                      </label>
                    </div>

                    {formData.hasIQ && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/60 mb-1">Banco IQ</label>
                          <select
                            required={formData.hasIQ}
                            value={formData.iqBankId}
                            onChange={(e) => setFormData({ ...formData, iqBankId: e.target.value })}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                          >
                            <option value="">Selecione o banco do IQ</option>
                            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black/60 mb-1">Saldo Devedor</label>
                          <input
                            required={formData.hasIQ}
                            type="text"
                            value={formatCurrency(formData.iqDebtValue || 0)}
                            onChange={(e) => handleCurrencyChange('iqDebtValue', e.target.value)}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-1">Tipo de Assinatura</label>
                    <div className="flex gap-2">
                      {(['Digital', 'Física'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, signatureType: formData.signatureType === type ? '' : type })}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                            formData.signatureType === type
                              ? "bg-black text-white border-black"
                              : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={formData.hasDispatcher}
                            onChange={() => setFormData({ ...formData, hasDispatcher: !formData.hasDispatcher })}
                            className="sr-only"
                          />
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                            formData.hasDispatcher 
                              ? "bg-black border-black" 
                              : "bg-[#f5f5f0] border-black/10 group-hover:border-black/20"
                          )}>
                            {formData.hasDispatcher && <Plus className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-black/60">Despachante</span>
                      </label>

                      {formData.hasDispatcher && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={formData.isDispatcherPaid}
                              onChange={() => {
                                const isPaid = !formData.isDispatcherPaid;
                                setFormData({ 
                                  ...formData, 
                                  isDispatcherPaid: isPaid,
                                  dispatcherPaymentDate: isPaid ? new Date().toISOString().split('T')[0] : formData.dispatcherPaymentDate
                                });
                              }}
                              className="sr-only"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                              formData.isDispatcherPaid 
                                ? "bg-emerald-500 border-emerald-500" 
                                : "bg-[#f5f5f0] border-black/10 group-hover:border-black/20"
                            )}>
                              {formData.isDispatcherPaid && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-black/60">Pago</span>
                        </label>
                      )}
                    </div>
                    {formData.hasDispatcher && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black/60 mb-1">Valor Despachante</label>
                          <input
                            required
                            type="text"
                            value={formatCurrency(formData.dispatcherValue || 0)}
                            onChange={(e) => handleCurrencyChange('dispatcherValue', e.target.value)}
                            className="w-full px-4 py-2 text-sm rounded-xl border border-black/10 bg-[#f5f5f0] text-[#1a1a1a] focus:ring-2 focus:ring-black/5 outline-none"
                          />
                        </div>
                      </div>
                    )}
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

      <AnimatePresence>
        {isPropertyModalOpen && (
          <PropertyModal
            isOpen={isPropertyModalOpen}
            onClose={() => setIsPropertyModalOpen(false)}
            onSuccess={(property) => {
              setFormData(prev => ({ ...prev, propertyId: property.id! }));
              setIsPropertyModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isClientModalOpen && (
          <ClientModal
            isOpen={isClientModalOpen}
            onClose={() => setIsClientModalOpen(false)}
            onSuccess={(client) => {
              addParticipant(currentClientRole, client.id!, client.name);
              setIsClientModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
