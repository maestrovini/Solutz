import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Broker, Agency, Process, Client } from '../types';
import { Plus, Search, Trash2, Edit2, X, User, Phone, Mail, FileText, Building2, Filter, TrendingUp, AlertCircle, Save, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function BrokerManager() {
  const { isAdmin } = useAuth();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [agencyFilter, setAgencyFilter] = useState<string>('');
  const { setTitle, setActions } = useHeader();
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedBrokerId, setExpandedBrokerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    creci: '',
    email: '',
    phone: '',
    agencyId: '',
  });

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
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
    setTitle('Corretores');
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
              setEditingBroker(null);
              setFormData({ name: '', creci: '', email: '', phone: '', agencyId: '' });
              setIsModalOpen(true);
            }}
            className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
            title="Novo Corretor"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, isAdmin]);

  useEffect(() => {
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers((data as Broker[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients(data as Client[]);
    });

    return () => {
      unsubBrokers();
      unsubAgencies();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const brokerData = {
      ...formData,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingBroker?.id) {
        await api.update('brokers', editingBroker.id, brokerData);
      } else {
        await api.create('brokers', brokerData);
      }
      setIsModalOpen(false);
      setEditingBroker(null);
      setFormData({ name: '', creci: '', email: '', phone: '', agencyId: '' });
    } catch (error) {
      console.error("Erro ao salvar corretor:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete('brokers', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Erro ao excluir corretor:", error);
    }
  };

  const getAgencyName = (id: string) => {
    return agencies.find(a => a.id === id)?.name || 'Autônomo';
  };

  const filteredBrokers = brokers.filter(b => {
    const agencyName = getAgencyName(b.agencyId || '');
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agencyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgency = !agencyFilter || 
                         (agencyFilter === 'autonomous' ? !b.agencyId : b.agencyId === agencyFilter);
    return matchesSearch && matchesAgency;
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
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Imobiliária</label>
                <select
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todas as Imobiliárias</option>
                  <option value="autonomous">Autônomo</option>
                  {agencies.map(agency => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredBrokers.map((broker) => {
            const isExpanded = expandedBrokerId === broker.id;
            const brokerProcesses = processes.filter(p => 
              p.participants?.some(part => part.type === 'broker' && part.id === broker.id)
            );
            const brokerClients = clients.filter(c => c.brokerId === broker.id);
            const totalFinancing = brokerProcesses.reduce((sum, p) => {
              if (p.type === 'Financiamento' || p.type === 'Home Equity') {
                return sum + (p.financingValue || 0);
              }
              return sum;
            }, 0);
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={broker.id}
                onClick={() => setExpandedBrokerId(isExpanded ? null : broker.id!)}
                className={cn(
                  "bg-white p-3 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all relative group cursor-pointer",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
              >
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-14">
                  <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight truncate">{broker.name}</h3>
                  {!isExpanded && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/5 text-black/60 text-[8px] font-bold uppercase tracking-wider rounded-full border border-black/5" title={broker.agencyId ? `Imobiliária: ${getAgencyName(broker.agencyId)}` : 'Corretor Autônomo'}>
                        <span>{broker.agencyId ? getAgencyName(broker.agencyId) : 'Autônomo'}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/5 text-black/60 text-[8px] font-bold uppercase tracking-wider rounded-full border border-black/5" title={`${brokerProcesses.length} ${brokerProcesses.length === 1 ? 'Processo' : 'Processos'}`}>
                        <span>{brokerProcesses.length} {brokerProcesses.length === 1 ? 'Processo' : 'Processos'}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/5 text-black/60 text-[8px] font-bold uppercase tracking-wider rounded-full border border-black/5" title={`${brokerClients.length} ${brokerClients.length === 1 ? 'Cliente' : 'Clientes'}`}>
                        <span>{brokerClients.length} {brokerClients.length === 1 ? 'Cliente' : 'Clientes'}</span>
                      </div>
                      {totalFinancing > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-black/5 text-black/60 text-[8px] font-bold uppercase tracking-wider rounded-full border border-black/5">
                          <span>Total: {formatCurrency(totalFinancing)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {isAdmin && broker.phone && (
                  <div className="absolute right-4 top-3" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleWhatsApp(broker.phone)}
                      className="w-8 h-8 flex items-center justify-center text-[#1a1a1a] bg-black/5 hover:bg-black/10 rounded-lg border border-black/5 transition-all hover:scale-110 active:scale-95 shrink-0"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                      <div className="flex items-center gap-3 text-sm text-black/60">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span>Imobiliária: {getAgencyName(broker.agencyId || '')}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>{brokerProcesses.length} {brokerProcesses.length === 1 ? 'Processo' : 'Processos'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold">
                        <User className="w-4 h-4 shrink-0" />
                        <span>{brokerClients.length} {brokerClients.length === 1 ? 'Cliente' : 'Clientes'}</span>
                      </div>
                      {brokerClients.length > 0 && (
                        <div className="ml-7 pt-1 space-y-1">
                          {brokerClients.map(client => (
                            <div key={client.id} className="text-xs text-black/40 bg-black/5 px-2 py-1 rounded-lg truncate">
                              {client.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {totalFinancing > 0 && (
                        <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold">
                          <TrendingUp className="w-4 h-4 shrink-0" />
                          <span>Total Financiado: {formatCurrency(totalFinancing)}</span>
                        </div>
                      )}
                      
                      {isAdmin && (
                        <div className="pt-4 flex justify-end gap-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setEditingBroker(broker);
                              setFormData({
                                name: broker.name,
                                creci: broker.creci,
                                email: broker.email,
                                phone: broker.phone,
                                agencyId: broker.agencyId || '',
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-black/60 hover:bg-black/5 rounded-xl transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(broker.id!)}
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
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingBroker ? 'Editar Corretor' : 'Novo Corretor'}</h2>
                <div className="flex items-center gap-2">
                  {editingBroker && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (editingBroker.id) {
                          setDeleteConfirmId(editingBroker.id);
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
                    form="broker-form"
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
                <form id="broker-form" onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">CRECI</label>
                      <input
                        type="text"
                        value={formData.creci}
                        onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                      />
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
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Telefone</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Imobiliária</label>
                      <select
                        value={formData.agencyId}
                        onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Autônomo</option>
                        {agencies.map(agency => (
                          <option key={agency.id} value={agency.id}>{agency.name}</option>
                        ))}
                      </select>
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
              <h3 className="text-xl font-bold mb-2 text-[#1a1a1a]">Excluir Corretor?</h3>
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
