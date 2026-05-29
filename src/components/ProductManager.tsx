import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { Product, Client, Bank, Broker } from '../types';
import { 
  Plus, Search, Trash2, Edit2, X, Filter, ChevronDown, ChevronRight, 
  Percent, DollarSign, Calendar, Landmark, Users, TrendingUp, PiggyBank,
  CheckCircle2, ArrowRight, UserCheck, RefreshCw, FileEdit, AlertCircle, Sparkles, Building, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { hexToRgba, getContrastColor } from '../utils/colors';
import ClientModal from './ClientModal';

export default function ProductManager() {
  const { isAdmin } = useAuth();
  const { setTitle, setActions } = useHeader();

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  // Client Selection Modal & Autocomplete States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modals & Action States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formClientId, setFormClientId] = useState('');
  const [formName, setFormName] = useState('');
  const [formBankId, setFormBankId] = useState('');
  const [formCategory, setFormCategory] = useState<Product['category']>('Consórcio');
  const [formValue, setFormValue] = useState<number>(0);
  const [formInterestRate, setFormInterestRate] = useState('');
  const [formTermMonths, setFormTermMonths] = useState<number | ''>('');
  const [formCommissionPercent, setFormCommissionPercent] = useState<number | ''>('');
  const [formCommissionValue, setFormCommissionValue] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState<Product['status']>('Em andamento');
  const [formStage, setFormStage] = useState<Product['stage']>('Simulação');
  const [formBrokerId, setFormBrokerId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formExpirationDate, setFormExpirationDate] = useState('');

  // Dynamically obtain unique products from banks registered in the system
  const uniqueProductTypes = useMemo(() => {
    const types = new Set<string>();
    banks.forEach(b => {
      if (b.productTypes && Array.isArray(b.productTypes)) {
        b.productTypes.forEach(t => {
          if (t && typeof t === 'string' && t.trim()) {
            types.add(t.trim());
          }
        });
      }
    });
    // fallback if no bank has any products yet
    if (types.size === 0) {
      types.add('Consórcio');
      types.add('Seg Vida');
      types.add('Seg Residencial');
      types.add('Consignado');
    }
    return Array.from(types).sort();
  }, [banks]);

  const filteredFormBanks = useMemo(() => {
    if (!formCategory) return banks;
    return banks.filter(b => b.productTypes?.includes(formCategory));
  }, [banks, formCategory]);

  // Sync selected bank in the form when product changes to make sure it exists in the selected bank's offerings
  useEffect(() => {
    if (isModalOpen && formCategory && banks.length > 0) {
      const filtered = banks.filter(b => b.productTypes?.includes(formCategory));
      if (filtered.length > 0) {
        if (!filtered.some(b => b.id === formBankId)) {
          setFormBankId(filtered[0].id || '');
        }
      } else {
        if (!editingProduct) {
          setFormBankId('');
        }
      }
    }
  }, [formCategory, banks, isModalOpen, editingProduct, formBankId]);

  // 1. Unified Subscriptions to DB Collections
  useEffect(() => {
    // Set Header titles & action buttons
    setTitle('Vendas de Produtos');
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
            isFilterOpen || categoryFilter || statusFilter || stageFilter || bankFilter || brokerFilter
              ? "bg-white text-black border-white" 
              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
          )}
          title="Filtrar"
        >
          <Filter className="w-5 h-5" />
        </button>
        <button
          onClick={() => openForm()}
          className="p-2 bg-white text-black border border-white/10 rounded-lg hover:bg-white/80 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
          title="Registrar Produto Vendido"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Vender</span>
        </button>
      </div>
    );
  }, [isSearchOpen, searchTerm, isFilterOpen, categoryFilter, statusFilter, stageFilter, bankFilter, brokerFilter]);

  // Load all system registers
  useEffect(() => {
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients((data as Client[]).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks((data as Bank[]).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers((data as Broker[]).sort((a, b) => a.name.localeCompare(b.name)));
    });

    const unsubProducts = api.subscribeToCollection('products', async (data) => {
      let prods = data as Product[];
      
      // Auto-Seed visual examples if completely empty
      if (prods.length === 0 && loading) {
        // We will seed 3 gorgeous mock sold products
        const clientsSnap = await api.list('clients');
        const banksSnap = await api.list('banks');
        const brokersSnap = await api.list('brokers');

        const clientList = clientsSnap as Client[];
        const bankList = banksSnap as Bank[];
        const brokerList = brokersSnap as Broker[];

        if (clientList.length > 0 && bankList.length > 0) {
          const defaultSeeds: Partial<Product>[] = [
            {
              clientId: clientList[0].id || 'mock_client_1',
              name: 'Consórcio de Imóvel R$ 300k',
              bankId: bankList[0].id || 'mock_bank_1',
              category: 'Consórcio',
              value: 300000,
              interestRate: 'Taxa Adm 14%',
              termMonths: 200,
              commissionPercent: 1.5,
              commissionValue: 4500,
              status: 'Em andamento',
              stage: 'Simulação',
              brokerId: brokerList[0]?.id || '',
              notes: 'Cliente interessado em fazer lance de 30% na próxima assembleia para contemplação antecipada.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              clientId: clientList[0].id || 'mock_client_1',
              name: 'Financiamento Extra SBPE Portabilidade',
              bankId: bankList[1]?.id || bankList[0].id || 'mock_bank_2',
              category: 'Financiamento',
              value: 450000,
              interestRate: '9.8% a.a.',
              termMonths: 360,
              commissionPercent: 1.2,
              commissionValue: 5400,
              status: 'Em andamento',
              stage: 'Análise Cliente',
              brokerId: brokerList[0]?.id || '',
              notes: 'Laudo de avaliação jurídica pendente de envio pelo banco credor.',
              createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];

          for (const item of defaultSeeds) {
            await api.create('products', item);
          }
        }
      } else {
        setProducts(prods.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      setLoading(false);
    });

    return () => {
      unsubClients();
      unsubBanks();
      unsubBrokers();
      unsubProducts();
    };
  }, [loading]);

  // Auto calculate Commission Value whenever Value or Percent changes in form
  useEffect(() => {
    if (formValue && typeof formCommissionPercent === 'number') {
      const computed = Math.round(formValue * (formCommissionPercent / 100) * 100) / 100;
      setFormCommissionValue(computed);
    }
  }, [formValue, formCommissionPercent]);

  // Handlers
  const openForm = (prod: Product | null = null) => {
    setClientSearchTerm('');
    if (prod) {
      setEditingProduct(prod);
      setFormClientId(prod.clientId || '');
      setFormName(prod.name || '');
      setFormBankId(prod.bankId || '');
      setFormCategory(prod.category || uniqueProductTypes[0] || 'Consórcio');
      setFormValue(prod.value || 0);
      setFormInterestRate(prod.interestRate || '');
      setFormTermMonths(prod.termMonths || '');
      setFormCommissionPercent(prod.commissionPercent || '');
      setFormCommissionValue(prod.commissionValue || '');
      setFormStatus(prod.status || 'Em andamento');
      setFormStage(prod.stage || 'Simulação');
      setFormBrokerId(prod.brokerId || '');
      setFormNotes(prod.notes || '');
      setFormExpirationDate(prod.expirationDate || '');
    } else {
      const defaultCategory = uniqueProductTypes[0] || 'Consórcio';
      const matchingBanks = banks.filter(b => b.productTypes?.includes(defaultCategory));
      setEditingProduct(null);
      setFormClientId('');
      setFormName('');
      setFormBankId(matchingBanks[0]?.id || banks[0]?.id || '');
      setFormCategory(defaultCategory);
      setFormValue(0);
      setFormInterestRate('');
      setFormTermMonths('');
      setFormCommissionPercent('');
      setFormCommissionValue('');
      setFormStatus('Em andamento');
      setFormStage('Simulação');
      setFormBrokerId(brokers[0]?.id || '');
      setFormNotes('');
      setFormExpirationDate('');
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formBankId || !formCategory || !formValue) {
      alert("Por favor, preencha todos os campos obrigatórios (Cliente, Banco, Produto e Valor).");
      return;
    }

    const finalName = formName || formCategory;

    const payload: Partial<Product> = {
      clientId: formClientId,
      name: finalName,
      bankId: formBankId,
      category: formCategory,
      value: Number(formValue),
      interestRate: formInterestRate || undefined,
      termMonths: formTermMonths ? Number(formTermMonths) : undefined,
      commissionPercent: formCommissionPercent ? Number(formCommissionPercent) : undefined,
      commissionValue: formCommissionValue ? Number(formCommissionValue) : undefined,
      status: formStatus,
      stage: formStage,
      brokerId: formBrokerId || undefined,
      notes: formNotes || undefined,
      expirationDate: formExpirationDate || undefined,
      updatedAt: new Date().toISOString(),
      createdAt: editingProduct?.createdAt || new Date().toISOString()
    };

    try {
      if (editingProduct?.id) {
        await api.update('products', editingProduct.id, payload);
      } else {
        await api.create('products', payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar produto vendido:", err);
    }
  };

  const handleAdvanceStage = async (p: Product) => {
    const nextStages: Record<Product['stage'], Product['stage'] | null> = {
      'Simulação': 'Análise Cliente',
      'Análise Cliente': 'Contratado',
      'Contratado': null
    };

    const next = nextStages[p.stage];
    if (next && p.id) {
      const upPayload: Partial<Product> = {
        stage: next,
        updatedAt: new Date().toISOString()
      };
      if (next === 'Contratado') {
        upPayload.status = 'Finalizado';
      }
      await api.update('products', p.id, upPayload);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.delete('products', id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Erro ao excluir produto vendido:", err);
    }
  };

  // Helper Methods
  const getClientName = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.name : "Desconhecido";
  };

  const getClientContact = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? `${c.phone || ''} ${c.cpf ? '• CPF/CNPJ: '+c.cpf : ''}` : '';
  };

  const getBankName = (id: string) => {
    const b = banks.find(bn => bn.id === id);
    return b ? b.name : "Geral / Outros";
  };

  const getBankColor = (id: string) => {
    const b = banks.find(bn => bn.id === id);
    return b?.color || "#0284c7";
  };

  const getBrokerName = (id?: string) => {
    if (!id) return "Sem corretor";
    const br = brokers.find(b => b.id === id);
    return br ? br.name : "Geral";
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getDaysInCurrentStage = (product: Product) => {
    const startDate = new Date(product.updatedAt || product.createdAt || new Date().toISOString());
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - startDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days === 0 ? 1 : days; // Show at least 1 day if it's in the stage
  };

  const getFinishedDate = (product: Product) => {
    return new Date(product.updatedAt || product.createdAt).toLocaleDateString('pt-BR');
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const activeProducts = products.filter(p => p.status !== 'Cancelado');
    const totalVolume = activeProducts.reduce((sum, p) => sum + (p.value || 0), 0);
    const totalCommission = activeProducts.reduce((sum, p) => sum + (p.commissionValue || 0), 0);
    const count = activeProducts.length;
    const closedVolume = products.filter(p => p.stage === 'Contratado').reduce((sum, p) => sum + (p.value || 0), 0);

    return {
      volume: totalVolume,
      commission: totalCommission,
      salesCount: count,
      paidVolume: closedVolume
    };
  }, [products]);

  // Filtering products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const clientName = getClientName(p.clientId).toLowerCase();
      const prodName = (p.name || '').toLowerCase();
      const bankName = getBankName(p.bankId).toLowerCase();
      
      const textMatch = !searchTerm || 
        clientName.includes(searchTerm.toLowerCase()) || 
        prodName.includes(searchTerm.toLowerCase()) || 
        bankName.includes(searchTerm.toLowerCase());

      const categoryMatch = !categoryFilter || p.category === categoryFilter;
      const statusMatch = !statusFilter || p.status === statusFilter;
      const stageMatch = !stageFilter || p.stage === stageFilter;
      const bankMatch = !bankFilter || p.bankId === bankFilter;
      const brokerMatch = !brokerFilter || p.brokerId === brokerFilter;

      return textMatch && categoryMatch && statusMatch && stageMatch && bankMatch && brokerMatch;
    });
  }, [products, searchTerm, categoryFilter, statusFilter, stageFilter, bankFilter, brokerFilter, clients, banks]);

  // Stage Style mapping
  const stageStyles: Record<Product['stage'], { bg: string, text: string }> = {
    'Simulação': { bg: 'bg-zinc-100 text-zinc-700 border-zinc-200/50', bgHex: '#f4f4f5' } as any,
    'Análise Cliente': { bg: 'bg-amber-100 text-amber-800 border-amber-200/50', bgHex: '#fef3c7' } as any,
    'Contratado': { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200/50', bgHex: '#d1fae5' } as any,
  };

  // Status Style mapping
  const statusStyles: Record<Product['status'], { badge: string, circle: string }> = {
    'Em andamento': { badge: 'bg-amber-500/10 text-amber-600', circle: 'bg-amber-500' },
    'Finalizado': { badge: 'bg-emerald-500/10 text-emerald-600', circle: 'bg-emerald-500' },
    'Cancelado': { badge: 'bg-red-500/10 text-red-600', circle: 'bg-red-500' }
  };

  const categoryStyles: Record<Product['category'], { bg: string, text: string, border: string }> = {
    'Financiamento': { bg: 'bg-[#005ca9]/10', text: 'text-[#005ca9]', border: 'border-[#005ca9]/20' },
    'Consórcio': { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/20' },
    'Seguro': { bg: 'bg-[#10b981]/10', text: 'text-[#10b981]', border: 'border-[#10b981]/20' },
    'Crédito': { bg: 'bg-[#8b5cf6]/10', text: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]/20' },
    'Outro': { bg: 'bg-black/5', text: 'text-black/60', border: 'border-black/10' }
  };

  const handleCurrencyInput = (valStr: string) => {
    const numeric = Number(valStr.replace(/\D/g, '')) / 100;
    setFormValue(numeric || 0);
  };

  return (
    <div className="space-y-4">
      {/* 2. Interactive Filters Panels */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border border-black/5 rounded-xl p-4 shadow-sm"
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-black/35" />
              <input
                type="text"
                placeholder="Buscar por nome do cliente, descrição ou banco parceiro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f5f5f0] border-0 rounded-xl text-xs font-medium focus:ring-1 focus:ring-black outline-none"
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
            className="overflow-hidden bg-white border border-black/5 rounded-xl p-4 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Category */}
              <div>
                <label className="block text-[9px] font-bold text-black/40 uppercase tracking-wider mb-1">Produto</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Todos</option>
                  {uniqueProductTypes.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[9px] font-bold text-black/40 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Todos</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className="block text-[9px] font-bold text-black/40 uppercase tracking-wider mb-1">Fase/Etapa</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Todas as Fases</option>
                  <option value="Simulação">Simulação</option>
                  <option value="Análise Cliente">Análise Cliente</option>
                  <option value="Contratado">Contratado</option>
                </select>
              </div>

              {/* Bank */}
              <div>
                <label className="block text-[9px] font-bold text-black/40 uppercase tracking-wider mb-1">Banco Parceiro</label>
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Todos os Bancos</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Broker */}
              <div>
                <label className="block text-[9px] font-bold text-black/40 uppercase tracking-wider mb-1">Corretor Responsável</label>
                <select
                  value={brokerFilter}
                  onChange={(e) => setBrokerFilter(e.target.value)}
                  className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="">Todos</option>
                  {brokers.map(br => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(categoryFilter || statusFilter || stageFilter || bankFilter || brokerFilter || searchTerm) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setCategoryFilter('');
                    setStatusFilter('');
                    setStageFilter('');
                    setBankFilter('');
                    setBrokerFilter('');
                    setSearchTerm('');
                  }}
                  className="text-[9px] font-extrabold uppercase tracking-widest text-[#ef4444] hover:text-[#ef4444]/90 bg-red-50 hover:bg-red-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Limpar Filtros
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Empty State or Products Sold List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/5 p-12 text-center shadow-xs">
          <TrendingUp className="w-10 h-10 text-black/15 mx-auto mb-3" />
          <p className="text-xs font-bold text-black/70 mb-1">Nenhuma venda de produto localizada</p>
          <p className="text-[10px] text-black/40">Clique em "Registrar Venda" para começar a acompanhar o fluxo dos seus produtos vendidos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map((p) => {
            const clientName = getClientName(p.clientId);
            const clientContact = getClientContact(p.clientId);
            const bankColor = getBankColor(p.bankId);
            const bankName = getBankName(p.bankId);
            const bankLogo = banks.find(b => b.id === p.bankId)?.logoUrl;
            const brokerName = getBrokerName(p.brokerId);
            
            const catStyle = categoryStyles[p.category] || { bg: 'bg-black/5', text: 'text-black/60', border: 'border-black/5' };
            const statusStyle = statusStyles[p.status] || { badge: 'bg-amber-500/10 text-amber-600', circle: 'bg-amber-500' };

            const canAdvance = p.stage !== 'Contratado';
            const productStages: Product['stage'][] = ['Simulação', 'Análise Cliente', 'Contratado'];

            return (
              <motion.div
                layout
                key={p.id}
                onClick={() => openForm(p)}
                className="bg-white p-4 rounded-[24px] shadow-sm border hover:shadow-md transition-all relative cursor-pointer"
                style={{ 
                  borderColor: hexToRgba(bankColor, 0.3)
                }}
              >
                <div className="w-full space-y-2.5">
                  {/* Top header flex row */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Cliente</p>
                      <div className="text-sm font-semibold text-[#1a1a1a]">
                        {clientName}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {p.stage === 'Contratado' || p.status === 'Finalizado' ? (
                          <div 
                            className="h-8 px-2 flex items-center gap-1.5 rounded-lg border transition-colors" 
                            title="Data de Finalização"
                            style={{ 
                              backgroundColor: hexToRgba(bankColor, 0.05),
                              borderColor: hexToRgba(bankColor, 0.1)
                            }}
                          >
                            <Calendar className="w-3.5 h-3.5" style={{ color: bankColor }} />
                            <span className="text-[10px] font-bold" style={{ color: bankColor }}>{getFinishedDate(p)}</span>
                          </div>
                        ) : (
                          <div 
                            className="h-8 px-2 flex items-center gap-1.5 rounded-lg border transition-colors" 
                            title="Dias na etapa atual"
                            style={{ 
                              backgroundColor: hexToRgba(bankColor, 0.05),
                              borderColor: hexToRgba(bankColor, 0.1)
                            }}
                          >
                            <Clock className="w-3.5 h-3.5" style={{ color: bankColor }} />
                            <span className="text-[10px] font-bold" style={{ color: bankColor }}>{getDaysInCurrentStage(p)}d</span>
                          </div>
                        )}
                      </div>

                      {bankLogo ? (
                        <div className="h-8 w-8 bg-black/5 rounded-lg overflow-hidden shrink-0 border border-black/5" title={bankName}>
                          <img 
                            src={bankLogo} 
                            alt={bankName} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] bg-black/5 px-2 py-1 rounded-lg font-bold text-black/50">{bankName}</span>
                      )}
                    </div>
                  </div>

                  <div 
                    className="flex items-center gap-2 py-1.5 px-2 rounded-xl border transition-colors"
                    style={{ 
                      backgroundColor: hexToRgba(bankColor, 0.05),
                      borderColor: hexToRgba(bankColor, 0.1)
                    }}
                  >
                    <TrendingUp className="w-3 h-3" style={{ color: bankColor }} />
                    <span className="text-[10px] font-bold truncate" style={{ color: bankColor }}>
                      {p.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Valor</p>
                      <p className="text-sm font-bold text-[#1a1a1a]">
                        {formatCurrency(p.value)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-black/40">Vencimento</p>
                      <p className="text-xs font-bold text-[#1a1a1a] font-mono pt-0.5">
                        {p.expirationDate ? p.expirationDate.split('-').reverse().join('/') : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Segmented Progress Tracker - Coherent with ProcessManager */}
                  <div className="grid grid-cols-3 gap-1">
                    {productStages.map((s, idx) => {
                      const isCurrent = s === p.stage;
                      const stageIdx = productStages.indexOf(s);
                      const currentIdx = productStages.indexOf(p.stage);
                      const isPast = stageIdx < currentIdx;
                      
                      const baseColor = bankColor;
                      const opacities = [0.2, 0.4, 0.6, 0.8, 1];
                      const opacity = opacities[idx] || 1;
                      
                      const bgColor = hexToRgba(baseColor, opacity);
                      const textColor = opacity > 0.5 ? getContrastColor(baseColor) : 'rgba(0, 0, 0, 0.6)';
                      const borderColor = hexToRgba(baseColor, opacity + 0.1);

                      return (
                        <div 
                          key={s}
                          className={cn(
                            "h-5 flex items-center justify-center rounded-md transition-all border px-1",
                            (isCurrent || isPast) ? "" : "text-black/20 border-black/5 bg-[#f5f5f0]/50",
                            isCurrent && "shadow-sm ring-1"
                          )}
                          style={{ 
                            backgroundColor: (isCurrent || isPast) ? bgColor : undefined,
                            color: (isCurrent || isPast) ? textColor : undefined,
                            borderColor: (isCurrent || isPast) ? borderColor : undefined,
                            boxShadow: isCurrent ? `0 0 0 2px ${hexToRgba(baseColor, 0.2)}` : undefined
                          }}
                        >
                          <span className="text-[6.5px] font-bold uppercase truncate tracking-tighter">{s}</span>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 4. Dynamic Sold Product Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[120]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-black/10 w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]"
            >
              <div className="p-4 border-b border-black/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#005ca9]/10 text-[#005ca9] flex items-center justify-center border border-[#005ca9]/15">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1a1a]">
                      {editingProduct ? "Editar Produto Vendido" : "Vender Novo Produto"}
                    </h3>
                    <p className="text-[10px] text-black/40">Insira as informações do contrato vendido</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-black/5 rounded-lg text-black/40 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {/* Section: Proponent / Client & Product Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1 flex items-center justify-between">
                      <span>Cliente *</span>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex items-center gap-1 text-black/40 hover:text-black transition-colors"
                        title="Cadastrar Novo Cliente"
                      >
                        <Plus className="w-3.5 h-3.5 text-black/45" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Novo Cliente</span>
                      </button>
                    </label>

                    {formClientId ? (
                      <div className="flex items-center gap-2 bg-[#f5f5f0] hover:bg-black/5 px-3 py-2 rounded-xl border border-black/5 font-sans">
                        <Users className="w-3.5 h-3.5 text-black/50 shrink-0" />
                        <span className="text-xs font-semibold text-black/80 truncate flex-1">
                          {getClientName(formClientId)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormClientId('')}
                          className="p-0.5 hover:bg-black/10 rounded-full text-black/40 transition-colors"
                          title="Remover Cliente"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-black/35" />
                        <input
                          type="text"
                          placeholder="Buscar no cadastro..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-black font-sans"
                        />
                        {clientSearchTerm && (
                          <div className="absolute top-full left-0 z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-48 overflow-y-auto p-2 font-sans">
                            {clients
                              .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormClientId(c.id!);
                                    setClientSearchTerm('');
                                  }}
                                  className="w-full text-left text-xs p-2 hover:bg-black/5 rounded-lg transition-colors flex items-center justify-between group text-black/60"
                                >
                                  <div>
                                    <span className="font-semibold text-black/80">{c.name}</span>
                                    {c.cpf && <span className="text-[10px] text-black/40 ml-2">• CPF/CNPJ: {c.cpf}</span>}
                                  </div>
                                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                                </button>
                              ))}
                            {clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                              <div className="p-2 text-center text-[10px] text-black/40">
                                Nenhum cliente encontrado
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Produto *</label>
                    <select
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-3 py-2 outline-none focus:ring-1 focus:ring-black"
                    >
                      {uniqueProductTypes.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Banco / Emissora *</label>
                    <select
                      required
                      value={formBankId}
                      onChange={(e) => setFormBankId(e.target.value)}
                      className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-3 py-2 outline-none focus:ring-1 focus:ring-black"
                    >
                      {filteredFormBanks.length === 0 ? (
                        <option value="">Nenhum banco oferece este produto</option>
                      ) : (
                        filteredFormBanks.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Section: Financial terms */}
                <div>
                  <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Valor *</label>
                  <input
                    type="text"
                    required
                    placeholder="R$ 0,00"
                    value={formValue ? formatCurrency(formValue) : ''}
                    onChange={(e) => handleCurrencyInput(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs text-right font-semibold font-mono px-3 py-2 outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={formExpirationDate}
                    onChange={(e) => setFormExpirationDate(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-3 py-2 outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* Section: Stage */}
                <div>
                   <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Etapa Atual</label>
                   <select
                     value={formStage}
                     onChange={(e) => {
                       const nextStage = e.target.value as any;
                       setFormStage(nextStage);
                       if (nextStage === 'Contratado') {
                         setFormStatus('Finalizado');
                       }
                     }}
                     className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs font-semibold px-3 py-2 outline-none focus:ring-1 focus:ring-black"
                   >
                     <option value="Simulação">Simulação</option>
                     <option value="Análise Cliente">Análise Cliente</option>
                     <option value="Contratado">Contratado</option>
                   </select>
                </div>

                {/* Section: Notes */}
                <div>
                  <label className="block font-bold text-black/50 uppercase tracking-wide text-[9px] mb-1">Notas e Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Detalhes adicionais de negociação, prazos ou pendências..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-0 rounded-xl text-xs px-3 py-2 outline-none focus:ring-1 focus:ring-black resize-none"
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="border-t border-black/5 pt-4 flex justify-between items-center shrink-0">
                  {editingProduct && isAdmin ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("Tem certeza de que deseja excluir este produto?")) {
                          await handleDeleteProduct(editingProduct.id!);
                          setIsModalOpen(false);
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Excluir Produto
                    </button>
                  ) : <div />}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-[#f5f5f0] hover:bg-black/5 text-black px-4.5 py-2 rounded-xl font-bold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-black hover:bg-black/80 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Registrar Produto
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={(client) => {
            setFormClientId(client.id!);
            setIsClientModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
