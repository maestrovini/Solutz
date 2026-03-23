import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Bank, UserProfile } from '../types';
import { Plus, Trash2, Edit2, X, Building2, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';

export default function BankManager() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setTitle, setActions } = useHeader();
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [user, setUser] = useState<UserProfile | null>({
    uid: 'admin-1',
    email: 'vinicius.lopes@msn.com',
    displayName: 'Vinícius Lopes',
    role: 'admin',
  });
  const [formData, setFormData] = useState<{
    name: string;
    logoUrl: string;
    processTypes: ('MCMV' | 'SBPE' | 'Pró-Cotista' | 'Home Equity')[];
  }>({
    name: '',
    logoUrl: '',
    processTypes: [],
  });

  const processOptions = ['MCMV', 'SBPE', 'Pró-Cotista', 'Home Equity'] as const;

  useEffect(() => {
    setTitle('Bancos Parceiros');
    if (user?.role === 'admin') {
      setActions(
        <button
          onClick={() => {
            setEditingBank(null);
            setFormData({ name: '', logoUrl: '', processTypes: [] });
            setIsModalOpen(true);
          }}
          className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm"
          title="Novo Banco"
        >
          <Plus className="w-5 h-5" />
        </button>
      );
    } else {
      setActions(null);
    }
  }, [user]);

  const fetchBanks = async () => {
    try {
      const data = await api.getData();
      setBanks(data.banks);
    } catch (error) {
      console.error("Erro ao buscar bancos:", error);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBank?.id) {
        await api.update('banks', editingBank.id, formData);
      } else {
        await api.create('banks', formData);
      }
      setIsModalOpen(false);
      setEditingBank(null);
      setFormData({ name: '', logoUrl: '', processTypes: [] });
      fetchBanks();
    } catch (error) {
      console.error("Erro ao salvar banco:", error);
    }
  };

  const toggleProcessType = (type: typeof processOptions[number]) => {
    setFormData(prev => ({
      ...prev,
      processTypes: prev.processTypes.includes(type)
        ? prev.processTypes.filter(t => t !== type)
        : [...prev.processTypes, type]
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir banco?")) {
      try {
        await api.delete('banks', id);
        fetchBanks();
      } catch (error) {
        console.error("Erro ao excluir banco:", error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {banks.map((bank) => {
          const handleEdit = () => {
            setEditingBank(bank);
            setFormData({ 
              name: bank.name, 
              logoUrl: bank.logoUrl || '',
              processTypes: bank.processTypes || []
            });
            setIsModalOpen(true);
          };

          return (
            <motion.div
              layout
              key={bank.id}
              className="bg-white p-3 rounded-[24px] shadow-sm border border-black/5 hover:shadow-md transition-all flex items-center gap-4 group relative"
            >
              <div 
                onClick={handleEdit}
                className="w-16 h-16 shrink-0 bg-[#f5f5f0] rounded-2xl flex items-center justify-center border border-black/5 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                title="Clique para editar"
              >
                {bank.logoUrl ? (
                  <img src={bank.logoUrl} alt={bank.name} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <Building2 className="text-black/40 w-8 h-8" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-[#1a1a1a] leading-tight">{bank.name}</h3>
                
                <div className="flex flex-wrap gap-1.5">
                  {bank.processTypes?.map((type) => (
                    <span 
                      key={type}
                      className="px-2 py-0.5 bg-black/5 text-black/60 text-[8px] font-bold uppercase tracking-wider rounded-full border border-black/5"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={handleEdit}
                    className="p-2 text-black/40 hover:bg-black/5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(bank.id!)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-black/10 overflow-hidden"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <h2 className="text-2xl font-sans font-bold text-[#1a1a1a]">{editingBank ? 'Editar Banco' : 'Novo Banco'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-black/5 text-black/40 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-black/60 mb-2">Nome da Instituição</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/60 mb-2">Tipos de Processos</label>
                  <div className="grid grid-cols-2 gap-2">
                    {processOptions.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleProcessType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          formData.processTypes.includes(type)
                            ? 'bg-black text-white border-black'
                            : 'bg-[#f5f5f0] text-black/40 border-black/5 hover:border-black/20'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black/60 mb-2">URL do Logo (opcional)</label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-black/40"
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-black/80 transition-all shadow-lg"
                >
                  {editingBank ? 'Salvar Alterações' : 'Cadastrar Banco'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
