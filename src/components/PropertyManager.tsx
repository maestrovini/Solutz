import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Property, Process, Bank } from '../types';
import { Plus, Search, Trash2, Edit2, X, MapPin, Filter, AlertCircle, Save, Hash, Globe, Layout, FileText, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { capitalizeName } from '../utils/stringUtils';

import PropertyModal from './PropertyModal';

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

interface PropertyManagerProps {
  onOpenProcess?: (id: string) => void;
}

export default function PropertyManager({ onOpenProcess }: PropertyManagerProps) {
  const { isAdmin } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('address-asc');
  const { setTitle, setActions } = useHeader();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  const isAnyFilterActive = !!(typeFilter || cityFilter || neighborhoodFilter);

  useEffect(() => {
    setTitle('Imóveis');
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
            isFilterOpen || isAnyFilterActive
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Filtros"
        >
          <Filter className="w-5 h-5" />
          {isAnyFilterActive && !isFilterOpen && (
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
          title="Ordenar"
        >
          <ArrowUpDown className="w-5 h-5" />
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingProperty(null);
              setIsModalOpen(true);
            }}
            className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
            title="Novo Imóvel"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, isAnyFilterActive, isSortOpen, isAdmin]);

  useEffect(() => {
    const unsubProperties = api.subscribeToCollection('properties', (data) => {
      setProperties((data as Property[]).sort((a, b) => a.address.localeCompare(b.address)));
    });

    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });

    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks(data as Bank[]);
    });

    return () => {
      unsubProperties();
      unsubProcesses();
      unsubBanks();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete('properties', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
    }
  };

  const uniqueCities = React.useMemo(() => {
    const citiesSet = new Set<string>();
    properties.forEach(p => {
      if (p.city) {
        citiesSet.add(capitalizeName(p.city.trim()));
      }
    });
    return Array.from(citiesSet).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const uniqueNeighborhoods = React.useMemo(() => {
    const neighborhoodSet = new Set<string>();
    properties.forEach(p => {
      if (p.neighborhood) {
        neighborhoodSet.add(capitalizeName(p.neighborhood.trim()));
      }
    });
    return Array.from(neighborhoodSet).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.neighborhood && p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !typeFilter || p.type === typeFilter;
    const matchesCity = !cityFilter || p.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesNeighborhood = !neighborhoodFilter || (p.neighborhood && p.neighborhood.toLowerCase() === neighborhoodFilter.toLowerCase());
    return matchesSearch && matchesType && matchesCity && matchesNeighborhood;
  });

  const sortedProperties = React.useMemo(() => {
    return [...filteredProperties].sort((a, b) => {
      switch (sortOrder) {
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'neighborhood-asc': {
          const nameA = a.neighborhood || '';
          const nameB = b.neighborhood || '';
          return nameA.localeCompare(nameB);
        }
        case 'type-asc':
          return a.type.localeCompare(b.type);
        case 'address-asc':
        default:
          return a.address.localeCompare(b.address);
      }
    });
  }, [filteredProperties, sortOrder]);

  return (
    <div className="space-y-6">
      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        property={editingProperty}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingProperty(null);
        }}
      />

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
                placeholder="Buscar por endereço, cidade ou matrícula..."
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
            <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Tipo</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer text-xs font-semibold"
                >
                  <option value="">Todos os Tipos</option>
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Comercial">Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Cidade</label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer text-xs font-semibold"
                >
                  <option value="">Todas as Cidades</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Bairro</label>
                <select
                  value={neighborhoodFilter}
                  onChange={(e) => setNeighborhoodFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer text-xs font-semibold"
                >
                  <option value="">Todos os Bairros</option>
                  {uniqueNeighborhoods.map(neighborhood => (
                    <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                  ))}
                </select>
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
                type="button"
                onClick={() => setSortOrder('price-desc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'price-desc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Valor: Maior → Menor
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('price-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'price-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Valor: Menor → Maior
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('neighborhood-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'neighborhood-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Bairro: A-Z
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('type-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'type-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Tipo: A-Z
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('address-asc')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                  sortOrder === 'address-asc'
                    ? "bg-black text-white border-black"
                    : "bg-[#f5f5f0] text-black/40 border-transparent hover:bg-black/5"
                )}
              >
                Endereço: A-Z
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence mode="popLayout">
          {sortedProperties.map((property) => {
            const isExpanded = expandedPropertyId === property.id;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={property.id}
                onClick={() => setExpandedPropertyId(isExpanded ? null : property.id!)}
                className={cn(
                  "bg-white p-3 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col",
                  isExpanded ? "ring-2 ring-black/5" : ""
                )}
              >
                <div className="space-y-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#1a1a1a] leading-tight truncate">
                      {property.address}{property.number ? `, ${property.number}` : ''}{property.complement ? ` - ${property.complement}` : ''}
                    </h3>
                    <div className="text-[10px] font-bold text-black/30 uppercase tracking-wider mt-1 flex flex-wrap gap-x-2">
                       <span>{property.neighborhood ? `${capitalizeName(property.neighborhood)}, ` : ''}{property.cep ? `${property.cep}, ` : ''}{capitalizeName(property.city)} - {property.state}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex flex-wrap gap-1.5">
                      <div className="bg-black/5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-black/5 text-black/60">
                        {property.type}
                      </div>
                      {property.isNew && (
                        <div className="bg-sky-50 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-sky-100 text-sky-600">
                          Novo
                        </div>
                      )}
                      {property.price && (
                        <div className="bg-emerald-50 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-emerald-100 text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                        </div>
                      )}
                    </div>

                    {property.valuationBankId && (() => {
                      const bank = banks.find(b => b.id === property.valuationBankId);
                      if (!bank) return null;
                      return (
                        <div 
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.03] border border-black/5 text-black/60 hover:bg-black/5 transition-colors inline-flex ml-auto text-[8px] font-bold uppercase"
                          title={`Banco da Avaliação: ${bank.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {bank.logoUrl ? (
                            <img 
                              src={bank.logoUrl} 
                              alt={bank.name} 
                              className="h-3.5 w-3.5 object-contain rounded-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[7px] text-black/40">{bank.name.substring(0, 3)}</span>
                          )}
                          <span>{bank.name}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pt-4 border-t border-black/5 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {property.registrationNumber && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Matrícula</p>
                              <p className="text-sm font-bold text-[#1a1a1a]">{property.registrationNumber}</p>
                            </div>
                          )}
                          {property.zone && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Zona</p>
                              <p className="text-sm font-bold text-[#1a1a1a]">{property.zone}</p>
                            </div>
                          )}
                          {property.complement && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Complemento</p>
                              <p className="text-sm text-black/60">{property.complement}</p>
                            </div>
                          )}
                        </div>

                        {property.additionalInfo && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Informações</p>
                            <p className="text-sm text-black/60 leading-relaxed whitespace-pre-wrap">{property.additionalInfo}</p>
                          </div>
                        )}

                        {(() => {
                          const propertyProcesses = processes.filter(p => p.propertyId === property.id);
                          if (propertyProcesses.length === 0) return null;
                          return (
                            <div className="space-y-2 pt-2">
                              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Processos Vinculados</p>
                              <div className="flex flex-wrap gap-2">
                                {propertyProcesses.map(proc => (
                                  <button
                                    key={proc.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenProcess?.(proc.id!);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all group"
                                    title="Ver Processo"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{proc.type}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {isAdmin && (
                          <div className="pt-4 flex justify-end gap-2 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setEditingProperty(property);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-black/60 hover:bg-black/5 rounded-xl transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(property.id!)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
            <h3 className="text-xl font-bold mb-2 text-[#1a1a1a]">Excluir Imóvel?</h3>
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
                className="flex-1 px-6 py-3 rounded-full font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
