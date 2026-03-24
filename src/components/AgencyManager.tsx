import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Agency, Broker, Process } from '../types';
import { Plus, Search, Trash2, Edit2, X, Building2, Phone, Mail, MapPin, FileText, Filter, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AgencyManager() {
  const { isAdmin } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { setTitle, setActions } = useHeader();
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
  });

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
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
    setTitle('Imobiliárias');
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
              setEditingAgency(null);
              setFormData({ name: '', cnpj: '', email: '', phone: '', address: '' });
              setIsModalOpen(true);
            }}
            className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
            title="Nova Imobiliária"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, isAdmin]);

  useEffect(() => {
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers(data as Broker[]);
    });
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });

    return () => {
      unsubAgencies();
      unsubBrokers();
      unsubProcesses();
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

    const agencyData = {
      ...formData,
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingAgency?.id) {
        await api.update('agencies', editingAgency.id, agencyData);
      } else {
        await api.create('agencies', agencyData);
      }
      setIsModalOpen(false);
      setEditingAgency(null);
      setFormData({ name: '', cnpj: '', email: '', phone: '', address: '' });
    } catch (error) {
      console.error("Erro ao salvar imobiliária:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta imobiliária?")) {
      try {
        await api.delete('agencies', id);
      } catch (error) {
        console.error("Erro ao excluir imobiliária:", error);
      }
    }
  };

  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm">
              <p className="text-sm text-black/40 italic">Filtros avançados em breve...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredAgencies.map((agency) => {
            const isExpanded = expandedAgencyId === agency.id;
            const agencyProcesses = processes.filter(p => 
              p.participants?.some(part => part.type === 'agency' && part.id === agency.id)
            );
            const totalFinancing = agencyProcesses.reduce((sum, p) => sum + (p.financingValue || 0), 0);
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={agency.id}
                onClick={() => setExpandedAgencyId(isExpanded ? null : agency.id!)}
                className={cn(
                  "bg-white p-4 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all relative group cursor-pointer",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight">{agency.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-black/5 text-black/60">
                        {brokers.filter(b => b.agencyId === agency.id).length} {brokers.filter(b => b.agencyId === agency.id).length === 1 ? 'Corretor' : 'Corretores'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-500/10 text-blue-600">
                        {agencyProcesses.length} {agencyProcesses.length === 1 ? 'Processo' : 'Processos'}
                      </span>
                      {totalFinancing > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {formatCurrency(totalFinancing)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setEditingAgency(agency);
                        setFormData({
                          name: agency.name,
                          cnpj: agency.cnpj || '',
                          email: agency.email,
                          phone: agency.phone,
                          address: agency.address || '',
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-black/60 hover:bg-black/5 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(agency.id!)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
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
              className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingAgency ? 'Editar Imobiliária' : 'Novo Imobiliária'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">Nome da Imobiliária</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">CNPJ</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">Telefone</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">Endereço</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-black/80 transition-all shadow-lg"
                >
                  {editingAgency ? 'Salvar Alterações' : 'Cadastrar Imobiliária'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
