import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client } from '../types';
import { Plus, Search, Trash2, Edit2, X, UserPlus, Phone, Mail, MapPin, Calendar, FileText, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function ClientManager() {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { setTitle, setActions } = useHeader();
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ cpf?: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    phone2: '',
    cpf: '',
    birthDate: '',
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
              setFormData({ name: '', email: '', phone: '', phone2: '', cpf: '', birthDate: '' });
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
    return () => unsubscribe();
  }, []);

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
      brokerId: 'admin-1',
      createdAt: new Date().toISOString(),
    };

    try {
      if (editingClient?.id) {
        await api.update('clients', editingClient.id, clientData);
      } else {
        await api.create('clients', clientData);
      }
      setIsModalOpen(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', phone2: '', cpf: '', birthDate: '' });
      setErrors({});
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await api.delete('clients', id);
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            
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
                  "bg-white p-4 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all relative group cursor-pointer",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight">{client.name}</h3>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                      onClick={() => handleDelete(client.id!)}
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
              className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-2">Nome Completo</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-2">CPF</label>
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
                        "w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border outline-none transition-all placeholder:text-black/40",
                        errors.cpf ? "border-red-500 focus:ring-red-500/10" : "border-black/10 focus:ring-black/5"
                      )}
                    />
                    {errors.cpf && (
                      <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/60 mb-2">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
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
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-black/60 mb-2">Telefone Principal</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-black/60 mb-2">Telefone Secundário</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={formData.phone2}
                      onChange={(e) => setFormData({ ...formData, phone2: formatPhone(e.target.value) })}
                      className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-black/80 transition-all shadow-lg"
                >
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
