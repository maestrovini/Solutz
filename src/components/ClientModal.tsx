import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Bank, Broker, Agency, Process } from '../types';
import { X, Save, UserPlus, Phone, Mail, Calendar, CreditCard, Building2, UserCircle, Edit2, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, DollarSign, Users, FileText, TrendingUp, TrendingDown, User as UserIcon, FilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba } from '../utils/colors';

interface ClientModalProps {
  clientId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateProcessForClient?: (clientId: string) => void;
}

export default function ClientModal({ clientId, isOpen, onClose, onCreateProcessForClient }: ClientModalProps) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [errors, setErrors] = useState<{ cpf?: string }>({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phone2: '',
    cpf: '',
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
      return;
    }

    const unsubBanks = api.subscribeToCollection('banks', (data) => setBanks(data as Bank[]));
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => setBrokers(data as Broker[]));
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => setAgencies(data as Agency[]));
    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses(data as Process[]));
    
    if (clientId) {
      setLoading(true);
      api.getById('clients', clientId).then((data) => {
        if (data) {
          const client = data as Client;
          setFormData({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            phone2: client.phone2 || '',
            cpf: client.cpf || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      setErrors({ cpf: 'Formato de CPF inválido' });
      return;
    }

    const formattedBirthDate = formData.birthDate.includes('/') 
      ? formData.birthDate.split('/').reverse().join('-')
      : formData.birthDate;

    const clientData = {
      ...formData,
      birthDate: formattedBirthDate,
      updatedAt: new Date().toISOString(),
    };

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
      } else {
        await api.create('clients', { ...clientData, createdAt: new Date().toISOString() });
      }
      setIsEditing(false);
      if (!clientId) onClose();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

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
                 {isEditing ? (clientId ? 'Editar Cliente' : 'Novo Cliente') : formData.name}
               </h2>
               <p className="text-xs text-black/40 font-medium">
                 {isEditing ? 'Informações cadastrais e financeiras' : 'Resumo do Cliente'}
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && isAdmin && (
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
                className="h-11 bg-black text-white rounded-2xl hover:bg-black/80 transition-all shadow-sm flex items-center gap-2 px-6 text-sm font-bold"
              >
                <Save className="w-4 h-4" />
                Salvar
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
          ) : isEditing ? (
            <form id="client-modal-form" onSubmit={handleSubmit} className="p-8 space-y-8">
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
                    <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
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
                        if (item.expirationDate) {
                          const expDate = new Date(item.expirationDate);
                          expDate.setHours(0, 0, 0, 0);
                          if (expDate < today) return null;
                        }
                        
                        const bank = banks.find(b => b.id === item.bankId);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#f5f5f0] rounded-xl border border-black/5">
                            <div className="flex items-center gap-2">
                              {bank?.logoUrl ? (
                                <img src={bank.logoUrl} alt={bank.name} className="w-6 h-6 rounded border border-black/5 object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Building2 className="w-4 h-4 text-black/20" />
                              )}
                              <span className="text-xs font-bold text-[#1a1a1a]">{bank?.name || 'Banco'}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-emerald-600">{formatCurrency(item.approvedValue)}</p>
                              <p className="text-[8px] font-medium text-black/40">Vence: {item.expirationDate ? new Date(item.expirationDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
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
