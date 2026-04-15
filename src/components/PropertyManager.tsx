import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Property, Process } from '../types';
import { Plus, Search, Trash2, Edit2, X, MapPin, Filter, AlertCircle, Save, Hash, Globe, Layout, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { setTitle, setActions } = useHeader();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const [formData, setFormData] = useState({
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zone: '',
    registrationNumber: '',
    additionalInfo: '',
    price: '',
    type: 'Casa' as Property['type'],
  });

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
              setEditingProperty(null);
              setFormData({
                address: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: '',
                zone: '',
                registrationNumber: '',
                additionalInfo: '',
                price: '',
                type: 'Casa',
              });
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
  }, [isSearchOpen, searchTerm, isFilterOpen, isAdmin]);

  useEffect(() => {
    const unsubProperties = api.subscribeToCollection('properties', (data) => {
      setProperties((data as Property[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    });

    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });

    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then(data => setStates(data))
      .catch(err => console.error("Erro ao buscar estados:", err));

    return () => {
      unsubProperties();
      unsubProcesses();
    };
  }, []);

  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios?orderBy=nome`)
        .then(res => res.json())
        .then(data => {
          setCities(data);
          setLoadingCities(false);
        })
        .catch(err => {
          console.error("Erro ao buscar cidades:", err);
          setLoadingCities(false);
        });
    } else {
      setCities([]);
    }
  }, [formData.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const propertyData = {
      ...formData,
      price: formData.price !== '' ? parseFloat(formData.price) : undefined,
      createdAt: editingProperty?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingProperty?.id) {
        await api.update('properties', editingProperty.id, propertyData);
      } else {
        await api.create('properties', propertyData);
      }
      setIsModalOpen(false);
      setEditingProperty(null);
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.delete('properties', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Erro ao excluir imóvel:", error);
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.neighborhood && p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (p.registrationNumber && p.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !typeFilter || p.type === typeFilter;
    return matchesSearch && matchesType;
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
            <div className="bg-white p-6 rounded-[24px] border border-black/5 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-black/40 uppercase tracking-wider mb-3">Tipo</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos os Tipos</option>
                  <option value="Casa">Casa</option>
                  <option value="Apartamento">Apartamento</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Comercial">Comercial</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {filteredProperties.map((property) => {
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
                    <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight truncate">
                      {property.address}{property.number ? `, ${property.number}` : ''}{property.complement ? ` - ${property.complement}` : ''}
                    </h3>
                    <div className="text-[10px] font-bold text-black/30 uppercase tracking-wider mt-1 flex flex-wrap gap-x-2">
                      <span>{property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city} - {property.state}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <div className="bg-black/5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-black/5 text-black/60">
                      {property.type}
                    </div>
                    {property.price && (
                      <div className="bg-emerald-50 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-emerald-100 text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                      </div>
                    )}
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
                                setFormData({
                                  address: property.address,
                                  number: property.number || '',
                                  complement: property.complement || '',
                                  neighborhood: property.neighborhood || '',
                                  city: property.city,
                                  state: property.state,
                                  zone: property.zone || '',
                                  registrationNumber: property.registrationNumber || '',
                                  additionalInfo: property.additionalInfo || '',
                                  price: property.price?.toString() || '',
                                  type: property.type,
                                });
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
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    form="property-form"
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
                <form id="property-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Matrícula</label>
                      <input
                        type="number"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Nº da Matrícula"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Zona</label>
                      <input
                        type="number"
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Nº da Zona"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Tipo de Imóvel</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="Casa">Casa</option>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Terreno">Terreno</option>
                        <option value="Comercial">Comercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Estado</label>
                      <select
                        required
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecione</option>
                        {states.map(s => (
                          <option key={s.id} value={s.sigla}>{s.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Cidade</label>
                      <select
                        required
                        disabled={!formData.state || loadingCities}
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{loadingCities ? 'Carregando...' : 'Selecione'}</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Endereço</label>
                      <input
                        required
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Número</label>
                      <input
                        type="text"
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Nº"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={formData.complement}
                        onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Apto, Bloco, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-black/60 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Valor</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-black/60 mb-1">Informações</label>
                      <textarea
                        value={formData.additionalInfo}
                        onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                        className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all min-h-[100px] resize-none"
                        placeholder="Informações gerais sobre o imóvel..."
                      />
                    </div>
                  </div>
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
      </AnimatePresence>
    </div>
  );
}
