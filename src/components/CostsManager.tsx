import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Copy, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  Building2, 
  Landmark, 
  Percent, 
  FileText, 
  Sparkles, 
  Info, 
  ExternalLink,
  ChevronDown,
  Trash2,
  Share2,
  Calendar,
  AlertCircle,
  Scale,
  X,
  Search,
  Gavel,
  BookOpen
} from 'lucide-react';
import { Process, Client, Bank, Property, CostSimulation } from '../types';
import { useHeader } from '../context/HeaderContext';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

interface CostsManagerProps {
  processes?: Process[];
  clients?: Client[];
  banks?: Bank[];
  properties?: Property[];
}

interface CityPreset {
  name: string;
  state: string;
  rate: number;
}

// Porto Alegre ITBI Legal Rules (Legislação Tributária Municipal de Porto Alegre)
// Unidade Financeira Municipal (UFM) de Porto Alegre em 2026: R$ 6,0411
export const POA_UFM_2026 = 6.0411;
export const POA_UFM_REDUCED_LIMIT = 68000; // 68.000 UFMs
export const POA_REDUCED_CEILING = POA_UFM_REDUCED_LIMIT * POA_UFM_2026; // R$ 410.794,80
export const POA_GENERAL_RATE = 3.0; // 3,0%
export const POA_REDUCED_RATE = 0.5; // 0,5%

const COMMON_CITIES: CityPreset[] = [
  { name: 'Porto Alegre', state: 'RS', rate: 3.0 },
];

const BANK_FEE_ESTIMATES: Record<string, number> = {
  'caixa': 3100,
  'itau': 3500,
  'itaú': 3500,
  'santander': 3300,
  'bradesco': 3400,
  'banco do brasil': 3100,
  'bb': 3100,
  'inter': 2900,
  'default': 3200
};

export interface LegislationTopic {
  id: string;
  title: string;
  badge: string;
  category: 'sfh' | 'cartorio' | 'itbi' | 'geral';
  lawReference: string;
  articleCitation: string;
  explanation: string;
  practicalTips: string;
}

export const LEGISLATION_TOPICS: LegislationTopic[] = [
  {
    id: 'art-290',
    title: 'Desconto de 50% no Registro e Escritura do 1º Imóvel',
    badge: 'Art. 290 da Lei 6.015/73',
    category: 'sfh',
    lawReference: 'Lei Federal nº 6.015/1973 (Lei de Registros Públicos), Artigo 290',
    articleCitation: 'Art. 290. Os emolumentos devidos pelos atos relacionados com a primeira aquisição imobiliária para fins residenciais, financiada pelo Sistema Financeiro da Habitação, serão reduzidos em 50% (cinquenta por cento).',
    explanation: 'Garante redução pela metade dos valores cobrados pelos cartórios de registro de imóveis e tabelionatos de notas quando o comprador estiver adquirindo seu primeiro imóvel residencial financiado no âmbito do SFH.',
    practicalTips: 'Para usufruir do desconto, o adquirente deve firmar declaração expressa perante o Cartório de Registro de Imóveis atestando sob as penas da lei que se trata de sua primeira aquisição imobiliária residencial financiada pelo SFH.'
  },
  {
    id: 'escritura-dispensa',
    title: 'Força de Escritura Pública do Contrato de Financiamento',
    badge: 'Lei 4.380/64 & Lei 9.514/97',
    category: 'cartorio',
    lawReference: 'Lei Federal nº 4.380/1964, Art. 61, § 5º e Lei Federal nº 9.514/1997, Art. 38',
    articleCitation: 'Os atos e contratos referidos nesta Lei ou resultantes da sua aplicação, mesmo aqueles que importem constituição ou transferência de direitos reais sobre imóveis com garantia fiduciária, poderão ser celebrados por instrumento particular, ao qual se atribuem todos os efeitos de escritura pública.',
    explanation: 'Nos contratos celebrados com garantia de alienação fiduciária pelo SFH ou SFI, o instrumento particular assinado pelo banco e compradores tem eficácia jurídica idêntica à de uma escritura pública notarial.',
    practicalTips: 'Não há necessidade de pagar emolumentos de Escritura Pública em Tabelionato de Notas para aquisições financiadas, gerando economia que varia de R$ 2.000 a mais de R$ 8.000 em relação a compras à vista sem garantia bancária.'
  },
  {
    id: 'itbi-poa-ufm',
    title: 'ITBI Porto Alegre - Alíquota Reduzida de 0,5% até 68.000 UFMs',
    badge: 'Lei Comp. 197/89 (POA)',
    category: 'itbi',
    lawReference: 'Lei Complementar Municipal nº 197/1989 (Porto Alegre) e Fixação UFM 2026',
    articleCitation: 'Alíquota de 0,5% para os valores efetivamente financiados nos contratos de financiamento imobiliário residencial, inclusive consórcios imobiliários, com prazo mínimo de 5 anos e recursos do FGTS do adquirente, limitada a 68.000 UFMs. Alíquota geral de 3,0% sobre o excedente e recursos próprios. Valor da UFM em 2026: R$ 6,0411 (Teto: R$ 410.794,80).',
    explanation: 'Em Porto Alegre, os adquirentes de imóveis residenciais com financiamento ou consórcio com prazo igual ou superior a 5 anos (ou recursos do FGTS) usufruem da alíquota incentivada de 0,5% sobre a parcela financiada até o teto de 68.000 UFMs (R$ 410.794,80 em 2026). O valor que exceder esse teto e os recursos próprios (entrada) são tributados à alíquota padrão de 3,0%.',
    practicalTips: 'Ao solicitar a guia de ITBI perante a Secretaria Municipal da Fazenda de Porto Alegre (SMF), anexe o contrato bancário ou instrumento de consórcio contendo a especificação do valor financiado e FGTS para aplicação correta da alíquota favorecida.'
  },
  {
    id: 'stj-tema-1113',
    title: 'Base de Cálculo do ITBI - Precedente Vinculante STJ',
    badge: 'STJ - Tema Repetitivo 1.113',
    category: 'itbi',
    lawReference: 'Superior Tribunal de Justiça - REsp 1.937.821/SP (Tema 1.113)',
    articleCitation: '1) A base de cálculo do ITBI é vinculada ao valor do imóvel transmitido em condições normais de mercado, não estando vinculada à base de cálculo do IPTU.\n2) O município não pode arbitrar previamente a base de cálculo do ITBI com respaldo em valor venal de referência por ele estabelecido unilateralmente.\n3) O valor da transação declarado pelo contribuinte goza da presunção de que é condizente com o valor de mercado, que somente pode ser afastada pelo fisco mediante regular processo administrativo próprio (art. 148 do CTN).',
    explanation: 'O STJ pacificou de forma vinculante que os municípios não podem exigir ITBI sobre valores de "referência" fictícios superiores ao valor real de compra e venda declarado pelas partes, salvo prova em processo administrativo.',
    practicalTips: 'Se a Prefeitura emitir guia de ITBI calculada sobre um "Valor Venal de Referência" superior ao valor da transação, o contribuinte pode apresentar impugnação administrativa fundamentada no Tema 1.113 do STJ ou ajuizar Mandado de Segurança.'
  },
  {
    id: 'sfh-teto-regras',
    title: 'Teto e Diretrizes do Sistema Financeiro da Habitação (SFH)',
    badge: 'Resoluções CMN / Bacen',
    category: 'sfh',
    lawReference: 'Conselho Monetário Nacional - Resolução CMN nº 4.676/2018 e alterações',
    articleCitation: 'O limite máximo de avaliação do imóvel objeto de financiamento habitacional no âmbito do Sistema Financeiro da Habitação (SFH) é de R$ 1.500.000,00 (um milhão e quinhentos mil reais) para todas as unidades da Federação.',
    explanation: 'O SFH conta com taxas de juros reguladas por teto governamental, permite o saque e amortização com saldo do FGTS, e dá direito à redução das custas cartorárias do Art. 290 da Lei 6.015/73.',
    practicalTips: 'Imóveis com valor acima de R$ 1.500.000,00 são enquadrados compulsoriamente no SFI (Sistema Financeiro Imobiliário), onde as taxas são livres e não se aplica o desconto cartorário do Art. 290.'
  },
  {
    id: 'certidoes-validade',
    title: 'Prazo e Validade Legal das Certidões de Matrícula',
    badge: 'Provimento CNJ nº 149/2023',
    category: 'cartorio',
    lawReference: 'Conselho Nacional de Justiça - Provimento CNJ nº 149/2023 (CNN/CN/CNJ-Extra)',
    articleCitation: 'A certidão da matrícula expedida pelo Registro de Imóveis competente, com a certidão de ônus reais e ações reais ou reipersecutórias, tem eficácia probatória plena e prazo legal de validade de 30 (trinta) dias para a lavratura de escrituras e registro de contratos bancários.',
    explanation: 'Bancos e cartórios exigem rigorosamente que a certidão de inteiro teor com negativa de ônus e alienações tenha sido emitida há no máximo 30 dias na data do protocolo ou da emissão contratual.',
    practicalTips: 'Planeje a solicitação da certidão de matrícula em sincronia com a aprovação do laudo de engenharia e análise jurídica para evitar a necessidade de reemissão de novas certidões antes da assinatura.'
  },
  {
    id: 'concentracao-matricula',
    title: 'Princípio da Concentração dos Atos na Matrícula',
    badge: 'Lei Federal 13.097/2015, Art. 54',
    category: 'geral',
    lawReference: 'Lei Federal nº 13.097/2015, Artigo 54',
    articleCitation: 'Não poderão ser opostas situações jurídicas não constantes da matrícula no Registro de Imóveis, inclusive para a decretação de ineficácia de atos constitutivos ou translativos de direitos reais de garantia de terceiros adquirentes de boa-fé.',
    explanation: 'Confere proteção patrimonial ao comprador: qualquer penhora, arresto, ação de execução ou indisponibilidade deve estar prévia e expressamente averbada na matrícula para que possa afetar o adquirente de boa-fé.',
    practicalTips: 'Ainda que o princípio proteja o comprador, certidões negativas em nome dos vendedores (justiça federal, trabalhista, cível e protestos) continuam sendo praxe fundamental nos dossiês de financiamento bancário.'
  }
];

export default function CostsManager({
  processes = [],
  clients = [],
  banks = [],
  properties = []
}: CostsManagerProps) {
  const { setTitle, setActions } = useHeader();
  const { showToast } = useToast();

  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  
  // Input fields
  const [simulationTitle, setSimulationTitle] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [propertyValue, setPropertyValue] = useState<number>(450000);
  const [financingValue, setFinancingValue] = useState<number>(360000);
  const [operationType, setOperationType] = useState<'Financiamento' | 'À Vista'>('Financiamento');
  
  // Location & ITBI
  const [selectedCityPreset, setSelectedCityPreset] = useState<string>('Porto Alegre - RS');
  const [city, setCity] = useState<string>('Porto Alegre');
  const [state, setState] = useState<string>('RS');
  const [itbiRate, setItbiRate] = useState<number>(3.0);
  const [isCustomItbi, setIsCustomItbi] = useState<boolean>(false);
  const [isPoaReducedRateEligible, setIsPoaReducedRateEligible] = useState<boolean>(true);

  // Conditions
  const [isFirstPropertySFH, setIsFirstPropertySFH] = useState<boolean>(true);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // Editable Fee Overrides
  const [customRegistryFee, setCustomRegistryFee] = useState<number | null>(null);
  const [bankFee, setBankFee] = useState<number>(3100);
  const [certificatesFee, setCertificatesFee] = useState<number>(450);
  const [dispatcherFee, setDispatcherFee] = useState<number>(1200);

  // Saved simulations in localStorage
  const [savedSimulations, setSavedSimulations] = useState<CostSimulation[]>(() => {
    try {
      const stored = localStorage.getItem('solutz_cost_simulations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Legislation Modal States
  const [isLegislationModalOpen, setIsLegislationModalOpen] = useState<boolean>(false);
  const [legislationSearch, setLegislationSearch] = useState<string>('');
  const [legislationCategory, setLegislationCategory] = useState<'all' | 'sfh' | 'cartorio' | 'itbi' | 'geral'>('all');
  const [copiedLegislationId, setCopiedLegislationId] = useState<string | null>(null);

  // Filtered Legislation
  const filteredLegislation = useMemo(() => {
    return LEGISLATION_TOPICS.filter((item) => {
      const matchCategory = legislationCategory === 'all' || item.category === legislationCategory;
      const searchLower = legislationSearch.toLowerCase().trim();
      const matchSearch = !searchLower || (
        item.title.toLowerCase().includes(searchLower) ||
        item.badge.toLowerCase().includes(searchLower) ||
        item.lawReference.toLowerCase().includes(searchLower) ||
        item.articleCitation.toLowerCase().includes(searchLower) ||
        item.explanation.toLowerCase().includes(searchLower) ||
        item.practicalTips.toLowerCase().includes(searchLower)
      );
      return matchCategory && matchSearch;
    });
  }, [legislationCategory, legislationSearch]);

  const handleCopyLegislation = (item: LegislationTopic) => {
    const text = [
      `📌 ${item.title}`,
      `⚖️ Fundamento Legal: ${item.lawReference} (${item.badge})`,
      `\n📜 Dispositivo Legal:\n"${item.articleCitation}"`,
      `\n💡 Aplicação Prática no Financiamento/Registro:\n${item.practicalTips}`
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedLegislationId(item.id);
    setTimeout(() => setCopiedLegislationId(null), 2500);
    showToast({
      type: 'success',
      title: 'Fundamentação copiada!',
      description: 'Dispositivo legal e orientação prática copiados para compartilhamento.',
    });
  };

  // Calculate default bank fee when bank is changed
  useEffect(() => {
    if (operationType === 'À Vista') {
      setBankFee(0);
      return;
    }
    if (selectedBankId) {
      const bank = banks.find(b => b.id === selectedBankId);
      const name = bank?.name?.toLowerCase() || '';
      let matched = BANK_FEE_ESTIMATES['default'];
      for (const [key, val] of Object.entries(BANK_FEE_ESTIMATES)) {
        if (name.includes(key)) {
          matched = val;
          break;
        }
      }
      setBankFee(matched);
    } else {
      setBankFee(3100);
    }
  }, [selectedBankId, banks, operationType]);

  // Set Header Title & Header Action with Legislation Icon (standardized with other tabs)
  useEffect(() => {
    setTitle('Custas Imobiliárias');
    setActions(
      <button
        key="btn-header-legislation"
        type="button"
        onClick={() => setIsLegislationModalOpen(prev => !prev)}
        className={cn(
          "p-2 rounded-lg transition-all border shadow-sm cursor-pointer",
          isLegislationModalOpen
            ? "bg-white text-black border-white"
            : "bg-white/10 text-white border-white/10 hover:bg-white/20"
        )}
        title="Legislação"
      >
        <Scale className="w-5 h-5" />
      </button>
    );

    return () => setActions(null);
  }, [setTitle, setActions, isLegislationModalOpen]);

  // Handle Process selection to autofill
  const handleSelectProcess = (procId: string) => {
    setSelectedProcessId(procId);
    if (!procId) return;

    const proc = processes.find(p => p.id === procId);
    if (!proc) return;

    const client = clients.find(c => c.id === proc.clientId);
    const buyerParticipant = proc.participants?.find(p => p.type === 'buyer');
    const name = client?.name || buyerParticipant?.name || 'Cliente';
    setClientName(name);
    setSimulationTitle(`Custas - ${name}`);

    if (proc.purchaseValue || proc.value) {
      setPropertyValue(proc.purchaseValue || proc.value);
    }
    if (proc.financingValue) {
      setFinancingValue(proc.financingValue);
    } else if (proc.purchaseValue) {
      setFinancingValue(Math.round(proc.purchaseValue * 0.8));
    }

    if (proc.type === 'Aquisição à vista com FGTS') {
      setOperationType('À Vista');
    } else {
      setOperationType('Financiamento');
    }

    if (proc.bankId) {
      setSelectedBankId(proc.bankId);
    }

    if (proc.propertyId) {
      const prop = properties.find(p => p.id === proc.propertyId);
      if (prop) {
        if (prop.city) setCity(prop.city);
        if (prop.state) setState(prop.state);
        // Find matching preset
        const matchedCity = COMMON_CITIES.find(
          c => c.name.toLowerCase() === prop.city?.toLowerCase()
        );
        if (matchedCity) {
          setSelectedCityPreset(`${matchedCity.name} - ${matchedCity.state}`);
          setItbiRate(matchedCity.rate);
          setIsCustomItbi(false);
        } else {
          setSelectedCityPreset('custom');
          setIsCustomItbi(true);
        }
      }
    }

    showToast({
      type: 'success',
      title: 'Dados Carregados',
      description: `Processo de ${name} carregado com sucesso.`,
    });
  };

  // City preset change handler
  const handleCityPresetChange = (presetValue: string) => {
    setSelectedCityPreset(presetValue);
    if (presetValue === 'custom') {
      setIsCustomItbi(true);
      return;
    }
    const found = COMMON_CITIES.find(c => `${c.name} - ${c.state}` === presetValue);
    if (found) {
      setCity(found.name);
      setState(found.state);
      setItbiRate(found.rate);
      setIsCustomItbi(false);
    }
  };

  // Registry estimate logic based on Brazilian TJ tables
  const estimatedGrossRegistry = useMemo(() => {
    const val = propertyValue || 0;
    if (val <= 0) return 0;

    // Graduated tiers reflecting average Brazilian registry tariffs
    if (val <= 100000) return 1450;
    if (val <= 200000) return 2150;
    if (val <= 350000) return 3100;
    if (val <= 500000) return 4150;
    if (val <= 750000) return 5400;
    if (val <= 1000000) return 6650;
    if (val <= 1500000) return 8300;
    if (val <= 2500000) return 10800;
    return Math.min(18000, 10800 + (val - 2500000) * 0.0035);
  }, [propertyValue]);

  // Registry value considering 50% discount if 1st property SFH
  const baseRegistryValue = customRegistryFee !== null ? customRegistryFee : estimatedGrossRegistry;
  const registryDiscount = isFirstPropertySFH ? baseRegistryValue * 0.5 : 0;
  const netRegistryValue = isFirstPropertySFH ? baseRegistryValue * 0.5 : baseRegistryValue;

  // ITBI Calculation with Porto Alegre legal parameters (68.000 UFMs @ R$ 6,0411)
  const itbiCalculation = useMemo(() => {
    const isPortoAlegre = city.trim().toLowerCase() === 'porto alegre';
    const isFinancingOperation = operationType === 'Financiamento' && financingValue > 0;
    const canApplyPoaRule = isPortoAlegre && !isCustomItbi && isFinancingOperation && isPoaReducedRateEligible;

    if (canApplyPoaRule) {
      // 0.5% rate applies to the financed amount (including FGTS and consórcios >= 5 years) up to 68,000 UFMs
      const eligibleReducedBase = Math.min(financingValue, POA_REDUCED_CEILING);
      const reducedTax = (eligibleReducedBase * POA_REDUCED_RATE) / 100;

      // 3.0% general rate applies to any financed amount exceeding 68,000 UFMs
      const financedExcessBase = Math.max(0, financingValue - POA_REDUCED_CEILING);
      const financedExcessTax = (financedExcessBase * POA_GENERAL_RATE) / 100;

      // 3.0% general rate applies to own resources / down payment
      const ownResourcesBase = Math.max(0, propertyValue - financingValue);
      const ownResourcesTax = (ownResourcesBase * POA_GENERAL_RATE) / 100;

      const totalItbi = reducedTax + financedExcessTax + ownResourcesTax;
      const flatItbi = (propertyValue * POA_GENERAL_RATE) / 100;
      const itbiEconomy = Math.max(0, flatItbi - totalItbi);
      const effectiveRate = propertyValue > 0 ? (totalItbi / propertyValue) * 100 : POA_GENERAL_RATE;

      return {
        isPoaRule: true,
        eligibleReducedBase,
        reducedTax,
        financedExcessBase,
        financedExcessTax,
        ownResourcesBase,
        ownResourcesTax,
        totalItbi,
        flatItbi,
        itbiEconomy,
        effectiveRate,
        ceilingValue: POA_REDUCED_CEILING,
        ufmValue: POA_UFM_2026,
        ufmLimit: POA_UFM_REDUCED_LIMIT,
      };
    }

    // Standard flat rate
    const rate = itbiRate || 0;
    const totalItbi = (propertyValue * rate) / 100;
    return {
      isPoaRule: false,
      eligibleReducedBase: 0,
      reducedTax: 0,
      financedExcessBase: 0,
      financedExcessTax: 0,
      ownResourcesBase: propertyValue,
      ownResourcesTax: totalItbi,
      totalItbi,
      flatItbi: totalItbi,
      itbiEconomy: 0,
      effectiveRate: rate,
      ceilingValue: POA_REDUCED_CEILING,
      ufmValue: POA_UFM_2026,
      ufmLimit: POA_UFM_REDUCED_LIMIT,
    };
  }, [city, isCustomItbi, operationType, isPoaReducedRateEligible, financingValue, propertyValue, itbiRate]);

  const itbiValue = itbiCalculation.totalItbi;

  // Deed (Escritura Pública) - Free for financing under Lei 4.380/64
  const deedValue = useMemo(() => {
    if (operationType === 'Financiamento') {
      return 0;
    }
    // For À Vista, notary deed is typically around 0.8% of property value
    return Math.min(12000, Math.max(1500, propertyValue * 0.0075));
  }, [operationType, propertyValue]);

  // Total Costs
  const totalCosts = useMemo(() => {
    return itbiValue + netRegistryValue + deedValue + bankFee + certificatesFee + dispatcherFee;
  }, [itbiValue, netRegistryValue, deedValue, bankFee, certificatesFee, dispatcherFee]);

  const costsPercentage = useMemo(() => {
    if (!propertyValue || propertyValue <= 0) return 0;
    return (totalCosts / propertyValue) * 100;
  }, [totalCosts, propertyValue]);

  const downPayment = useMemo(() => {
    return Math.max(0, propertyValue - financingValue);
  }, [propertyValue, financingValue]);

  // Formatters
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Reset form
  const handleReset = () => {
    setSelectedProcessId('');
    setSimulationTitle('');
    setClientName('');
    setPropertyValue(450000);
    setFinancingValue(360000);
    setOperationType('Financiamento');
    setSelectedCityPreset('Porto Alegre - RS');
    setCity('Porto Alegre');
    setState('RS');
    setItbiRate(3.0);
    setIsCustomItbi(false);
    setIsPoaReducedRateEligible(true);
    setIsFirstPropertySFH(true);
    setSelectedBankId('');
    setCustomRegistryFee(null);
    setBankFee(3100);
    setCertificatesFee(450);
    setDispatcherFee(1200);

    showToast({
      type: 'status',
      title: 'Valores Reiniciados',
      description: 'O simulador foi redefinido para os padrões.',
    });
  };

  // Save simulation
  const handleSaveSimulation = () => {
    const newSim: CostSimulation = {
      id: String(Date.now()),
      title: simulationTitle.trim() || `Simulação - ${clientName || formatCurrency(propertyValue)}`,
      clientName: clientName.trim() || undefined,
      processId: selectedProcessId || undefined,
      propertyValue,
      financingValue,
      state,
      city,
      itbiRate: itbiCalculation.isPoaRule ? Number(itbiCalculation.effectiveRate.toFixed(2)) : itbiRate,
      isFirstPropertySFH,
      isPoaReducedRateEligible,
      operationType,
      bankId: selectedBankId || undefined,
      bankFee,
      dispatcherFee,
      certificatesFee,
      itbiValue,
      registryValue: netRegistryValue,
      deedValue,
      totalCosts,
      createdAt: new Date().toISOString()
    };

    const updated = [newSim, ...savedSimulations];
    setSavedSimulations(updated);
    try {
      localStorage.setItem('solutz_cost_simulations', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    showToast({
      type: 'success',
      title: 'Simulação Salva!',
      description: 'A simulação foi registrada no histórico de custas.',
    });
  };

  // Delete saved simulation
  const handleDeleteSaved = (id: string) => {
    const updated = savedSimulations.filter(s => s.id !== id);
    setSavedSimulations(updated);
    try {
      localStorage.setItem('solutz_cost_simulations', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast({
      type: 'status',
      title: 'Simulação Excluída',
      description: 'O registro foi removido com sucesso.',
    });
  };

  // Load saved simulation
  const handleLoadSaved = (sim: CostSimulation) => {
    setPropertyValue(sim.propertyValue);
    setFinancingValue(sim.financingValue);
    setOperationType(sim.operationType);
    setCity(sim.city);
    setState(sim.state);
    setItbiRate(sim.itbiRate);
    setIsFirstPropertySFH(sim.isFirstPropertySFH);
    if (sim.isPoaReducedRateEligible !== undefined) {
      setIsPoaReducedRateEligible(sim.isPoaReducedRateEligible);
    } else {
      setIsPoaReducedRateEligible(true);
    }
    if (sim.bankId) setSelectedBankId(sim.bankId);
    setBankFee(sim.bankFee);
    setCertificatesFee(sim.certificatesFee);
    setDispatcherFee(sim.dispatcherFee);
    setClientName(sim.clientName || '');
    setSimulationTitle(sim.title);
    if (sim.processId) setSelectedProcessId(sim.processId);

    // match city preset
    const preset = COMMON_CITIES.find(c => c.name.toLowerCase() === sim.city.toLowerCase());
    if (preset) {
      setSelectedCityPreset(`${preset.name} - ${preset.state}`);
      setIsCustomItbi(false);
    } else {
      setSelectedCityPreset('custom');
      setIsCustomItbi(true);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast({
      type: 'success',
      title: 'Simulação Carregada',
      description: sim.title,
    });
  };

  // Copy WhatsApp summary text
  const handleCopyWhatsApp = () => {
    const bankName = banks.find(b => b.id === selectedBankId)?.name || (operationType === 'Financiamento' ? 'Financiamento Bancário' : 'Recursos Próprios');
    const totalSavings = (isFirstPropertySFH ? registryDiscount : 0) + itbiCalculation.itbiEconomy;
    
    const itbiTextLines = itbiCalculation.isPoaRule
      ? [
          `• *ITBI (Porto Alegre - Efetivo ${itbiCalculation.effectiveRate.toFixed(2)}%):* ${formatCurrency(itbiValue)}`,
          `  - 0,5% s/ financiado até 68k UFMs (${formatCurrency(itbiCalculation.eligibleReducedBase)}): ${formatCurrency(itbiCalculation.reducedTax)}`,
          itbiCalculation.financedExcessBase > 0 ? `  - 3,0% s/ financiado excedente (${formatCurrency(itbiCalculation.financedExcessBase)}): ${formatCurrency(itbiCalculation.financedExcessTax)}` : null,
          `  - 3,0% s/ recursos próprios (${formatCurrency(itbiCalculation.ownResourcesBase)}): ${formatCurrency(itbiCalculation.ownResourcesTax)}`,
          itbiCalculation.itbiEconomy > 0 ? `  - 💡 _Economia no ITBI de POA (Teto 68.000 UFMs): ${formatCurrency(itbiCalculation.itbiEconomy)}_` : null,
        ].filter(Boolean).join('\n')
      : `• *ITBI (${itbiRate}%):* ${formatCurrency(itbiValue)}`;

    const textLines: (string | null | undefined)[] = [
      `📋 *SIMULAÇÃO DE CUSTAS IMOBILIÁRIAS*`,
      clientName ? `👤 *Cliente:* ${clientName}` : null,
      `🏠 *Valor do Imóvel:* ${formatCurrency(propertyValue)}`,
      operationType === 'Financiamento' ? `💳 *Financiamento:* ${formatCurrency(financingValue)} (Entrada: ${formatCurrency(downPayment)})` : `💵 *Modalidade:* Pagamento à Vista`,
      `🏦 *Banco:* ${bankName}`,
      `📍 *Localização:* ${city} - ${state}${itbiCalculation.isPoaRule ? ` (Regra Especial POA - 68k UFMs)` : ` (ITBI: ${itbiRate}%)`}`,
      '',
      `*DETALHAMENTO ESTIMADO DAS CUSTAS:*`,
      itbiTextLines,
      `• *Cartório de Registro de Imóveis:* ${formatCurrency(netRegistryValue)}${isFirstPropertySFH ? ' _(c/ 50% desc. 1º imóvel SFH)_' : ''}`,
      operationType === 'Financiamento' 
        ? `• *Escritura Pública:* R$ 0,00 _(Isento - Contrato bancário tem força de escritura)_`
        : `• *Escritura Pública:* ${formatCurrency(deedValue)}`,
      operationType === 'Financiamento' && bankFee > 0 ? `• *Avaliação Bancária:* ${formatCurrency(bankFee)}` : null,
      certificatesFee > 0 ? `• *Certidões / Matrícula:* ${formatCurrency(certificatesFee)}` : null,
      dispatcherFee > 0 ? `• *Assessoria / Despachante:* ${formatCurrency(dispatcherFee)}` : null,
      '',
      `💰 *TOTAL ESTIMADO DE CUSTAS:* *${formatCurrency(totalCosts)}* (~${costsPercentage.toFixed(2)}% do imóvel)`,
      totalSavings > 0 ? `🎉 *ECONOMIA TOTAL IDENTIFICADA:* *${formatCurrency(totalSavings)}*` : null,
      itbiCalculation.isPoaRule && itbiCalculation.itbiEconomy > 0 ? `  ↳ Alíquota reduzida de ITBI POA (0,5% até 68k UFMs): ${formatCurrency(itbiCalculation.itbiEconomy)}` : null,
      isFirstPropertySFH && registryDiscount > 0 ? `  ↳ Desconto 50% Registro 1º Imóvel (Lei 6.015/73): ${formatCurrency(registryDiscount)}` : null,
      '',
      `_Estimativa informativa sujeita a variações das tabelas dos cartórios competentes e prefeitura municipal._`
    ];

    const text = textLines
      .filter((line): line is string => line !== null && line !== undefined)
      .join('\n');

    navigator.clipboard.writeText(text);
    showToast({
      type: 'success',
      title: 'Copiado para WhatsApp!',
      description: 'Texto formatado pronto para envio copiado para a área de transferência.',
    });
  };

  // Print summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* CALCULATOR MAIN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Inputs Form (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* Quick Process Auto-Fill Picker */}
            <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-black/5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-black/50 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Carregar de um Processo Existente
                </label>
                {selectedProcessId && (
                  <button 
                    onClick={() => handleSelectProcess('')}
                    className="text-[11px] text-black/40 hover:text-red-600 transition-colors font-medium"
                  >
                    Desvincular
                  </button>
                )}
              </div>
              <select
                value={selectedProcessId}
                onChange={(e) => handleSelectProcess(e.target.value)}
                className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium"
              >
                <option value="">Selecione um processo para preencher automaticamente...</option>
                {processes.map((proc) => {
                  const client = clients.find(c => c.id === proc.clientId);
                  const buyerName = client?.name || proc.participants?.find(p => p.type === 'buyer')?.name || 'Sem nome';
                  const bankName = banks.find(b => b.id === proc.bankId)?.name || 'Sem banco';
                  const val = proc.purchaseValue || proc.value ? formatCurrency(proc.purchaseValue || proc.value) : '';
                  return (
                    <option key={proc.id} value={proc.id}>
                      {buyerName} - {bankName} {val ? `(${val})` : ''} - {proc.stage}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Main Form Fields */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-black/5 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-black/50 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-black/50" />
                  Dados da Transação Imobiliária
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 text-black/40 hover:text-black hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                  title="Redefinir"
                  aria-label="Redefinir"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Client Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">
                    Nome do Cliente / Comprador
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">
                    Modalidade da Operação
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOperationType('Financiamento')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                        operationType === 'Financiamento'
                          ? "bg-black text-white border-black"
                          : "bg-[#fbfbfa] text-black/60 border-black/10 hover:border-black/20"
                      )}
                    >
                      Financiamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperationType('À Vista')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                        operationType === 'À Vista'
                          ? "bg-black text-white border-black"
                          : "bg-[#fbfbfa] text-black/60 border-black/10 hover:border-black/20"
                      )}
                    >
                      À Vista / FGTS
                    </button>
                  </div>
                </div>
              </div>

              {/* Property & Financing Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">
                    Valor de Compra e Venda / Avaliação (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-black/40">R$</span>
                    <input
                      type="number"
                      step="5000"
                      min="0"
                      value={propertyValue || ''}
                      onChange={(e) => setPropertyValue(Number(e.target.value) || 0)}
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-black/40 mt-1 block">
                    Base para cálculo do ITBI e emolumentos de registro
                  </span>
                </div>

                {operationType === 'Financiamento' ? (
                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">
                      Valor Financiado (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-black/40">R$</span>
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={financingValue || ''}
                        onChange={(e) => setFinancingValue(Number(e.target.value) || 0)}
                        className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                      />
                    </div>
                    <span className="text-[11px] text-black/40 mt-1 block">
                      Entrada estimada: <strong className="text-black/70">{formatCurrency(downPayment)}</strong>
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">
                      Recursos Próprios / FGTS (R$)
                    </label>
                    <div className="bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-black/60">
                      100% à vista ({formatCurrency(propertyValue)})
                    </div>
                    <span className="text-[11px] text-black/40 mt-1 block">
                      Requer escritura pública lavrada em Tabelionato de Notas
                    </span>
                  </div>
                )}
              </div>

              {/* Location & ITBI */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">
                    Cidade / Município do Imóvel (Alíquota de ITBI)
                  </label>
                  <select
                    value={selectedCityPreset}
                    onChange={(e) => handleCityPresetChange(e.target.value)}
                    className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium"
                  >
                    {COMMON_CITIES.map((c) => (
                      <option key={`${c.name}-${c.state}`} value={`${c.name} - ${c.state}`}>
                        {c.name} - {c.state} (Geral 3,0% / Financiado 0,5% até 68k UFMs)
                      </option>
                    ))}
                    <option value="custom">Outra Cidade / Definir Alíquota Manual...</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-black/70 mb-1.5">
                    Alíquota Geral ITBI (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={itbiRate}
                      onChange={(e) => {
                        setItbiRate(Number(e.target.value) || 0);
                        setIsCustomItbi(true);
                        setSelectedCityPreset('custom');
                      }}
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl pl-3.5 pr-8 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                    />
                    <Percent className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-black/40" />
                  </div>
                </div>
              </div>

              {isCustomItbi && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">Nome do Município</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Porto Alegre"
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">UF (Estado)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      placeholder="RS"
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2 text-sm uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Porto Alegre Special ITBI Incentive Rule */}
              {city.toLowerCase() === 'porto alegre' && !isCustomItbi && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 transition-all space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPoaReducedRateEligible && operationType === 'Financiamento'}
                        disabled={operationType !== 'Financiamento'}
                        onChange={(e) => setIsPoaReducedRateEligible(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-emerald-700 border-emerald-600/30 focus:ring-emerald-600 cursor-pointer disabled:opacity-50"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-emerald-950">
                            Regra Especial Porto Alegre (Alíquota de 0,5% até 68.000 UFMs)
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/50">
                            UFM 2026: R$ 6,0411
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900/80 leading-relaxed">
                          Alíquota reduzida de <strong>0,5%</strong> para os valores efetivamente financiados em contratos de financiamento imobiliário residencial (ou consórcios) com prazo mínimo de 5 anos e/ou recursos do FGTS, limitada a <strong>68.000 UFMs ({formatCurrency(POA_REDUCED_CEILING)})</strong>. Alíquota geral de <strong>3,0%</strong> sobre o excedente e recursos próprios.
                        </p>
                      </div>
                    </label>
                  </div>

                  {operationType === 'Financiamento' && isPoaReducedRateEligible && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-500/15">
                      <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-500/10 space-y-0.5">
                        <span className="text-[10px] text-black/50 block font-medium">Financiado c/ 0,5% (até 68k UFMs)</span>
                        <strong className="text-emerald-950 text-xs font-bold block">
                          {formatCurrency(itbiCalculation.eligibleReducedBase)}
                        </strong>
                        <span className="text-[10px] text-emerald-700 block font-semibold">
                          Imposto: {formatCurrency(itbiCalculation.reducedTax)}
                        </span>
                      </div>

                      <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-500/10 space-y-0.5">
                        <span className="text-[10px] text-black/50 block font-medium">Recursos Próprios / Entrada (3,0%)</span>
                        <strong className="text-[#1a1a1a] text-xs font-bold block">
                          {formatCurrency(itbiCalculation.ownResourcesBase)}
                        </strong>
                        <span className="text-[10px] text-black/60 block">
                          Imposto: {formatCurrency(itbiCalculation.ownResourcesTax)}
                        </span>
                      </div>

                      <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-500/10 space-y-0.5">
                        <span className="text-[10px] text-black/50 block font-medium">
                          {itbiCalculation.financedExcessBase > 0 ? 'Excedente Financiado (3,0%)' : 'Alíquota Efetiva'}
                        </span>
                        {itbiCalculation.financedExcessBase > 0 ? (
                          <>
                            <strong className="text-black/80 text-xs font-bold block">
                              {formatCurrency(itbiCalculation.financedExcessBase)}
                            </strong>
                            <span className="text-[10px] text-black/60 block">
                              Imposto: {formatCurrency(itbiCalculation.financedExcessTax)}
                            </span>
                          </>
                        ) : (
                          <>
                            <strong className="text-emerald-800 text-xs font-bold block">
                              {itbiCalculation.effectiveRate.toFixed(2)}%
                            </strong>
                            <span className="text-[10px] text-emerald-700 block font-semibold">
                              Regra reduzida ativa
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {operationType === 'Financiamento' && isPoaReducedRateEligible && itbiCalculation.itbiEconomy > 0 && (
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        Economia tributária de <strong>{formatCurrency(itbiCalculation.itbiEconomy)}</strong> comparada à alíquota padrão de 3,0%!
                      </span>
                    </div>
                  )}

                  {operationType !== 'Financiamento' && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2.5 border border-amber-200">
                      ℹ️ A alíquota reduzida de 0,5% de Porto Alegre aplica-se a contratos de financiamento residencial / consórcios (prazo ≥ 5 anos) ou FGTS. Para aquisições 100% com recursos próprios à vista, incide a alíquota geral de 3,0%.
                    </p>
                  )}
                </div>
              )}

              {/* Legal Discount Highlight: 1º Imóvel SFH */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 transition-all hover:border-amber-500/30">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFirstPropertySFH}
                    onChange={(e) => setIsFirstPropertySFH(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-black border-black/20 focus:ring-black cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1a1a1a]">
                        Primeiro Imóvel Residencial (Desconto de 50% no Registro)
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Art. 290 Lei 6.015/73
                      </span>
                    </div>
                    <p className="text-xs text-black/60 leading-relaxed">
                      A Lei de Registros Públicos garante 50% de desconto nos emolumentos cartorários para a primeira aquisição residencial financiada pelo SFH.
                    </p>
                  </div>
                </label>
              </div>

              {/* Bank & Additional Fees Section */}
              <div className="border-t border-black/5 pt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black/50 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-black/40" />
                  Taxas Bancárias e Despachante
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {operationType === 'Financiamento' && (
                    <div>
                      <label className="block text-xs font-semibold text-black/70 mb-1.5">
                        Banco Financiador
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium"
                      >
                        <option value="">Selecione o banco (ou padrão geral)...</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {operationType === 'Financiamento' && (
                    <div>
                      <label className="block text-xs font-semibold text-black/70 mb-1.5">
                        Tarifa de Avaliação / Contrato (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={bankFee}
                        onChange={(e) => setBankFee(Number(e.target.value) || 0)}
                        className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">
                      Certidões de Praxe e Matrícula (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={certificatesFee}
                      onChange={(e) => setCertificatesFee(Number(e.target.value) || 0)}
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-black/70 mb-1.5">
                      Assessoria de Despachante (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={dispatcherFee}
                      onChange={(e) => setDispatcherFee(Number(e.target.value) || 0)}
                      className="w-full bg-[#fbfbfa] border border-black/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Calculation Summary & Results Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Statement Box */}
            <div className="bg-[#1a1a1a] text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-white/50 block">Estimativa Geral</span>
                  <h3 className="text-base font-bold text-white">Total das Custas</h3>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <span className="text-xs font-bold text-emerald-400">
                    ~{costsPercentage.toFixed(2)}% do imóvel
                  </span>
                </div>
              </div>

              {/* Big Total Price */}
              <div>
                <p className="text-xs text-white/60 mb-1 font-medium">Investimento total estimado em taxas</p>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {formatCurrency(totalCosts)}
                </div>
                {/* Savings highlights */}
                {(itbiCalculation.itbiEconomy > 0 || (isFirstPropertySFH && registryDiscount > 0)) && (
                  <div className="mt-2.5 flex flex-col gap-1 text-xs text-amber-300 font-semibold bg-white/5 p-2 rounded-xl border border-white/10">
                    {itbiCalculation.itbiEconomy > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Economia ITBI (0,5% POA): {formatCurrency(itbiCalculation.itbiEconomy)}</span>
                      </div>
                    )}
                    {isFirstPropertySFH && registryDiscount > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Economia Cartório (Lei 6.015/73): {formatCurrency(registryDiscount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Breakdown List */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                {/* 1. ITBI */}
                <div className="flex items-start justify-between text-sm py-1 border-b border-white/5 gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white/80 font-medium">ITBI</span>
                      {itbiCalculation.isPoaRule ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded">
                          Efetivo {itbiCalculation.effectiveRate.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-white/60 text-xs">({itbiRate.toFixed(1)}%)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/40 block">
                      {itbiCalculation.isPoaRule
                        ? `Porto Alegre • 0,5% financiado (até 68k UFMs) + 3% geral`
                        : `${city} - ${state}`}
                    </span>
                    {itbiCalculation.isPoaRule && (
                      <div className="text-[10px] text-white/50 space-y-0.5 pt-1">
                        <div>• 0,5% s/ {formatCurrency(itbiCalculation.eligibleReducedBase)} = {formatCurrency(itbiCalculation.reducedTax)}</div>
                        {itbiCalculation.financedExcessBase > 0 && (
                          <div>• 3,0% s/ excedente ({formatCurrency(itbiCalculation.financedExcessBase)}) = {formatCurrency(itbiCalculation.financedExcessTax)}</div>
                        )}
                        <div>• 3,0% s/ entrada ({formatCurrency(itbiCalculation.ownResourcesBase)}) = {formatCurrency(itbiCalculation.ownResourcesTax)}</div>
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-white shrink-0">{formatCurrency(itbiValue)}</span>
                </div>

                {/* 2. Registro de Imóveis */}
                <div className="flex items-center justify-between text-sm py-1 border-b border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-white/80 font-medium block">Cartório de Registro (RGI)</span>
                    {isFirstPropertySFH ? (
                      <span className="text-[11px] text-amber-300 block font-medium">
                        50% desc. SFH (de {formatCurrency(baseRegistryValue)})
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/40 block">Emolumentos estaduais</span>
                    )}
                  </div>
                  <span className="font-bold text-white">{formatCurrency(netRegistryValue)}</span>
                </div>

                {/* 3. Escritura Pública */}
                <div className="flex items-center justify-between text-sm py-1 border-b border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-white/80 font-medium block">Escritura Pública</span>
                    <span className="text-[11px] text-white/40 block">
                      {operationType === 'Financiamento' ? 'Isento (Lei 4.380/64)' : 'Tabelionato de Notas'}
                    </span>
                  </div>
                  <span className={cn(
                    "font-bold",
                    operationType === 'Financiamento' ? "text-emerald-400" : "text-white"
                  )}>
                    {operationType === 'Financiamento' ? 'R$ 0,00' : formatCurrency(deedValue)}
                  </span>
                </div>

                {/* 4. Tarifa Bancária */}
                {operationType === 'Financiamento' && bankFee > 0 && (
                  <div className="flex items-center justify-between text-sm py-1 border-b border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-white/80 font-medium block">Tarifa de Avaliação Bancária</span>
                      <span className="text-[11px] text-white/40 block">Engenharia e vistoria</span>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(bankFee)}</span>
                  </div>
                )}

                {/* 5. Certidões & Despachante */}
                {(certificatesFee > 0 || dispatcherFee > 0) && (
                  <div className="flex items-center justify-between text-sm py-1">
                    <div className="space-y-0.5">
                      <span className="text-white/80 font-medium block">Certidões & Despachante</span>
                      <span className="text-[11px] text-white/40 block">
                        Certidões ({formatCurrency(certificatesFee)}) + Assessoria ({formatCurrency(dispatcherFee)})
                      </span>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(certificatesFee + dispatcherFee)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Copiar Resumo para WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* SAVED SIMULATIONS SECTION (Rendered if there are saved calculations) */}
      {savedSimulations.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1a1a1a]">Simulações Gravadas ({savedSimulations.length})</h2>
              <p className="text-xs text-black/50">Histórico de estimativas de custas calculadas para clientes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {savedSimulations.map((sim) => (
              <div 
                key={sim.id}
                className="bg-[#fbfbfa] border border-black/5 rounded-2xl p-4.5 space-y-3 hover:border-black/15 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#1a1a1a]">{sim.title}</h3>
                    <p className="text-xs text-black/50">
                      {sim.city} - {sim.state} • {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-[#1a1a1a]">
                    {formatCurrency(sim.totalCosts)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-black/5 text-black/70">
                  <div>
                    <span className="text-[10px] text-black/40 block">Valor do Imóvel</span>
                    <strong className="font-semibold">{formatCurrency(sim.propertyValue)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/40 block">Financiamento</span>
                    <strong className="font-semibold">{formatCurrency(sim.financingValue)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/40 block">ITBI</span>
                    <span>{formatCurrency(sim.itbiValue)} ({sim.itbiRate}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/40 block">Registro Cartório</span>
                    <span>{formatCurrency(sim.registryValue)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(sim)}
                    className="text-xs font-bold text-black hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Recarregar no Simulador →
                  </button>
                  <button
                    type="button"
                    onClick={() => sim.id && handleDeleteSaved(sim.id)}
                    className="text-black/30 hover:text-red-600 transition-colors p-1 cursor-pointer"
                    title="Excluir simulação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEGISLATION MODAL */}
      {isLegislationModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl border border-black/10 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="legislation-modal-title"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-black/5 flex items-start justify-between gap-4 bg-[#fbfbfa]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 text-amber-800 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
                  <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="legislation-modal-title" className="text-base sm:text-lg font-bold text-[#1a1a1a]">
                      Legislação & Normas das Custas
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                      Jurídico
                    </span>
                  </div>
                  <p className="text-xs text-black/60">
                    Artigos de lei, precedentes vinculantes do STJ e diretrizes para emolumentos cartorários e ITBI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLegislationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black/60 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-black/5 bg-white space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={legislationSearch}
                  onChange={(e) => setLegislationSearch(e.target.value)}
                  placeholder="Buscar por artigo (ex: 290), lei (6.015), STJ, SFH, escritura..."
                  className="w-full pl-10 pr-4 py-2 bg-[#fbfbfa] border border-black/10 rounded-xl text-xs sm:text-sm text-[#1a1a1a] focus:outline-hidden focus:ring-2 focus:ring-black/10 transition-all placeholder:text-black/40"
                />
                {legislationSearch && (
                  <button
                    onClick={() => setLegislationSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-xs font-semibold cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Todos os Artigos' },
                  { id: 'sfh', label: 'Desconto 50% & SFH' },
                  { id: 'cartorio', label: 'Cartório & Escritura' },
                  { id: 'itbi', label: 'ITBI & STJ' },
                  { id: 'geral', label: 'Segurança Jurídica' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLegislationCategory(cat.id as any)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                      legislationCategory === cat.id
                        ? "bg-black text-white shadow-xs"
                        : "bg-[#f5f5f0] text-black/60 hover:bg-black/5 hover:text-black"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body: Cards */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {filteredLegislation.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm font-semibold text-black/60">Nenhum dispositivo legal encontrado</p>
                  <p className="text-xs text-black/40">Tente buscar por outros termos ou redefina o filtro de categoria.</p>
                </div>
              ) : (
                filteredLegislation.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#fbfbfa] border border-black/5 rounded-2xl p-4 sm:p-5 space-y-3.5 hover:border-black/15 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 bg-amber-500/10 text-amber-900 rounded-md border border-amber-500/20">
                            {item.badge}
                          </span>
                          <span className="text-xs text-black/40 font-medium">
                            {item.lawReference}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[#1a1a1a]">
                          {item.title}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyLegislation(item)}
                        className={cn(
                          "self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                          copiedLegislationId === item.id
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-white text-black/70 hover:text-black hover:bg-black/5 border border-black/10"
                        )}
                        title="Copiar texto da lei e fundamentação"
                      >
                        {copiedLegislationId === item.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-black/50" />
                            <span>Copiar Fundamentação</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Article Quote */}
                    <div className="bg-white border-l-4 border-amber-500/70 p-3 sm:p-3.5 rounded-r-xl border border-black/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 block">
                        Texto da Norma / Artigo
                      </span>
                      <p className="text-xs text-black/80 font-serif italic leading-relaxed whitespace-pre-line">
                        "{item.articleCitation}"
                      </p>
                    </div>

                    {/* Explanation and Practical Guidance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-black/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/50 block">
                          Entendimento Jurídico
                        </span>
                        <p className="text-black/70 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/50 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          Aplicação Prática no Processo
                        </span>
                        <p className="text-emerald-950/80 leading-relaxed">
                          {item.practicalTips}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-black/5 bg-[#fbfbfa] flex items-center justify-between gap-3 shrink-0 text-xs">
              <span className="text-black/50 hidden sm:inline">
                Normas federais aplicáveis a todo o território nacional.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-black/10 bg-white text-black/70 hover:text-black font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setIsLegislationModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-black text-white hover:bg-black/90 font-bold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
