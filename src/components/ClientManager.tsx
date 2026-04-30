import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Process, Bank, Broker, Agency } from '../types';
import { Plus, Search, Trash2, Edit2, X, UserPlus, Phone, Mail, MapPin, Calendar, FileText, Filter, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, XCircle, MessageCircle, Save, Building2, User as UserIcon, DollarSign, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba } from '../utils/colors';

interface ClientManagerProps {
  onOpenProcess?: (id: string) => void;
}

export default function ClientManager({ onOpenProcess }: ClientManagerProps) {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { setTitle, setActions } = useHeader();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ cpf?: string }>({});

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    // Add country code if missing (assuming Brazil +55 if it has 10-11 digits)
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

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
    status: '' as 'Aprovado' | 'Condicionado' | 'Negado' | '',
    statusDate: '',
  });

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
  };

  useEffect(() => {
    setTitle('Clientes');
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
            "p-2 rounded-lg transition-all border shadow-sm",
            isFilterOpen
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Filtros"
        >
          <Filter className="w-5 h-5" />
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({ name: '', email: '', phone: '', phone2: '', cpf: '', birthDate: '', income: 0, hasFGTS: false, maritalStatus: '', brokerId: '', agencyId: '', status: '', statusDate: '' });
              setErrors({});
              setIsModalOpen(true);
            }}
            className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
            title="Novo Cliente"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, isAdmin]);

  useEffect(() => {
    const unsubscribe = api.subscribeToCollection('clients', (data) => {
      setClients((data as Client[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubscribeProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubscribeBanks = api.subscribeToCollection('banks', (data) => {
      setBanks(data as Bank[]);
    });
    const unsubscribeBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers((data as Broker[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubscribeAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies((data as Agency[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => {
      unsubscribe();
      unsubscribeProcesses();
      unsubscribeBanks();
      unsubscribeBrokers();
      unsubscribeAgencies();
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    // CPF Validation
    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      setErrors(prev => ({ ...prev, cpf: 'Formato de CPF inválido (000.000.000-00)' }));
      return;
    }

    const clientData = {
      ...formData,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
    };

    try {
      if (editingClient?.id) {
        await api.update('clients', editingClient.id, clientData);
      } else {
        await api.create('clients', clientData);
      }
      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', phone2: '', cpf: '', birthDate: '', income: 0, hasFGTS: false, maritalStatus: '', brokerId: '', agencyId: '', status: '', statusDate: '' });
      setErrors({});
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete('clients', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
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
                placeholder="Buscar por nome ou email..."
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
            <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Status de Crédito</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos os Status</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Condicionado">Condicionado</option>
                  <option value="Negado">Negado</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const status = client.status || 'Avaliar';
            const statusColors = {
              'Aprovado': { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-800', border: 'border-green-100', borderStrong: 'border-green-300', hex: '#10b981' },
              'Condicionado': { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-800', border: 'border-amber-100', borderStrong: 'border-amber-300', hex: '#f59e0b' },
              'Negado': { bg: 'bg-red-50', text: 'text-red-600', icon: 'text-red-800', border: 'border-red-100', borderStrong: 'border-red-300', hex: '#ef4444' },
              'Avaliar': { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-800', border: 'border-blue-100', borderStrong: 'border-blue-300', hex: '#3b82f6' }
            };
            const currentStatusStyle = statusColors[status as keyof typeof statusColors];

            const buyerProcesses = processes.filter(p => 
              p.clientId === client.id || 
              p.participants?.some(part => part.type === 'buyer' && part.id === client.id)
            );
            const sellerProcesses = processes.filter(p => 
              p.participants?.some(part => part.type === 'seller' && part.id === client.id)
            );
            
            const buyerTotal = buyerProcesses.reduce((sum, p) => {
              if (p.type === 'Financiamento' || p.type === 'Home Equity') {
                return sum + (p.financingValue || 0);
              }
              return sum;
            }, 0);
            
            const sellerTotal = sellerProcesses.reduce((sum, p) => {
              if (p.type === 'Financiamento' || p.type === 'Home Equity') {
                return sum + (p.financingValue || 0);
              }
              return sum;
            }, 0);
            
            const allClientProcesses = processes.filter(p => 
              p.clientId === client.id || 
              p.participants?.some(part => part.id === client.id)
            );

            const activeProcesses = allClientProcesses.filter(p => p.stage !== 'Finalizado');
            const activeBankInfo = activeProcesses
              .map(p => ({
                id: p.id,
                logoUrl: banks.find(b => b.id === p.bankId)?.logoUrl
              }))
              .filter((info, index, self) => info.logoUrl && self.findIndex(i => i.logoUrl === info.logoUrl) === index);
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={client.id}
                onClick={() => setExpandedClientId(isExpanded ? null : client.id!)}
                className={cn(
                  "bg-white p-3 rounded-[24px] shadow-sm border hover:shadow-md transition-all relative group cursor-pointer overflow-hidden",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
                style={{
                  borderColor: hexToRgba(currentStatusStyle.hex, 0.2)
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-14">
                    <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight truncate">{client.name}</h3>
                    {!isExpanded && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <div 
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full border",
                            currentStatusStyle.bg,
                            currentStatusStyle.text,
                            currentStatusStyle.border
                          )}
                          title={`Status: ${status}`}
                        >
                          <span>{status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                
                  <div className="absolute right-4 top-3 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {activeBankInfo.length > 0 && (
                      <div className="flex gap-1">
                        {activeBankInfo.map((info, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => info.id && onOpenProcess?.(info.id)}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-lg border shadow-sm shrink-0 cursor-pointer hover:scale-110 transition-transform active:scale-95",
                              currentStatusStyle.bg,
                              currentStatusStyle.borderStrong
                            )}
                            title="Ver Processo"
                          >
                            <FileText className={cn("w-4 h-4", currentStatusStyle.icon)} />
                          </div>
                        ))}
                      </div>
                    )}
                    {isAdmin && client.phone && (
                      <button 
                        onClick={() => handleWhatsApp(client.phone)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg border transition-all hover:scale-110 active:scale-95 shrink-0",
                          currentStatusStyle.bg,
                          currentStatusStyle.borderStrong
                        )}
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className={cn("w-4 h-4", currentStatusStyle.icon)} />
                      </button>
                    )}
                  </div>
                </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-black/5 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                      {client.phone2 && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{client.phone2}</span>
                        </div>
                      )}
                      {client.cpf && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>CPF: {client.cpf}</span>
                        </div>
                      )}
                      {client.birthDate && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Nascimento: {new Date(client.birthDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                      {client.income !== undefined && client.income > 0 && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <DollarSign className="w-4 h-4 shrink-0" />
                          <span>Renda: {formatCurrency(client.income)}</span>
                        </div>
                      )}
                      {client.maritalStatus && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <Users className="w-4 h-4 shrink-0" />
                          <span>Estado Civil: {client.maritalStatus}</span>
                        </div>
                      )}
                      {client.hasFGTS && (
                        <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Possui FGTS</span>
                        </div>
                      )}
                      {client.agencyId && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>Imobiliária: {agencies.find(a => a.id === client.agencyId)?.name || 'N/A'}</span>
                        </div>
                      )}
                      {client.brokerId && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <UserIcon className="w-4 h-4 shrink-0" />
                          <span>Corretor: {brokers.find(b => b.id === client.brokerId)?.name || 'N/A'}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-bold">
                        <div className={cn(
                          "flex items-center gap-3",
                          client.status === 'Aprovado' && "text-green-600",
                          client.status === 'Condicionado' && "text-amber-600",
                          client.status === 'Negado' && "text-red-600",
                          !client.status && "text-blue-600"
                        )}>
                          {client.status === 'Aprovado' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {client.status === 'Condicionado' && <Clock className="w-4 h-4 shrink-0" />}
                          {client.status === 'Negado' && <XCircle className="w-4 h-4 shrink-0" />}
                          {!client.status && <AlertCircle className="w-4 h-4 shrink-0" />}
                          <span>{client.status || 'Avaliar'}</span>
                        </div>
                        {client.statusDate && (
                          <span className="text-[#1a1a1a] font-bold">{new Date(client.statusDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
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
                      
                      {isAdmin && (
                        <div className="pt-4 flex justify-end gap-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setEditingClient(client);
                              setFormData({
                                name: client.name,
                                email: client.email,
                                phone: client.phone,
                                phone2: client.phone2 || '',
                                cpf: client.cpf || '',
                                birthDate: client.birthDate || '',
                                income: client.income || 0,
                                hasFGTS: !!client.hasFGTS,
                                maritalStatus: client.maritalStatus || '',
                                brokerId: client.brokerId || '',
                                agencyId: client.agencyId || '',
                                status: client.status || '',
                                statusDate: client.statusDate || '',
                              });
                              setErrors({});
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-black/60 hover:bg-black/5 rounded-xl transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(client.id!)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-[32px] shadow-2xl border border-black/10 overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <div className="flex items-center gap-2">
                  {editingClient && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editingClient.id) {
                          setDeleteConfirmId(editingClient.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    form="client-form"
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                    title="Salvar"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors">
                    <X />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                <form id="client-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Nome Completo</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">CPF</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => {
                          const formatted = formatCPF(e.target.value);
                          setFormData({ ...formData, cpf: formatted });
                          if (errors.cpf) setErrors(prev => ({ ...prev, cpf: undefined }));
                        }}
                        className={cn(
                          "w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border outline-none transition-all placeholder:text-black/40",
                          errors.cpf ? "border-red-500 focus:ring-red-500/10" : "border-black/10 focus:ring-black/5"
                        )}
                      />
                      {errors.cpf && (
                        <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Data de Nascimento</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Imobiliária</label>
                      <select
                        value={formData.agencyId}
                        onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                      >
                        <option value="">Selecione uma imobiliária</option>
                        {agencies.map((agency) => (
                          <option key={agency.id} value={agency.id}>{agency.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Corretor</label>
                      <select
                        value={formData.brokerId}
                        onChange={(e) => setFormData({ ...formData, brokerId: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                      >
                        <option value="">Selecione um corretor</option>
                        {brokers
                          .filter(b => !formData.agencyId || b.agencyId === formData.agencyId)
                          .map((broker) => (
                            <option key={broker.id} value={broker.id}>{broker.name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Renda Mensal</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                        <input
                          type="number"
                          step="0.01"
                          value={formData.income}
                          onChange={(e) => setFormData({ ...formData, income: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-10 pr-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Estado Civil</label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                      >
                        <option value="">Selecione...</option>
                        <option value="Solteiro">Solteiro</option>
                        <option value="Casado">Casado</option>
                        <option value="Divorciado">Divorciado</option>
                        <option value="Viúvo">Viúvo</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.hasFGTS}
                          onChange={(e) => setFormData({ ...formData, hasFGTS: e.target.checked })}
                          className="w-5 h-5 rounded border-black/10 text-black focus:ring-black/5"
                        />
                        <span className="text-sm font-medium text-black/60">Possui FGTS para entrada?</span>
                      </label>
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-black/60 mb-1">Status de Crédito</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Aprovado', 'Condicionado', 'Negado'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: formData.status === status ? '' : status as any })}
                            className={cn(
                              "py-2 px-1 rounded-xl border font-bold text-[10px] uppercase tracking-wider transition-all",
                              formData.status === status 
                                ? (status === 'Aprovado' ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" :
                                   status === 'Condicionado' ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20" :
                                   "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20")
                                : "bg-[#f5f5f0] text-black/40 border-black/10 hover:border-black/20"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Data do Crédito</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 pointer-events-none" />
                        <input
                          type="date"
                          value={formData.statusDate}
                          onChange={(e) => setFormData({ ...formData, statusDate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Telefone Principal</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-black/60 mb-1">Telefone Secundário</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: formatPhone(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                      />
                    </div>
                  </div>
                  {/* Form actions removed and replaced by icons in header */}
                </form>
              </div>
            </motion.div>
          </div>
        )}
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
              <h3 className="text-xl font-bold mb-2 text-[#1a1a1a]">Excluir Cliente?</h3>
              <p className="text-black/60 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleDelete(deleteConfirmId);
                    setIsModalOpen(false);
                  }}
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
