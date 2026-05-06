import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Property } from '../types';
import { X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECity {
  id: number;
  nome: string;
}

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (property: Property) => void;
  property?: Property | null;
}

export default function PropertyModal({ isOpen, onClose, onSuccess, property }: PropertyModalProps) {
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<IBGEState[]>([]);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const [formData, setFormData] = useState({
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    cep: '',
    city: '',
    state: '',
    zone: '',
    registrationNumber: '',
    additionalInfo: '',
    price: '',
    type: 'Casa' as Property['type'],
  });

  useEffect(() => {
    if (isOpen) {
      if (property) {
        setFormData({
          address: property.address,
          number: property.number || '',
          complement: property.complement || '',
          neighborhood: property.neighborhood || '',
          cep: property.cep || '',
          city: property.city,
          state: property.state,
          zone: property.zone || '',
          registrationNumber: property.registrationNumber || '',
          additionalInfo: property.additionalInfo || '',
          price: property.price ? (property.price * 100).toString() : '',
          type: property.type,
        });
      } else {
        setFormData({
          address: '',
          number: '',
          complement: '',
          neighborhood: '',
          cep: '',
          city: '',
          state: '',
          zone: '',
          registrationNumber: '',
          additionalInfo: '',
          price: '',
          type: 'Casa',
        });
      }
    }
  }, [isOpen, property]);

  useEffect(() => {
    if (isOpen) {
      fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
        .then(res => res.json())
        .then(data => setStates(data))
        .catch(err => console.error("Erro ao buscar estados:", err));
    }
  }, [isOpen]);

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

  const parseCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) / 100 : 0;
  };

  const formatCurrencyInput = (value: string | number) => {
    if (value === undefined || value === null || value === '') return '';
    const stringValue = typeof value === 'number' ? Math.round(value * 100).toString() : value.replace(/\D/g, '');
    if (!stringValue) return '';
    const amount = (parseInt(stringValue, 10) / 100).toFixed(2);
    const [int, dec] = amount.split('.');
    const formattedInt = parseInt(int, 10).toLocaleString('pt-BR');
    return `R$ ${formattedInt},${dec}`;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const propertyData = {
      ...formData,
      price: formData.price !== '' ? parseCurrencyInput(formData.price) : undefined,
      createdAt: property?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      let result;
      if (property?.id) {
        await api.update('properties', property.id, propertyData);
        result = { ...propertyData, id: property.id };
      } else {
        result = await api.create('properties', propertyData);
      }
      onSuccess?.(result as Property);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-[32px] shadow-2xl border border-black/10 overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{property ? 'Editar Imóvel' : 'Novo Imóvel'}</h2>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="property-modal-form"
              disabled={loading}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-all disabled:opacity-50"
              title="Salvar"
            >
              {loading ? <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors">
              <X />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <form id="property-modal-form" onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-black/60 mb-1">Matrícula</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  placeholder="Nº da Matrícula"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black/60 mb-1">Zona</label>
                <input
                  type="text"
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

              <div>
                <label className="block text-sm font-medium text-black/60 mb-1">CEP</label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  placeholder="00000-000"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-black/60 mb-1">Valor</label>
                <input
                  type="text"
                  value={formatCurrencyInput(formData.price)}
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
  );
}
