import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Bank, Broker, Agency, Process } from '../types';
import { X, Save, UserPlus, Phone, Mail, Calendar, CreditCard, Building2, UserCircle, Edit2, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, DollarSign, Users, FileText, TrendingUp, TrendingDown, User as UserIcon, FilePlus, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba } from '../utils/colors';

interface ClientModalProps {
  clientId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (client: Client) => void;
  onCreateProcessForClient?: (clientId: string, role?: 'buyer' | 'seller') => void;
  initialIsEditing?: boolean;
}

export default function ClientModal({ clientId, isOpen, onClose, onSuccess, onCreateProcessForClient, initialIsEditing }: ClientModalProps) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessOptions, setShowSuccessOptions] = useState(false);
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [successStep, setSuccessStep] = useState<'initial' | 'role' | 'link_process'>('initial');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'create' | 'link' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null);
  const [searchProcess, setSearchProcess] = useState('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<{ cpf?: string; general?: string }>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phone2: '',
    cpf: '',
    pis: '',
    birthDate: '',
    income: 0,
    hasFGTS: false,
    maritalStatus: '' as 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável' | '',
    brokerId: '',
    agencyId: '',
    status: '' as 'Aprovado' | 'Condicionado' | 'Negado' | 'Vencido' | '',
    approvedBanks: [] as { bankId: string; approvedValue: number; expirationDate: string }[],
  });

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowSuccessOptions(false);
      setSuccessStep('initial');
      setSelectedAction(null);
      setSelectedRole(null);
      setNewClientId(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        phone2: '',
        cpf: '',
        pis: '',
        birthDate: '',
        income: 0,
        hasFGTS: false,
        maritalStatus: '',
        brokerId: '',
        agencyId: '',
        status: '',
        approvedBanks: [],
      });
      return;
    }

    const unsubBanks = api.subscribeToCollection('banks', (data) => setBanks(data as Bank[]));
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => setBrokers(data as Broker[]));
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => setAgencies(data as Agency[]));
    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses(data as Process[]));
    const unsubClients = api.subscribeToCollection('clients', (data) => setAllClients(data as Client[]));
    
    if (clientId) {
      setLoading(true);
      if (initialIsEditing) setIsEditing(true);
      api.getById('clients', clientId).then((data) => {
        if (data) {
          const client = data as Client;
          setCreatedAt(client.createdAt || '');
          setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            phone2: client.phone2 || '',
            cpf: client.cpf || '',
            pis: client.pis || '',
            birthDate: client.birthDate || '',
            income: client.income || 0,
            hasFGTS: !!client.hasFGTS,
            maritalStatus: client.maritalStatus || '',
            brokerId: client.brokerId || '',
            agencyId: client.agencyId || '',
            status: client.status || '',
            approvedBanks: client.approvedBanks || [],
          });
        }
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching client:", err);
        setLoading(false);
      });
    } else {
      setIsEditing(true);
    }

    return () => {
      unsubBanks();
      unsubBrokers();
      unsubAgencies();
      unsubProcesses();
      unsubClients();
    };
  }, [clientId, isOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPIS = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{5})/, '$1.$2')
      .replace(/(\d{3})(\d{5})(\d{2})/, '$1.$2.$3')
      .replace(/(\d{3})(\d{5})(\d{2})(\d{1})/, '$1.$2.$3-$4')
      .slice(0, 14);
  };

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatCurrencyInput = (value: string | number) => {
    if (value === undefined || value === null) return '';
    const stringValue = typeof value === 'number' ? Math.round(value * 100).toString() : value.replace(/\D/g, '');
    if (!stringValue) return '';
    const amount = (parseInt(stringValue, 10) / 100).toFixed(2);
    const [int, dec] = amount.split('.');
    const formattedInt = parseInt(int, 10).toLocaleString('pt-BR');
    return `R$ ${formattedInt},${dec}`;
  };

  const parseCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) / 100 : 0;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
    } else {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
    }
  };

  const handleAddBank = () => {
    setFormData({
      ...formData,
      approvedBanks: [
        ...formData.approvedBanks,
        { bankId: '', approvedValue: 0, expirationDate: '' }
      ]
    });
  };

  const handleRemoveBank = (index: number) => {
    const newBanks = [...formData.approvedBanks];
    newBanks.splice(index, 1);
    setFormData({ ...formData, approvedBanks: newBanks });
  };

  const handleUpdateBank = (index: number, field: string, value: any) => {
    const newBanks = [...formData.approvedBanks];
    newBanks[index] = { ...newBanks[index], [field]: value };
    setFormData({ ...formData, approvedBanks: newBanks });
  };

  const handleLinkToProcess = async (process: Process) => {
    const targetId = newClientId || clientId;
    if (!targetId || !selectedRole) return;
    
    const participants = [...(process.participants || [])];
    participants.push({
      id: targetId,
      name: formData.name,
      type: selectedRole
    });

    try {
      await api.update('processes', process.id!, {
        participants,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error("Error linking to process:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setErrors({});

    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      setErrors({ cpf: 'Formato de CPF inválido' });
      return;
    }

    // Check for duplicates
    const isDuplicate = allClients.some(c => {
      if (clientId && c.id === clientId) return false;
      const normalizedName = c.name.trim().toLowerCase();
      const currentNormalizedName = formData.name.trim().toLowerCase();
      const normalizedCPF = c.cpf?.replace(/\D/g, '');
      const currentNormalizedCPF = formData.cpf?.replace(/\D/g, '');
      
      const nameMatch = normalizedName === currentNormalizedName;
      const cpfMatch = normalizedCPF && currentNormalizedCPF && normalizedCPF === currentNormalizedCPF;
      
      return nameMatch || cpfMatch;
    });

    if (isDuplicate) {
      setErrors({ general: 'Já existe um cliente cadastrado com este nome ou CPF.' });
      return;
    }

    const formattedBirthDate = formData.birthDate.includes('/') 
      ? formData.birthDate.split('/').reverse().join('-')
      : formData.birthDate;

    setLoading(true);
    try {
      const formattedApprovedBanks = formData.approvedBanks.map(bank => ({
        ...bank,
        expirationDate: bank.expirationDate.includes('/')
          ? bank.expirationDate.split('/').reverse().join('-')
          : bank.expirationDate
      }));

      const clientData = {
        ...formData,
        birthDate: formattedBirthDate,
        approvedBanks: formattedApprovedBanks,
        updatedAt: new Date().toISOString(),
      };

      if (clientId) {
        await api.update('clients', clientId, clientData);
        const updatedClient = { ...clientData, id: clientId, createdAt } as Client;
        onSuccess?.(updatedClient);
        setNewClientId(clientId);
        setShowSuccessOptions(true);
        setIsEditing(false);
      } else {
        const fullClientData = { ...clientData, createdAt: new Date().toISOString() };
        const result = await api.create('clients', fullClientData);
        onSuccess?.(result as Client);
        setNewClientId(result.id);
        setShowSuccessOptions(true);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentClientName = formData.name;

  if (!isOpen) return null;

  const status = formData.status || 'Avaliar';
  const statusColors = {
    'Aprovado': { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-800', border: 'border-green-100', borderStrong: 'border-green-300', hex: '#10b981' },
    'Condicionado': { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-800', border: 'border-amber-100', borderStrong: 'border-amber-300', hex: '#f59e0b' },
    'Negado': { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-800', border: 'border-red-100', borderStrong: 'border-red-300', hex: '#ef4444' },
    'Vencido': { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'text-rose-800', border: 'border-rose-100', borderStrong: 'border-rose-300', hex: '#f43f5e' },
    'Avaliar': { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-800', border: 'border-blue-100', borderStrong: 'border-blue-300', hex: '#3b82f6' }
  };
  const currentStatusStyle = statusColors[status as keyof typeof statusColors];

  const buyerProcesses = processes.filter(p => 
    p.clientId === clientId || 
    p.participants?.some(part => part.type === 'buyer' && part.id === clientId)
  );
  const sellerProcesses = processes.filter(p => 
    p.participants?.some(part => part.type === 'seller' && part.id === clientId)
  );
  
  const buyerTotal = buyerProcesses.reduce((sum, p) => {
    if (p?.type === 'Financiamento' || p?.type === 'Home Equity') {
      return sum + (p.financingValue || 0);
    }
    return sum;
  }, 0);
  
  const sellerTotal = sellerProcesses.reduce((sum, p) => {
    if (p?.type === 'Financiamento' || p?.type === 'Home Equity') {
      return sum + (p.financingValue || 0);
    }
    return sum;
  }, 0);
  
  const allClientProcesses = processes.filter(p => 
    p.clientId === clientId || 
    p.participants?.some(part => part.id === clientId)
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#fcfcf9] w-full max-w-lg max-h-[90vh] rounded-[40px] shadow-2xl border border-black/10 overflow-hidden flex flex-col relative z-10"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
               <UserCircle className="w-7 h-7 text-black/40" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-[#1a1a1a]">
                 {showSuccessOptions 
                   ? 'Cliente Cadastrado' 
                   : (isEditing ? (clientId ? 'Editar Cliente' : 'Novo Cliente') : formData.name)}
               </h2>
               <p className="text-xs text-black/40 font-medium">
                 {showSuccessOptions
                   ? 'O que deseja fazer agora?'
                   : (isEditing ? 'Informações cadastrais e financeiras' : 'Resumo do Cliente')}
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && !showSuccessOptions && isAdmin && (
              <button
                onClick={() => {
                  if (clientId) {
                    onCreateProcessForClient?.(clientId);
                    onClose();
                  }
                }}
                className="w-11 h-11 flex items-center justify-center hover:bg-emerald-50 text-emerald-600 rounded-2xl transition-colors"
                title="Novo Processo"
              >
                <FilePlus className="w-5 h-5" />
              </button>
            )}
            {!isEditing && isAdmin && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-11 h-11 flex items-center justify-center hover:bg-black/5 text-black/40 rounded-2xl transition-colors"
                title="Editar Cliente"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {isEditing && (
              <button
                type="submit"
                form="client-modal-form"
                disabled={loading}
                className="h-11 bg-black text-white rounded-2xl hover:bg-black/80 transition-all shadow-sm flex items-center gap-2 px-6 text-sm font-bold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            )}
            {isEditing && clientId && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-11 h-11 flex items-center justify-center hover:bg-black/5 text-black/40 rounded-2xl transition-colors"
                title="Cancelar"
              >
                <X className="w-6 h-6" />
              </button>
            )}
            {!isEditing && (
              <button onClick={onClose} className="w-11 h-11 flex items-center justify-center hover:bg-black/5 text-black/40 rounded-2xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
           <div className="overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
              <p className="text-sm font-bold text-black/40 uppercase tracking-widest">Carregando...</p>
            </div>
          ) : showSuccessOptions ? (
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#1a1a1a]">Cliente cadastrado com sucesso!</h3>
                <p className="text-sm text-black/40">Deseja realizar mais alguma ação para este cliente?</p>
              </div>

              {successStep === 'initial' && (
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setSelectedAction('create');
                      setSuccessStep('role');
                    }}
                    className="flex items-center gap-4 p-5 bg-black text-white rounded-[24px] hover:bg-black/90 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                      <FilePlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">Criar novo processo</p>
                      <p className="text-xs text-white/60">Inicie um financiamento agora</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAction('link');
                      setSuccessStep('role');
                    }}
                    className="flex items-center gap-4 p-5 bg-white border border-black/10 text-[#1a1a1a] rounded-[24px] hover:bg-black/5 transition-all text-left"
                  >
                    <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">Vincular a processo existente</p>
                      <p className="text-xs text-black/40">Adicione a um processo em andamento</p>
                    </div>
                  </button>

                  <button
                    onClick={onClose}
                    className="flex items-center justify-center p-4 text-sm font-bold text-black/40 hover:text-black transition-colors"
                  >
                    Agora não, finalizar
                  </button>
                </div>
              )}

              {successStep === 'role' && (
                <div className="space-y-4">
                  <p className="text-center text-sm font-bold text-black/60 mb-4">Qual o papel deste cliente no processo?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const targetId = newClientId || clientId;
                        setSelectedRole('buyer');
                        if (selectedAction === 'create') {
                          if (targetId) {
                            onCreateProcessForClient?.(targetId, 'buyer');
                            onClose();
                          }
                        } else {
                          setSuccessStep('link_process');
                        }
                      }}
                      className="flex flex-col items-center gap-3 p-6 bg-white border border-black/10 rounded-[24px] hover:border-black transition-all group"
                    >
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm">Comprador</span>
                    </button>

                    <button
                      onClick={() => {
                        const targetId = newClientId || clientId;
                        setSelectedRole('seller');
                        if (selectedAction === 'create') {
                          if (targetId) {
                            onCreateProcessForClient?.(targetId, 'seller');
                            onClose();
                          }
                        } else {
                          setSuccessStep('link_process');
                        }
                      }}
                      className="flex flex-col items-center gap-3 p-6 bg-white border border-black/10 rounded-[24px] hover:border-black transition-all group"
                    >
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingDown className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-sm">Vendedor</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setSuccessStep('initial')}
                    className="w-full p-4 text-sm font-bold text-black/40 hover:text-black transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              )}

              {successStep === 'link_process' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                    <input
                      type="text"
                      placeholder="Buscar processo..."
                      value={searchProcess}
                      onChange={(e) => setSearchProcess(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-black/5 rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {processes
                      .filter(p => {
                        const bankName = banks.find(b => b.id === p.bankId)?.name || '';
                        return p.type.toLowerCase().includes(searchProcess.toLowerCase()) || 
                               bankName.toLowerCase().includes(searchProcess.toLowerCase()) ||
                               p.status.toLowerCase().includes(searchProcess.toLowerCase());
                      })
                      .map(process => {
                        const bank = banks.find(b => b.id === process.bankId);
                        const buyers = process.participants?.filter(p => p.type === 'buyer').map(p => p.name).join(', ') || 'Nenhum comprador';
                        
                        return (
                          <button
                            key={process.id}
                            onClick={() => handleLinkToProcess(process)}
                            className="w-full flex flex-col gap-2 p-4 bg-white border border-black/10 rounded-[24px] hover:border-black transition-all text-left group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center shrink-0">
                                  {bank?.logoUrl ? (
                                    <img src={bank.logoUrl} alt={bank.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-black/20" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-[#1a1a1a] uppercase tracking-tight">
                                    {process.type} {process.financingType ? `- ${process.financingType}` : ''}
                                  </p>
                                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                                    {bank?.name || 'Banco não definido'}
                                  </p>
                                </div>
                              </div>
                              <div className="w-8 h-8 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                                <Plus className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="space-y-1.5 pl-10">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-black/20" />
                                <p className="text-xs font-bold text-[#1a1a1a] line-clamp-1">
                                  {buyers}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-black/20" />
                                  <p className="text-[11px] font-bold text-black/60">
                                    C&V: <span className="text-[#1a1a1a]">{formatCurrency(process.purchaseValue)}</span>
                                  </p>
                                </div>
                                {process.financingValue && (
                                  <div className="flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-black/20" />
                                    <p className="text-[11px] font-bold text-black/60">
                                      Fin.: <span className="text-emerald-600">{formatCurrency(process.financingValue)}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    {processes.length === 0 && (
                      <p className="text-center py-8 text-sm text-black/20">Nenhum processo encontrado</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSuccessStep('role')}
                    className="w-full p-4 text-sm font-bold text-black/40 hover:text-black transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              )}
            </div>
          ) : isEditing ? (
            <form id="client-modal-form" onSubmit={handleSubmit} className="p-8 space-y-8">
              {errors.general && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {errors.general}
                </div>
              )}
              {/* Form sections... */}

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-black rounded-full" />
                  <h3 className="text-xs font-black text-black/40 uppercase tracking-widest">Identificação Básica</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">CPF</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        className={cn(
                          "w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border outline-none transition-all font-medium",
                          errors.cpf ? "border-red-500 bg-red-50" : "border-transparent focus:bg-white focus:border-black/10"
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">PIS</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="text"
                        placeholder="000.00000.00-0"
                        value={formData.pis}
                        onChange={(e) => setFormData({ ...formData, pis: formatPIS(e.target.value) })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Data de Nascimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={formData.birthDate.includes('-') ? formData.birthDate.split('-').reverse().join('/') : formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: formatBirthDate(e.target.value) })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs font-black text-black/40 uppercase tracking-widest">Contato</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Email Principal</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Telefone Principal</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Telefone Secundário</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <input
                        type="tel"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: formatPhone(e.target.value) })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </section>
              
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-amber-500 rounded-full" />
                  <h3 className="text-xs font-black text-black/40 uppercase tracking-widest">Finanças e Estado Civil</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Renda Mensal Comprovada</label>
                    <input
                      type="text"
                      value={formatCurrencyInput(formData.income)}
                      onChange={(e) => setFormData({ ...formData, income: parseCurrencyInput(e.target.value) })}
                      className="w-full px-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 p-4 bg-black/5 rounded-2xl border border-transparent hover:bg-black/10 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasFGTS}
                        onChange={(e) => setFormData({ ...formData, hasFGTS: e.target.checked })}
                        className="w-5 h-5 rounded-lg accent-black cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-[#1a1a1a]">Possui FGTS</span>
                        <p className="text-[10px] text-black/40 font-medium uppercase tracking-widest">Saldo disponível para entrada</p>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black text-black/40 uppercase tracking-widest">Atendimento</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Imobiliária / Parceiro</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <select
                        value={formData.agencyId}
                        onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium appearance-none"
                      >
                        <option value="">Nenhum Vínculo</option>
                        {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Estado Civil</label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                      className="w-full px-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro">Solteiro</option>
                      <option value="Casado">Casado</option>
                      <option value="Divorciado">Divorciado</option>
                      <option value="Viúvo">Viúvo</option>
                      <option value="União Estável">União Estável</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Status da Avaliação</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Condicionado">Condicionado</option>
                      <option value="Negado">Negado</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Corretor Responsável</label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                      <select
                        value={formData.brokerId}
                        onChange={(e) => setFormData({ ...formData, brokerId: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 text-[#1a1a1a] rounded-2xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all font-medium appearance-none"
                      >
                        <option value="">Nenhum Vínculo</option>
                        {brokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <h3 className="text-xs font-black text-black/40 uppercase tracking-widest">Aprovação de Crédito</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBank}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/5 text-black/60 rounded-xl hover:bg-black/10 transition-all text-[10px] font-bold uppercase tracking-widest"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Banco
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.approvedBanks.map((item, index) => (
                    <div key={index} className="p-4 bg-white border border-black/10 rounded-[28px] space-y-4 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveBank(index)}
                        className="absolute right-4 top-4 p-1 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Instituição Financeira</label>
                          <select
                            value={item.bankId}
                            onChange={(e) => handleUpdateBank(index, 'bankId', e.target.value)}
                            className="w-full px-4 py-2.5 bg-black/5 text-[#1a1a1a] rounded-xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all text-sm font-bold"
                          >
                            <option value="">Selecione um banco...</option>
                            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Valor Aprovado</label>
                          <input
                            type="text"
                            value={formatCurrencyInput(item.approvedValue)}
                            onChange={(e) => handleUpdateBank(index, 'approvedValue', parseCurrencyInput(e.target.value))}
                            className="w-full px-4 py-2.5 bg-black/5 text-[#1a1a1a] rounded-xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all text-sm font-bold"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Vencimento da Aprovação</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                            <input
                              type="text"
                              placeholder="DD/MM/AAAA"
                              value={item.expirationDate.includes('-') ? item.expirationDate.split('-').reverse().join('/') : item.expirationDate}
                              onChange={(e) => handleUpdateBank(index, 'expirationDate', formatBirthDate(e.target.value))}
                              className="w-full pl-11 pr-4 py-2.5 bg-black/5 text-[#1a1a1a] rounded-xl border border-transparent focus:bg-white focus:border-black/10 outline-none transition-all text-sm font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.approvedBanks.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-black/5 rounded-[32px]">
                      <Building2 className="w-8 h-8 text-black/10 mx-auto mb-2" />
                      <p className="text-xs font-bold text-black/20 uppercase tracking-widest">Nenhum banco selecionado</p>
                    </div>
                  )}
                </div>
              </section>
            </form>
          ) : (
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span 
                    onClick={() => handleEmail(formData.email)}
                    className="truncate hover:text-black/60 cursor-pointer transition-colors"
                  >
                    {formData.email}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span 
                    onClick={() => handleWhatsApp(formData.phone)}
                    className="hover:text-emerald-600 cursor-pointer transition-colors"
                  >
                    {formData.phone}
                  </span>
                </div>
                {formData.phone2 && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{formData.phone2}</span>
                  </div>
                )}
                {formData.cpf && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>CPF: {formData.cpf}</span>
                  </div>
                )}
                {formData.birthDate && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Nascimento: {formData.birthDate.includes('-') 
                      ? new Date(formData.birthDate).toLocaleDateString('pt-BR') 
                      : formData.birthDate}</span>
                  </div>
                )}
                {formData.income !== undefined && formData.income > 0 && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <DollarSign className="w-4 h-4 shrink-0" />
                    <span>Renda: {formatCurrency(formData.income)}</span>
                  </div>
                )}
                {formData.maritalStatus && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Estado Civil: {formData.maritalStatus}</span>
                  </div>
                )}
                {formData.hasFGTS && (
                  <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Possui FGTS</span>
                  </div>
                )}
                {formData.agencyId && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>Imobiliária: {agencies.find(a => a.id === formData.agencyId)?.name || 'N/A'}</span>
                  </div>
                )}
                {formData.brokerId && (
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <UserIcon className="w-4 h-4 shrink-0" />
                    <span>Corretor: {brokers.find(b => b.id === formData.brokerId)?.name || 'N/A'}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold">
                  <div className={cn(
                    "flex items-center gap-3",
                    formData.status === 'Aprovado' && "text-green-600",
                    formData.status === 'Condicionado' && "text-amber-600",
                    formData.status === 'Negado' && "text-red-600",
                    formData.status === 'Vencido' && "text-rose-600",
                    !formData.status && "text-blue-600"
                  )}>
                    {formData.status === 'Aprovado' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    {formData.status === 'Condicionado' && <Clock className="w-4 h-4 shrink-0" />}
                    {formData.status === 'Negado' && <XCircle className="w-4 h-4 shrink-0" />}
                    {formData.status === 'Vencido' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
                    {!formData.status && <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{formData.status || 'Avaliar'}</span>
                  </div>
                </div>
                
                {formData.approvedBanks && formData.approvedBanks.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-black/5">
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Bancos Aprovados</p>
                    <div className="grid grid-cols-1 gap-2">
                      {formData.approvedBanks.map((item, idx) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        let isExpired = false;
                        if (item.expirationDate) {
                          const expDate = new Date(item.expirationDate);
                          expDate.setHours(0, 0, 0, 0);
                          if (expDate < today) isExpired = true;
                        }
                        
                        const bank = banks.find(b => b.id === item.bankId);
                        return (
                          <div key={idx} className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                            isExpired ? "bg-red-50/50 border-red-100 opacity-80" : "bg-[#f5f5f0] border-black/5"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg border border-black/5 flex items-center justify-center overflow-hidden">
                                {bank?.logoUrl ? (
                                  <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Building2 className="w-4 h-4 text-black/20" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-[#1a1a1a] block">{bank?.name || 'Banco'}</span>
                                {isExpired && <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter">Vencido</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "text-xs font-bold",
                                isExpired ? "text-black/40" : "text-emerald-600"
                              )}>{formatCurrency(item.approvedValue)}</p>
                              <p className="text-[8px] font-medium text-black/40">Vence: {item.expirationDate ? (item.expirationDate.includes('-') ? item.expirationDate.split('-').reverse().join('/') : item.expirationDate) : 'N/A'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-black/5 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{allClientProcesses.length} {allClientProcesses.length === 1 ? 'Processo' : 'Processos'}</span>
                  </div>
                  {buyerTotal > 0 && (
                    <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>Comprador: {formatCurrency(buyerTotal)}</span>
                    </div>
                  )}
                  {sellerTotal > 0 && (
                    <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                      <TrendingDown className="w-4 h-4 shrink-0" />
                      <span>Vendedor: {formatCurrency(sellerTotal)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
