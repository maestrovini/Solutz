import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { Client, Process, Agency, Broker, Bank, Participant, Property } from '../types';
import { resolveParticipantName } from '../utils/participantUtils';
import { Users, Building2, User, ChevronDown, ChevronUp, Trophy, TrendingUp, Award, BarChart3, Star, Layers, Landmark, Cake, CalendarDays, AlertCircle, Bell, CheckCircle2, DollarSign, Activity, MapPin, Flame, Search, SlidersHorizontal, Map, Percent, Home, ZoomIn, ZoomOut, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { capitalizeName } from '../utils/stringUtils';

const POA_NEIGHBORHOODS_COORDS: Record<string, { x: number; y: number; zone: 'Norte' | 'Central' | 'Sul' | 'Leste' }> = {
  'Moinhos de Vento': { x: 42, y: 38, zone: 'Central' },
  'Bela Vista': { x: 55, y: 44, zone: 'Central' },
  'Centro Histórico': { x: 18, y: 44, zone: 'Central' },
  'Bom Fim': { x: 34, y: 46, zone: 'Central' },
  'Petrópolis': { x: 74, y: 48, zone: 'Leste' },
  'Menino Deus': { x: 26, y: 64, zone: 'Sul' },
  'Tristeza': { x: 22, y: 84, zone: 'Sul' },
  'Higienópolis': { x: 48, y: 26, zone: 'Norte' },
  'Passo d\'Areia': { x: 68, y: 24, zone: 'Norte' },
  'Jardim Botânico': { x: 54, y: 58, zone: 'Leste' },
  'Partenon': { x: 68, y: 68, zone: 'Leste' },
  'Chácara das Pedras': { x: 78, y: 38, zone: 'Leste' },
  'Ipanema': { x: 28, y: 92, zone: 'Sul' },
  'Floresta': { x: 30, y: 32, zone: 'Norte' },
  'Sarandi': { x: 86, y: 15, zone: 'Norte' }
};

const SAMPLE_POA_PROPERTIES: Omit<Property, 'createdAt' | 'updatedAt'>[] = [
  { id: 'sample-1', address: 'Av. Goethe, 210', neighborhood: 'Moinhos de Vento', city: 'Porto Alegre', state: 'RS', price: 1250000, type: 'Apartamento' },
  { id: 'sample-2', address: 'Rua Bela Vista, 45', neighborhood: 'Bela Vista', city: 'Porto Alegre', state: 'RS', price: 2100000, type: 'Apartamento' },
  { id: 'sample-3', address: 'Av. Mostardeiro, 800', neighborhood: 'Moinhos de Vento', city: 'Porto Alegre', state: 'RS', price: 980000, type: 'Apartamento' },
  { id: 'sample-4', address: 'Av. Osvaldo Aranha, 520', neighborhood: 'Bom Fim', city: 'Porto Alegre', state: 'RS', price: 720000, type: 'Apartamento' },
  { id: 'sample-5', address: 'Rua Felipe de Oliveira, 120', neighborhood: 'Petrópolis', city: 'Porto Alegre', state: 'RS', price: 950000, type: 'Apartamento' },
  { id: 'sample-6', address: 'Rua Getúlio Vargas, 1400', neighborhood: 'Menino Deus', city: 'Porto Alegre', state: 'RS', price: 850000, type: 'Apartamento' },
  { id: 'sample-7', address: 'Av. Wenceslau Escobar, 1850', neighborhood: 'Tristeza', city: 'Porto Alegre', state: 'RS', price: 1450000, type: 'Casa' },
  { id: 'sample-8', address: 'Rua Dr. Timóteo, 340', neighborhood: 'Floresta', city: 'Porto Alegre', state: 'RS', price: 620000, type: 'Apartamento' },
  { id: 'sample-9', address: 'Rua Plínio Brasil Milano, 720', neighborhood: 'Higienópolis', city: 'Porto Alegre', state: 'RS', price: 1100000, type: 'Apartamento' },
  { id: 'sample-10', address: 'Rua Felizardo, 301', neighborhood: 'Jardim Botânico', city: 'Porto Alegre', state: 'RS', price: 680000, type: 'Apartamento' },
  { id: 'sample-11', address: 'Av. João Pessoa, 1100', neighborhood: 'Centro Histórico', city: 'Porto Alegre', state: 'RS', price: 420000, type: 'Apartamento' },
  { id: 'sample-12', address: 'Av. Neusa Goulart Brizola, 15', neighborhood: 'Petrópolis', city: 'Porto Alegre', state: 'RS', price: 1350000, type: 'Apartamento' },
  { id: 'sample-13', address: 'Rua Carlos Trein Filho, 800', neighborhood: 'Bela Vista', city: 'Porto Alegre', state: 'RS', price: 1800000, type: 'Apartamento' },
  { id: 'sample-14', address: 'Rua Silveiro, 450', neighborhood: 'Menino Deus', city: 'Porto Alegre', state: 'RS', price: 790000, type: 'Apartamento' },
  { id: 'sample-15', address: 'Av. Guaíba, 2300', neighborhood: 'Ipanema', city: 'Porto Alegre', state: 'RS', price: 2300000, type: 'Casa' }
];

const normalizeWord = (text: string) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const matchNeighborhood = (name?: string): string | null => {
  if (!name) return null;
  const normalizedMatch = normalizeWord(name);
  for (const staticName of Object.keys(POA_NEIGHBORHOODS_COORDS)) {
    const normalizedStatic = normalizeWord(staticName);
    if (
      normalizedMatch === normalizedStatic || 
      normalizedMatch.includes(normalizedStatic) || 
      normalizedStatic.includes(normalizedMatch)
    ) {
      return staticName;
    }
  }
  return null;
};

const getCityNeighborhoodCoords = (cityName: string, neighborhoodsList: string[]) => {
  const isPoa = cityName.toLowerCase().includes('porto alegre') || cityName.toLowerCase() === 'poa';
  if (isPoa) {
    return POA_NEIGHBORHOODS_COORDS;
  }
  
  const coordsMap: Record<string, { x: number; y: number; zone: 'Norte' | 'Central' | 'Sul' | 'Leste' }> = {};
  const uniqueNames = Array.from(new Set(neighborhoodsList.filter(Boolean))).sort();
  const total = uniqueNames.length;
  
  uniqueNames.forEach((name, index) => {
    const angle = (index / Math.max(1, total)) * 2 * Math.PI;
    const radius = 22 + (index % 3) * 8; 
    const x = Math.round(50 + Math.cos(angle) * radius);
    const y = Math.round(50 + Math.sin(angle) * radius * 0.82);
    
    const zones: ('Norte' | 'Central' | 'Sul' | 'Leste')[] = ['Central', 'Norte', 'Leste', 'Sul'];
    const zone = zones[index % zones.length];
    
    coordsMap[name] = { x, y, zone };
  });
  
  return coordsMap;
};

const matchNeighborhoodDynamic = (name: string | undefined, coordsMap: Record<string, any>): string | null => {
  if (!name) return null;
  const normalizedMatch = normalizeWord(name);
  for (const staticName of Object.keys(coordsMap)) {
    const normalizedStatic = normalizeWord(staticName);
    if (
      normalizedMatch === normalizedStatic || 
      normalizedMatch.includes(normalizedStatic) || 
      normalizedStatic.includes(normalizedMatch)
    ) {
      return staticName;
    }
  }
  return null;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
};

const formatCompactCurrency = (val: number) => {
  if (val <= 0) return '';
  if (val >= 1000000) {
    return 'R$ ' + (val / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M';
  }
  if (val >= 1000) {
    return 'R$ ' + (val / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + 'k';
  }
  return 'R$ ' + val.toLocaleString('pt-BR');
};

const getYearMonth = (dateStr?: string): { year: number; month: number } | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1
    };
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth()
      };
    }
  } catch (e) {}
  return null;
};

interface DashboardProps {
  onOpenProcess?: (id: string) => void;
  onOpenClient?: (id: string | null, isEdit?: boolean, isSimulation?: boolean) => void;
}

export default function Dashboard({ onOpenProcess, onOpenClient }: DashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [poaSearchTerm, setPoaSearchTerm] = useState('');
  const [poaSelectedBairro, setPoaSelectedBairro] = useState<string | null>(null);
  const [poaSortBy, setPoaSortBy] = useState<'count' | 'volume' | 'avgPrice'>('count');
  const [selectedCity, setSelectedCity] = useState<string>('Porto Alegre');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const availableCities = useMemo(() => {
    const citiesMap: Record<string, string> = {}; // lowercase -> Capitalized
    properties.forEach(p => {
      if (p.city) {
        const trimmed = p.city.trim();
        if (trimmed) {
          citiesMap[trimmed.toLowerCase()] = capitalizeName(trimmed);
        }
      }
    });
    // Make sure Porto Alegre is always in the available list so there's always at least one
    if (!citiesMap['porto alegre'] && !citiesMap['poa']) {
      citiesMap['porto alegre'] = 'Porto Alegre';
    }
    return Object.values(citiesMap).sort((a, b) => a.localeCompare(b));
  }, [properties]);
  const [loading, setLoading] = useState(true);
  const [concludeConfirm, setConcludeConfirm] = useState<{ processId: string, notificationId: string } | null>(null);
  const [chartTab, setChartTab] = useState<'volume' | 'count'>('volume');
  const [performancePeriod, setPerformancePeriod] = useState<'6m' | '1y' | 'all'>('6m');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { setTitle, setActions } = useHeader();
  const { user } = useAuth();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [pointerStart, setPointerStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPointerDown(true);
    setPointerStart({ x: e.clientX, y: e.clientY });
    setPanStart(pan);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown) return;
    
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    
    const maxPanX = Math.max(0, 220 * (zoom - 1));
    const maxPanY = Math.max(0, 220 * (zoom - 1));
    
    let nextX = panStart.x + dx;
    let nextY = panStart.y + dy;
    
    nextX = Math.max(-maxPanX, Math.min(maxPanX, nextX));
    nextY = Math.max(-maxPanY, Math.min(maxPanY, nextY));
    
    setPan({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPointerDown) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsPointerDown(false);
    }
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = 0.15;
      
      setZoom(prevZoom => {
        let nextZoom = prevZoom + (delta > 0 ? zoomFactor : -zoomFactor);
        nextZoom = Math.max(1, Math.min(4, nextZoom));
        
        setPan(prevPan => {
          if (nextZoom === 1) {
            return { x: 0, y: 0 };
          }
          const maxPanX = Math.max(0, 220 * (nextZoom - 1));
          const maxPanY = Math.max(0, 220 * (nextZoom - 1));
          return {
            x: Math.max(-maxPanX, Math.min(maxPanX, prevPan.x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, prevPan.y))
          };
        });
        
        return nextZoom;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  const monthsNames = useMemo(() => ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'], []);

  const kpis = useMemo(() => {
    const activeStages = ['Vistoria', 'Documentos', 'Conformidade', 'Recursos', 'Contrato', 'ITBI', 'Registro'];
    const active = processes.filter(p => activeStages.includes(p.stage) && p.status !== 'Cancelado');
    const finalized = processes.filter(p => p.stage === 'Finalizado');
    
    // Volume total concedido (finalizados)
    const volumeConcedido = finalized.reduce((sum, p) => sum + (p.financingValue || p.value || 0), 0);
    
    // Qtd de processos pra tirar média
    const processesWithVal = processes.filter(p => (p.financingValue || p.value || 0) > 0);
    const avgLoanVal = processesWithVal.length > 0
      ? processesWithVal.reduce((sum, p) => sum + (p.financingValue || p.value || 0), 0) / processesWithVal.length
      : 0;

    return {
      activeCount: active.length,
      volumeConcedido,
      avgLoanVal
    };
  }, [processes]);

  const chartData = useMemo(() => {
    const dataMap: Record<string, { 
      monthKey: string; 
      monthLabel: string; 
      sbpeFinalizedCount: number; 
      fgtsFinalizedCount: number; 
      totalFinalizedCount: number; 
      sbpeFinalizedVolume: number; 
      fgtsFinalizedVolume: number; 
      totalFinalizedVolume: number; 
    }> = {};
    
    // Timeline of specified period
    let numMonths = 6;
    if (performancePeriod === '1y') {
      numMonths = 12;
    } else if (performancePeriod === 'all') {
      let oldestDate = new Date();
      processes.forEach(p => {
        const datesToCheck = [p.updatedAt];
        if (Array.isArray(p.stageHistory)) {
          p.stageHistory.forEach(h => {
            if (h.date) datesToCheck.push(h.date);
          });
        }
        datesToCheck.forEach(dStr => {
          if (dStr) {
            const d = new Date(dStr);
            if (!isNaN(d.getTime()) && d < oldestDate) {
              oldestDate = d;
            }
          }
        });
      });
      // Calculate months between oldestDate and now
      const currentDate = new Date();
      const diffYears = currentDate.getFullYear() - oldestDate.getFullYear();
      const diffMonths = currentDate.getMonth() - oldestDate.getMonth();
      const totalMonths = diffYears * 12 + diffMonths + 1;
      numMonths = Math.max(6, totalMonths);
    }

    const currentDate = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthsNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      dataMap[key] = {
        monthKey: key,
        monthLabel: label,
        sbpeFinalizedCount: 0,
        fgtsFinalizedCount: 0,
        totalFinalizedCount: 0,
        sbpeFinalizedVolume: 0,
        fgtsFinalizedVolume: 0,
        totalFinalizedVolume: 0
      };
    }

    // Populate data based on process stage/history dates
    processes.forEach(p => {
      // We only consider finalized processes
      if (p.stage !== 'Finalizado') return;

      // Find the finalized reference date
      const finishedHistory = Array.isArray(p.stageHistory) ? p.stageHistory.find(h => h.stage === 'Finalizado') : null;
      const refDate = finishedHistory?.date || p.updatedAt;
      
      const dateObj = getYearMonth(refDate);
      if (!dateObj) return;
      
      const key = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}`;
      const val = p.financingValue || p.value || 0;

      const isSbpe = p.financingType === 'SBPE';
      const isFgts = p.financingType === 'MCMV' || p.financingType === 'Pró-Cotista' || p.type === 'Aquisição à vista com FGTS';

      if (dataMap[key]) {
        if (isSbpe) {
          dataMap[key].sbpeFinalizedCount += 1;
          dataMap[key].sbpeFinalizedVolume += val;
        }
        if (isFgts) {
          dataMap[key].fgtsFinalizedCount += 1;
          dataMap[key].fgtsFinalizedVolume += val;
        }
        // Accumulate total initialized as sum of both categories
        dataMap[key].totalFinalizedCount += 1;
        dataMap[key].totalFinalizedVolume += val;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [processes, monthsNames, performancePeriod]);

  const maxChartVal = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    const vals = chartData.map(d => {
      if (chartTab === 'volume') {
        return Math.max(
          d.totalFinalizedVolume || 0,
          d.sbpeFinalizedVolume || 0,
          d.fgtsFinalizedVolume || 0
        );
      } else {
        return Math.max(
          d.totalFinalizedCount || 0,
          d.sbpeFinalizedCount || 0,
          d.fgtsFinalizedCount || 0
        );
      }
    });
    const computedMax = Math.max(...vals);
    return computedMax > 0 ? computedMax : 1;
  }, [chartData, chartTab]);

  useEffect(() => {
    const userName = user?.displayName || user?.username || 'Usuário';
    setTitle(`${userName}, bem vindo a Solutz!`);
    setActions(null);
  }, [user]);

  useEffect(() => {
    const unsubClients = api.subscribeToCollection('clients', (data) => {
      setClients(data as Client[]);
    });
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubBanks = api.subscribeToCollection('banks', (data) => {
      setBanks(data as Bank[]);
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => {
      setBrokers(data as Broker[]);
    });
    const unsubProperties = api.subscribeToCollection('properties', (data) => {
      const props = data as Property[];
      setProperties(props);
      if (loading) setLoading(false);
    });

    return () => {
      unsubClients();
      unsubProcesses();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
      unsubProperties();
    };
  }, [loading]);

  // 1. Filter out only selected city properties
  const realPropertiesInPoa = useMemo(() => {
    return properties.filter(p => {
      if (!p.city) return false;
      const selectedLower = selectedCity.toLowerCase();
      const pCityLower = p.city.toLowerCase();
      if (selectedLower.includes('porto alegre') || selectedLower === 'poa') {
        return pCityLower.includes('porto alegre') || pCityLower === 'poa';
      }
      return pCityLower === selectedLower || pCityLower.includes(selectedLower) || selectedLower.includes(pCityLower);
    });
  }, [properties, selectedCity]);

  // 2. Generate aggregated data for all selected city neighborhoods
  const poaNeighborhoodData = useMemo(() => {
    const statsMap: Record<string, {
      name: string;
      count: number;
      realCount: number;
      totalPrice: number;
      avgPrice: number;
      zone: 'Norte' | 'Central' | 'Sul' | 'Leste' | 'Outros';
      x?: number;
      y?: number;
    }> = {};

    // Get coordinates setup for selected city
    const matchedCoords = getCityNeighborhoodCoords(
      selectedCity,
      Array.from(new Set(realPropertiesInPoa.map(p => p.neighborhood).filter(Boolean))) as string[]
    );

    // Hydrate all coords for matching
    Object.entries(matchedCoords).forEach(([name, coords]) => {
      statsMap[name] = {
        name,
        count: 0,
        realCount: 0,
        totalPrice: 0,
        avgPrice: 0,
        zone: coords.zone,
        x: coords.x,
        y: coords.y
      };
    });

    realPropertiesInPoa.forEach(p => {
      const matchName = matchNeighborhoodDynamic(p.neighborhood, matchedCoords);
      const priceVal = p.price || 0;

      if (matchName) {
        statsMap[matchName].count += 1;
        statsMap[matchName].totalPrice += priceVal;
        statsMap[matchName].realCount += 1;
      } else if (p.neighborhood) {
        const literalName = capitalizeName(p.neighborhood);
        if (!statsMap[literalName]) {
          statsMap[literalName] = {
            name: literalName,
            count: 0,
            realCount: 0,
            totalPrice: 0,
            avgPrice: 0,
            zone: 'Outros'
          };
        }
        statsMap[literalName].count += 1;
        statsMap[literalName].totalPrice += priceVal;
        statsMap[literalName].realCount += 1;
      }
    });

    const statsList = Object.values(statsMap).map(s => {
      const avgPrice = s.count > 0 ? s.totalPrice / s.count : 0;
      return {
        ...s,
        avgPrice
      };
    });

    const maxCount = Math.max(...statsList.map(s => s.count), 1);

    return statsList.map(s => {
      const heatPercent = Math.min(Math.round((s.count / maxCount) * 100), 100);
      return {
        ...s,
        heatPercent
      };
    });
  }, [realPropertiesInPoa, selectedCity]);

  // 3. Leaderboard data filtered by search terms and sorted by rules
  const poaLeaderboardData = useMemo(() => {
    const filtered = poaNeighborhoodData.filter(item => {
      if (item.count === 0) return false; // Only show neighborhoods with actual properties inserted
      if (!poaSearchTerm) return true;
      return normalizeWord(item.name).includes(normalizeWord(poaSearchTerm)) ||
             normalizeWord(item.zone).includes(normalizeWord(poaSearchTerm));
    });

    return filtered.sort((a, b) => {
      if (poaSortBy === 'count') {
        const diff = b.count - a.count;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (poaSortBy === 'volume') {
        const diff = b.totalPrice - a.totalPrice;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      if (poaSortBy === 'avgPrice') {
        const diff = b.avgPrice - a.avgPrice;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [poaNeighborhoodData, poaSearchTerm, poaSortBy]);

  const poaSelectedBairroData = useMemo(() => {
    if (!poaSelectedBairro) return null;
    return poaNeighborhoodData.find(b => b.name === poaSelectedBairro);
  }, [poaNeighborhoodData, poaSelectedBairro]);

  const getBirthdaysOfMonth = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    
    const clientBirthdays = clients
      .filter(c => {
        if (!c.birthDate) return false;
        const separator = c.birthDate.includes('-') ? '-' : '/';
        const parts = c.birthDate.split(separator);
        const m = separator === '-' ? parts[1] : parts[1];
        return m ? (parseInt(m, 10) - 1) === currentMonth : false;
      })
      .map(c => ({ id: c.id, name: c.name, date: c.birthDate!, type: 'Cliente' as const }));

    const brokerBirthdays = brokers
      .filter(b => {
        if (!b.birthDate) return false;
        const separator = b.birthDate.includes('-') ? '-' : '/';
        const parts = b.birthDate.split(separator);
        const m = separator === '-' ? parts[1] : parts[1];
        return m ? (parseInt(m, 10) - 1) === currentMonth : false;
      })
      .map(b => ({ id: b.id, name: b.name, date: b.birthDate!, type: 'Corretor' as const }));

    return [...clientBirthdays, ...brokerBirthdays].sort((a, b) => {
      const partsA = a.date.includes('-') ? a.date.split('-') : a.date.split('/');
      const partsB = b.date.includes('-') ? b.date.split('-') : b.date.split('/');
      
      const dayA = partsA.length > 2 && a.date.includes('-') 
        ? parseInt(partsA[2], 10) 
        : (partsA[0] ? parseInt(partsA[0], 10) : 1);
      const dayB = partsB.length > 2 && b.date.includes('-') 
        ? parseInt(partsB[2], 10) 
        : (partsB[0] ? parseInt(partsB[0], 10) : 1);
        
      return (dayA || 1) - (dayB || 1);
    });
  };

  const getCategorizedNotifications = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const categorized: {
      hoje: { processId: string, notificationId: string, clientId?: string, clientName: string, reason: string, date: string }[],
      futuras: { processId: string, notificationId: string, clientId?: string, clientName: string, reason: string, date: string }[],
      pendentes: { processId: string, notificationId: string, clientId?: string, clientName: string, reason: string, date: string }[]
    } = { hoje: [], futuras: [], pendentes: [] };

    processes.forEach(p => {
      if (Array.isArray(p.notifications)) {
        p.notifications.forEach(n => {
          if (!n.completed) {
            const buyers = Array.isArray(p.participants)
              ? p.participants.filter(part => part.type === 'buyer').map(part => resolveParticipantName(part, clients, brokers, agencies)).join(', ')
              : '';
            const client = clients.find(c => c.id === p.clientId);
            const clientName = buyers || client?.name || 'Cliente Desconhecido';

            const notification = {
              processId: p.id!,
              notificationId: n.id,
              clientId: p.clientId,
              clientName,
              reason: n.reason,
              date: n.date
            };

            if (n.date === today) {
              categorized.hoje.push(notification);
            } else if (n.date > today) {
              categorized.futuras.push(notification);
            } else {
              categorized.pendentes.push(notification);
            }
          }
        });
      }
    });

    return categorized;
  };

  const handleConcludeNotification = async (processId: string, notificationId: string) => {
    const process = processes.find(p => p.id === processId);
    if (!process || !process.notifications) return;

    const updatedNotifications = process.notifications.map(n => 
      n.id === notificationId ? { ...n, completed: true } : n
    );

    try {
      await api.update('processes', processId, {
        notifications: updatedNotifications
      });
    } catch (error) {
      console.error('Erro ao concluir notificação:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const birthdays = getBirthdaysOfMonth();
  const { hoje, futuras, pendentes } = getCategorizedNotifications();
  const allNotifications = [...pendentes, ...hoje, ...futuras];

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getXPos = (idx: number) => {
    if (chartData.length <= 1) return 70 + 250;
    return 70 + (idx / (chartData.length - 1)) * 500;
  };

  const wItem = chartData.length > 1 ? 500 / (chartData.length - 1) : 500;

  return (
    <div className="space-y-4">
      {/* Quick Action: Iniciar Atendimento */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start mb-2"
      >
        <button
          onClick={() => onOpenClient?.(null, true, true)}
          className="w-full sm:w-auto px-10 py-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-sm sm:text-base uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Iniciar Atendimento
        </button>
      </motion.div>

      {/* Top level KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Active Processes */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-4 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block mb-0.5">Processos Ativos</span>
            <span className="text-2xl font-extrabold text-[#1a1a1a] block leading-none">{kpis.activeCount}</span>
            <span className="text-[9px] text-black/30 font-medium mt-1 block leading-tight">Simulações e propostas em andamento</span>
          </div>
        </motion.div>

        {/* KPI 2: Ticket Médio */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white p-4 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block mb-0.5">Ticket Médio</span>
            <span className="text-2xl font-extrabold text-[#1a1a1a] block leading-none">{formatCurrency(kpis.avgLoanVal)}</span>
            <span className="text-[9px] text-black/30 font-medium mt-1 block leading-tight">Média de valor dos financiamentos</span>
          </div>
        </motion.div>

        {/* KPI 3: Volume Concedido */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white p-4 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest block mb-0.5">Crédito Concedido</span>
            <span className="text-2xl font-extrabold text-[#1a1a1a] block leading-none">{formatCurrency(kpis.volumeConcedido)}</span>
            <span className="text-[9px] text-black/30 font-medium mt-1 block leading-tight">Volume total de contratos finalizados</span>
          </div>
        </motion.div>
      </div>





      {/* Dynamic Grid for alerts and other modules below */}
      <div className={cn("grid grid-cols-1 gap-4", allNotifications.length > 0 && "lg:grid-cols-2")}>
        {/* Notifications Column */}
        {allNotifications.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Notificações</h2>
                <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">Acompanhamento de processos</p>
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {allNotifications.map((n) => {
                  const now = new Date();
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isToday = n.date === today;
                  const isPending = n.date < today;

                  return (
                    <div 
                      key={`${n.processId}-${n.notificationId}`}
                      className={cn(
                        "p-3 rounded-2xl border shadow-sm flex items-center gap-3 transition-all",
                        isToday ? "bg-amber-50 border-amber-200" :
                        isPending ? "bg-red-50 border-red-200" :
                        "bg-emerald-50 border-emerald-200"
                      )}
                    >
                      {/* Date Box */}
                      <div 
                        className={cn(
                          "w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border shadow-sm cursor-pointer",
                          isToday ? "bg-amber-500 text-white border-amber-400" : 
                          isPending ? "bg-red-500 text-white border-red-400" :
                          "bg-emerald-500 text-white border-emerald-400"
                        )}
                        onClick={() => {
                          if (n.processId) onOpenProcess?.(n.processId);
                        }}
                        title="Ver Processos"
                      >
                        <span className="text-base font-bold leading-none">{n.date.split('-')[2]}</span>
                        <span className="text-[7px] font-bold uppercase tracking-tighter opacity-80">
                          {monthsNames[parseInt(n.date.split('-')[1]) - 1]}
                        </span>
                      </div>

                      {/* Middle Info */}
                      <div className="flex-1 min-w-0">
                        <p 
                          onClick={() => {
                            if (n.clientId) onOpenClient?.(n.clientId);
                          }}
                          className="text-xs font-bold text-[#1a1a1a] truncate leading-tight cursor-pointer hover:opacity-70 transition-opacity"
                        >
                          {n.clientName}
                        </p>
                        <div className={cn(
                          "inline-block px-1.5 py-0.5 mt-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                          isToday ? "bg-amber-100 text-amber-700" :
                          isPending ? "bg-red-100 text-red-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {n.reason}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConcludeConfirm({ processId: n.processId, notificationId: n.notificationId });
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all hover:scale-105",
                            isToday ? "bg-amber-500 text-white hover:bg-amber-600" :
                            isPending ? "bg-red-500 text-white hover:bg-red-600" :
                            "bg-emerald-500 text-white hover:bg-emerald-600"
                          )}
                          title="Concluir"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Birthdays Section */}
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 border border-pink-500/20">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Aniversariantes do Mês</h2>
              <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">Celebre com seus parceiros</p>
            </div>
          </div>

          {birthdays.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {birthdays.map((b, i) => {
                const day = parseInt(b.date.split('-')[2]);
                const isToday = day === new Date().getDate();

                return (
                  <motion.div
                    key={`${b.name}-${b.date}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (b.type === 'Cliente' && b.id) {
                        onOpenClient?.(b.id);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer",
                      isToday 
                        ? "bg-pink-50 border-pink-200 shadow-md ring-2 ring-pink-500/20" 
                        : "bg-[#f5f5f0]/50 border-black/5 hover:border-black/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border",
                      isToday ? "bg-pink-500 text-white border-pink-400" : "bg-white text-[#1a1a1a] border-black/5"
                    )}>
                      <span className="text-base font-bold leading-none">{day}</span>
                      <span className="text-[7px] font-bold uppercase tracking-tighter opacity-60">
                        {monthsNames[parseInt(b.date.split('-')[1]) - 1]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1a1a1a] truncate leading-tight">{b.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-1 py-0.5 rounded",
                          b.type === 'Cliente' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                        )}>
                          {b.type}
                        </span>
                        {isToday && (
                          <span className="text-[8px] font-bold text-pink-500 animate-pulse">HOJE!</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#f5f5f0]/30 rounded-2xl border border-dashed border-black/10">
              <CalendarDays className="w-10 h-10 text-black/10 mx-auto mb-2" />
              <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Nenhum aniversariante</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal for notification completion */}
      <AnimatePresence>
        {concludeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-black/10 p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Concluir Notificação?</h3>
              <p className="text-sm text-black/40 mb-8">
                Esta notificação será removida do seu Dashboard. Você confirma a conclusão?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConcludeConfirm(null)}
                  className="flex-1 px-6 py-3 rounded-full font-bold border border-black/10 text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleConcludeNotification(concludeConfirm.processId, concludeConfirm.notificationId);
                    setConcludeConfirm(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-full font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
