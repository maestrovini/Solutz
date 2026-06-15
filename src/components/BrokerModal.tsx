import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Broker, Agency, UserProfile } from '../types';
import { X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (broker: Broker) => void;
  broker?: Broker | null;
}

export default function BrokerModal({ isOpen, onClose, onSuccess, broker }: BrokerModalProps) {
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    creci: '',
    email: '',
    phone: '',
    birthDate: '',
    agencyId: '',
    commercialId: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (broker) {
        setFormData({
          name: broker.name || '',
          creci: broker.creci || '',
          email: broker.email || '',
          phone: broker.phone || '',
          birthDate: broker.birthDate || '',
          agencyId: broker.agencyId || '',
          commercialId: broker.commercialId || '',
        });
      } else {
        setFormData({
          name: '',
          creci: '',
          email: '',
          phone: '',
          birthDate: '',
          agencyId: '',
          commercialId: '',
        });
      }
    }
  }, [isOpen, broker]);

  useEffect(() => {
    if (isOpen) {
      const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
        setAgencies((data as Agency[]).sort((a, b) => a.name.localeCompare(b.name)));
      });
      const unsubUsers = api.subscribeToCollection('users', (data) => {
        setUsers((data as UserProfile[]).sort((a, b) => (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '')));
      });

      return () => {
        unsubAgencies();
        unsubUsers();
      };
    }
  }, [isOpen]);

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

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const capitalize = (str: string) => {
      if (!str) return '';
      return str.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
    };

    const formattedName = capitalize(formData.name);
    const formattedEmail = formData.email ? formData.email.toLowerCase() : '';

    const brokerData = {
      ...formData,
      name: formattedName,
      email: formattedEmail,
      createdAt: broker?.createdAt || new Date().toISOString(),
    };

    try {
      let savedBroker: Broker;
      if (broker?.id) {
        await api.update('brokers', broker.id, brokerData);
        savedBroker = { ...brokerData, id: broker.id };
      } else {
        const created = await api.create('brokers', brokerData);
        savedBroker = { ...brokerData, id: created.id };
      }
      onSuccess?.(savedBroker);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar corretor:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white w-full max-w-lg max-h-[90vh] rounded-[32px] shadow-2xl border border-black/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">
                {broker ? 'Editar Corretor' : 'Novo Corretor'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  form="broker-modal-form"
                  disabled={loading}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-all disabled:opacity-50"
                  title="Salvar"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable form */}
            <div className="overflow-y-auto flex-1">
              <form id="broker-modal-form" onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    <label className="block text-sm font-medium text-black/60 mb-1">Data de Nascimento</label>
                    <input
                      type="text"
                      placeholder="00/00/0000"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: formatBirthDate(e.target.value) })}
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-black/60 mb-1">Comercial</label>
                    <select
                      value={formData.commercialId}
                      onChange={(e) => setFormData({ ...formData, commercialId: e.target.value })}
                      className="w-full px-4 py-2 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Nenhum comercial selecionado</option>
                      {users.map(u => (
                        <option key={u.id || u.uid} value={u.uid || u.id}>{u.displayName || u.username}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
