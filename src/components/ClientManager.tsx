import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Process, Bank, Broker, Agency, ClientTag } from '../types';
import { Plus, Search, Trash2, Edit2, X, UserPlus, Phone, Mail, MapPin, Calendar, FileText, Filter, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, XCircle, MessageCircle, Save, Building2, User as UserIcon, DollarSign, Users, FilePlus, Calculator, AlertTriangle, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba } from '../utils/colors';
import { TagsManagerModal } from './TagsManagerModal';

interface ClientManagerProps {
  onOpenProcess?: (id: string) => void;
  onCreateProcessForClient?: (clientId: string) => void;
  onOpenClientModal?: (id?: string, isEdit?: boolean) => void;
  initialSelectedClientId?: string | null;
  onCloseDetail?: () => void;
}

export default function ClientManager({ onOpenProcess, onCreateProcessForClient, onOpenClientModal, initialSelectedClientId, onCloseDetail }: ClientManagerProps) {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [allTags, setAllTags] = useState<ClientTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { setTitle, setActions } = useHeader();
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
          onClick={() => setIsTagsModalOpen(true)}
          className="p-2 bg-white/10 text-white border border-white/10 rounded-lg hover:bg-white/20 transition-colors shadow-sm"
          title="Gerenciar Tags"
        >
          <Tag className="w-5 h-5" />
        </button>
        <button
          onClick={() => onOpenClientModal?.()}
          className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
          title="Novo Cliente"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>
    );
  }, [isSearchOpen, searchTerm, isAdmin]);

  useEffect(() => {
    if (initialSelectedClientId) {
      setExpandedClientId(initialSelectedClientId);
    }
  }, [initialSelectedClientId]);

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
    const unsubscribeTags = api.subscribeToCollection('tags', (data) => {
      setAllTags(data as ClientTag[]);
    });
    return () => {
      unsubscribe();
      unsubscribeProcesses();
      unsubscribeBanks();
      unsubscribeBrokers();
      unsubscribeAgencies();
      unsubscribeTags();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || clients.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkExpirations = async () => {
      for (const client of clients) {
        if (client.approvedBanks && client.approvedBanks.length > 0) {
          const validBanks = client.approvedBanks.filter(bank => {
            if (!bank.expirationDate) return true;
            const expDate = new Date(bank.expirationDate);
            expDate.setHours(0, 0, 0, 0);
            return expDate >= today;
          });

          if (validBanks.length !== client.approvedBanks.length) {
            const updates: Partial<Client> = {
              approvedBanks: validBanks
            };

            // Only update if there's a real change to avoid unnecessary writes
            try {
              await api.update('clients', client.id!, updates);
            } catch (error) {
              console.error(`Error updating expired client ${client.id}:`, error);
            }
          }
        }
      }
    };

    checkExpirations();
  }, [clients.length, isAdmin]); // Only run when count changes or on mount

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
    const name = c.name || '';
    const email = c.email || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTagId || (c.tags && c.tags.includes(selectedTagId));
    return matchesSearch && matchesTag;
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

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/30 shrink-0 mr-1 ml-1">Filtrar por:</span>
          <button
            onClick={() => setSelectedTagId(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer select-none shrink-0",
              !selectedTagId
                ? "bg-[#1a1a1a] text-white border-transparent shadow-xs"
                : "bg-white text-black/60 border-black/5 hover:border-black/10"
            )}
          >
            Todos
          </button>
          {allTags.map(tag => {
            const isSelected = selectedTagId === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedTagId(isSelected ? null : tag.id!)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer select-none flex items-center gap-1.5",
                  isSelected
                    ? "shadow-sm scale-102"
                    : "bg-white text-black/60 border-black/5 hover:border-black/10"
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: hexToRgba(tag.color, 0.15),
                        color: tag.color,
                        borderColor: hexToRgba(tag.color, 0.3)
                      }
                    : {}
                }
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientId === client.id;

            const buyerProcesses = processes.filter(p => 
              p.clientId === client.id || 
              p.participants?.some(part => part.type === 'buyer' && part.id === client.id)
            );
            const sellerProcesses = processes.filter(p => 
              p.participants?.some(part => part.type === 'seller' && part.id === client.id)
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
              p.clientId === client.id || 
              p.participants?.some(part => part.id === client.id)
            );

            const activeProcesses = allClientProcesses.filter(p => 
              p.stage !== 'Finalizado' && 
              p.status !== 'Finalizado' && 
              p.status !== 'Cancelado'
            );
            
            const hasActiveProcess = activeProcesses.length > 0;
            const mainProcessId = hasActiveProcess ? activeProcesses[0].id : null;

            const isCreditApproved = client.approvedBanks && client.approvedBanks.length > 0 && client.approvedBanks.some(item => {
              if (!item.expirationDate) return true;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expDate = new Date(item.expirationDate);
              expDate.setHours(0, 0, 0, 0);
              return expDate >= today;
            });
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={client.id}
                onClick={() => {
                  const newId = isExpanded ? null : client.id!;
                  setExpandedClientId(newId);
                  if (!newId) onCloseDetail?.();
                }}
                className={cn(
                  "px-4 py-2 rounded-[24px] shadow-sm border transition-all relative group cursor-pointer overflow-hidden",
                  isCreditApproved ? "bg-emerald-50 border-emerald-300 shadow-emerald-50" : "bg-white border-black/10",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
              >
                <div className="flex flex-col min-h-[44px] justify-center">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#1a1a1a] leading-tight truncate">
                        {client.name}
                      </h3>
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-w-full overflow-hidden">
                          {client.tags.map(tagId => {
                            const tag = allTags.find(t => t.id === tagId);
                            if (!tag) return null;
                            return (
                              <span
                                key={tagId}
                                className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider truncate max-w-[120px] shadow-2xs border"
                                style={{
                                  backgroundColor: hexToRgba(tag.color, 0.15),
                                  color: tag.color,
                                  borderColor: hexToRgba(tag.color, 0.25)
                                }}
                              >
                                {tag.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {client.phone && (
                        <button 
                          onClick={() => handleWhatsApp(client.phone!)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm hover:scale-110 active:scale-95 transition-all"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      )}
                      {hasActiveProcess && mainProcessId && (
                        <button 
                          onClick={() => onOpenProcess?.(mainProcessId)}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-white shadow-sm hover:scale-110 active:scale-95 transition-all"
                          title="Ver Processo"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Bank Icons */}
                      {client.approvedBanks && client.approvedBanks.length > 0 && (
                        <div className="flex -space-x-1 ml-1">
                          {client.approvedBanks.map((item, idx) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (item.expirationDate) {
                              const expDate = new Date(item.expirationDate);
                              expDate.setHours(0, 0, 0, 0);
                              if (expDate < today) return null;
                            }

                            const bank = banks.find(b => b.id === item.bankId);
                            if (!bank?.logoUrl) return null;
                            return (
                              <div 
                                key={idx}
                                className="w-6 h-6 rounded-full border border-white bg-white overflow-hidden shadow-sm"
                                title={`Crédito Aprovado: ${bank.name}`}
                              >
                                <img 
                                  src={bank.logoUrl} 
                                  alt={bank.name} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
                          <span>CPF/CNPJ: {client.cpf}</span>
                        </div>
                      )}
                      {client.birthDate && (
                        <div className="flex items-center gap-3 text-sm text-[#1a1a1a] font-bold">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Nascimento: {client.birthDate.includes('-') 
                            ? client.birthDate.split('-').reverse().join('/') 
                            : client.birthDate}</span>
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
                      
                      {client.approvedBanks && client.approvedBanks.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-black/5">
                          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Bancos Aprovados</p>
                          <div className="grid grid-cols-1 gap-2">
                            {client.approvedBanks.map((item, idx) => {
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
                      
                      <div className="pt-4 flex justify-end gap-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            if (client.id) onCreateProcessForClient?.(client.id);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="Novo Processo"
                        >
                          <FilePlus className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            if (client.id) onOpenClientModal?.(client.id, true);
                          }}
                          className="p-2 text-black/60 hover:bg-black/5 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => setDeleteConfirmId(client.id!)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
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

      <TagsManagerModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        allTags={allTags}
      />
    </div>
  );
}
