import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Client, Bank } from '../types';
import { Search, Calculator, ExternalLink, User, Building2, DollarSign, Calendar, Users, CheckCircle2, X, Copy, Info, Save, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

export default function SimulationManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showIframe, setShowIframe] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [simResults, setSimResults] = useState({
    quota: '',
    interestRate: '',
    firstInstallment: '',
    term: '',
    notes: ''
  });

  const { setTitle, setActions } = useHeader();

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedBank = banks.find(b => b.id === selectedBankId);

  useEffect(() => {
    setTitle('Central de Simulação');
    setActions(null);
  }, []);

  useEffect(() => {
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients((data as Client[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks((data as Bank[]).sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => {
      unsubClients();
      unsubBanks();
    };
  }, []);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/E';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenSimulator = () => {
    if (selectedBank?.simulatorUrl) {
      setShowIframe(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection & Assistant */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-black/5 space-y-6">
            <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <Calculator className="w-5 h-5 text-black/40" />
              Configurar
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 px-1">Cliente</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none appearance-none cursor-pointer text-sm font-medium"
                  >
                    <option value="">Selecione...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1.5 px-1">Banco</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f0] text-[#1a1a1a] rounded-xl border border-black/10 focus:ring-2 focus:ring-black/5 outline-none appearance-none cursor-pointer text-sm font-medium"
                  >
                    <option value="">Selecione...</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedBank?.simulatorUrl && (
                <button
                  onClick={handleOpenSimulator}
                  disabled={!selectedClientId}
                  className="w-full py-3.5 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg"
                >
                  <ExternalLink className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  Iniciar Simulação
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {selectedClient && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-black p-6 rounded-[32px] text-white space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Copiador de Dados</h3>
                  <Info className="w-4 h-4 text-white/20" />
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Nome', value: selectedClient.name },
                    { label: 'CPF', value: selectedClient.cpf || 'Não informado' },
                    { label: 'Renda', value: formatCurrency(selectedClient.income) },
                    { label: 'Nascimento', value: selectedClient.birthDate ? new Date(selectedClient.birthDate).toLocaleDateString('pt-BR') : 'Não informado' },
                    { label: 'Estado Civil', value: selectedClient.maritalStatus || 'Não informado' },
                  ].map((field) => (
                    <button
                      key={field.label}
                      onClick={() => copyToClipboard(field.value, field.label)}
                      className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group border border-white/5"
                    >
                      <div className="text-left overflow-hidden pr-2">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{field.label}</p>
                        <p className="text-[11px] font-bold text-white/90 truncate">{field.value}</p>
                      </div>
                      {copiedField === field.label ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Panel / Simulator View */}
        <div className="lg:col-span-2 min-h-[500px]">
          {!showIframe ? (
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5 h-full flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 bg-[#f5f5f0] rounded-2xl flex items-center justify-center">
                  <ExternalLink className="w-8 h-8 text-black/10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-[#1a1a1a]">Preparar Simulação</h3>
                  <p className="text-sm text-black/40 max-w-sm mx-auto">
                    Selecione um cliente e um banco. O sistema disponibilizará os dados financeiros para você preencher no simulador oficial.
                  </p>
                </div>
              </div>

              {selectedClient && selectedBank && (
                <div className="mt-auto p-6 bg-[#f5f5f0] rounded-[24px] border border-black/5 space-y-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Save className="w-4 h-4 text-black/40" />
                    Registrar Resultados da Simulação
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-black/40 uppercase px-1">Cota (%)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 80"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-black/5 text-sm outline-none focus:ring-1 focus:ring-black/5"
                        value={simResults.quota}
                        onChange={(e) => setSimResults({...simResults, quota: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-black/40 uppercase px-1">Taxa (a.a)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 9.5%"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-black/5 text-sm outline-none focus:ring-1 focus:ring-black/5"
                        value={simResults.interestRate}
                        onChange={(e) => setSimResults({...simResults, interestRate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-black/40 uppercase px-1">1ª Parc.</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 2100"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-black/5 text-sm outline-none focus:ring-1 focus:ring-black/5"
                        value={simResults.firstInstallment}
                        onChange={(e) => setSimResults({...simResults, firstInstallment: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-black/40 uppercase px-1">Prazo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 420"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-black/5 text-sm outline-none focus:ring-1 focus:ring-black/5"
                        value={simResults.term}
                        onChange={(e) => setSimResults({...simResults, term: e.target.value})}
                      />
                    </div>
                  </div>
                  <button className="w-full py-3 bg-[#1a1a1a] text-white rounded-xl font-bold text-xs hover:bg-black transition-colors shadow-sm">
                    Salvar Resultados no Perfil do Cliente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[32px] shadow-sm border border-black/10 h-full min-h-[600px] flex flex-col overflow-hidden">
              <div className="bg-[#f5f5f0] p-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-black/40" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Simulador Externo</p>
                    <p className="text-xs font-bold text-[#1a1a1a]">{selectedBank?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => window.open(selectedBank?.simulatorUrl, '_blank')}
                    className="p-2 hover:bg-black/5 rounded-lg text-black/40 transition-colors"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowIframe(false)}
                    className="p-2 hover:bg-black/5 rounded-lg text-black/40 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-black/5 relative overflow-hidden">
                {/* Overlay Alert since banks usually block iframes */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/95 z-20">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Protocolo de Segurança Bancária</h3>
                  <p className="text-sm text-black/60 max-w-sm mb-8 leading-relaxed">
                    Sistemas bancários bloqueiam o carregamento dentro de outros aplicativos por segurança. 
                    Utilize o botão abaixo para abrir o simulador oficial e use o <strong>Painel Lateral de Dados</strong> para transcrever os valores.
                  </p>
                  <div className="space-y-4 w-full max-w-xs">
                    <button 
                      onClick={() => window.open(selectedBank?.simulatorUrl, '_blank')}
                      className="w-full px-8 py-4 bg-black text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 group"
                    >
                      Abrir Simulador Oficial
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button 
                      onClick={() => setShowIframe(false)}
                      className="w-full py-2 text-xs font-bold text-black/40 hover:text-black transition-colors"
                    >
                      Voltar para Central
                    </button>
                  </div>
                </div>
                
                {/* 
                  The Iframe is here for future-proofing or in case 
                  the user is using a specific bank that allows it.
                */}
                <iframe 
                  src={selectedBank?.simulatorUrl} 
                  className="w-full h-full border-none opacity-50"
                  title="Simulador de Banco"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
