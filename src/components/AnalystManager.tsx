import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import { Process, Property } from '../types';
import { ChevronDown, BarChart3, Landmark, CheckCircle2, MapPin, Flame, Search, SlidersHorizontal, Map, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'motion/react';
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

const normalizeWord = (text: string) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

export default function AnalystManager() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  const [poaSearchTerm, setPoaSearchTerm] = useState('');
  const [poaSelectedBairro, setPoaSelectedBairro] = useState<string | null>(null);
  const [poaSortBy, setPoaSortBy] = useState<'count' | 'volume' | 'avgPrice'>('count');
  const [selectedCity, setSelectedCity] = useState<string>('Porto Alegre');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const availableCities = useMemo(() => {
    const citiesMap: Record<string, string> = {};
    properties.forEach(p => {
      if (p.city) {
        const trimmed = p.city.trim();
        if (trimmed) {
          citiesMap[trimmed.toLowerCase()] = capitalizeName(trimmed);
        }
      }
    });
    if (!citiesMap['porto alegre'] && !citiesMap['poa']) {
      citiesMap['porto alegre'] = 'Porto Alegre';
    }
    return Object.values(citiesMap).sort((a, b) => a.localeCompare(b));
  }, [properties]);

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

  useEffect(() => {
    setTitle("Análise do Analista / Solutz");
    setActions(null);
  }, []);

  useEffect(() => {
    const unsubProcesses = api.subscribeToCollection('processes', (data) => {
      setProcesses(data as Process[]);
    });
    const unsubProperties = api.subscribeToCollection('properties', (data) => {
      setProperties(data as Property[]);
      setLoading(false);
    });

    return () => {
      unsubProcesses();
      unsubProperties();
    };
  }, []);

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

    processes.forEach(p => {
      if (p.stage !== 'Finalizado') return;

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

    const matchedCoords = getCityNeighborhoodCoords(
      selectedCity,
      Array.from(new Set(realPropertiesInPoa.map(p => p.neighborhood).filter(Boolean))) as string[]
    );

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

  const poaLeaderboardData = useMemo(() => {
    const filtered = poaNeighborhoodData.filter(item => {
      if (item.count === 0) return false;
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

  const wItem = 520 / Math.max(1, chartData.length - 1);
  const getXPos = (idx: number) => 50 + idx * wItem;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Visual Charts Section using Recharts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Análise de Performance</h2>
              <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">
                Evolução e volume da operação ({performancePeriod === '6m' ? 'Últimos 6 Meses' : performancePeriod === '1y' ? 'Último 1 Ano' : 'Período Todo'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex bg-[#f5f5f0] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPerformancePeriod('6m')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                  performancePeriod === '6m'
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/60"
                )}
              >
                6 meses
              </button>
              <button
                type="button"
                onClick={() => setPerformancePeriod('1y')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                  performancePeriod === '1y'
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/60"
                )}
              >
                1 ano
              </button>
              <button
                type="button"
                onClick={() => setPerformancePeriod('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap",
                  performancePeriod === 'all'
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/60"
                )}
              >
                Período todo
              </button>
            </div>

            {/* Tab switches */}
            <div className="flex bg-[#f5f5f0] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartTab('volume')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap",
                  chartTab === 'volume'
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/60"
                )}
              >
                Volume de Crédito
              </button>
              <button
                type="button"
                onClick={() => setChartTab('count')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap",
                  chartTab === 'count'
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/60"
                )}
              >
                Quantidade de Processos
              </button>
            </div>
          </div>
        </div>

        {/* Custom SVG Performance Chart */}
        <div className="w-full h-80 relative select-none" onMouseLeave={() => setHoveredIndex(null)}>
          {/* Legend */}
          <div className="flex justify-end gap-x-4 gap-y-1 flex-wrap text-[10px] font-bold text-black/60 mb-2 px-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span>FGTS Finalizados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#005ca9]" />
              <span>SBPE Finalizados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span>Total Finalizados</span>
            </div>
          </div>

          <div className="w-full h-[260px] relative">
            <svg viewBox="0 0 600 240" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="colorSbpe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005ca9" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#005ca9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFgts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFinalized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const yVal = maxChartVal * pct;
                const yPos = 210 - pct * 180;
                return (
                  <g key={idx}>
                    <line x1="50" y1={yPos} x2="570" y2={yPos} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
                    <text x="40" y={yPos + 3} textAnchor="end" className="text-[9px] font-bold font-mono fill-black/35">
                      {chartTab === 'volume' ? formatCompactCurrency(yVal) : Math.round(yVal)}
                    </text>
                  </g>
                );
              })}

              {chartData.map((d, idx) => {
                const xPos = getXPos(idx);
                const shouldShowLabel = 
                  chartData.length <= 12 || 
                  idx === 0 || 
                  idx === chartData.length - 1 || 
                  idx % Math.ceil(chartData.length / 8) === 0;

                return shouldShowLabel ? (
                  <text key={idx} x={xPos} y="230" textAnchor="middle" className="text-[9px] font-bold font-mono fill-black/35">
                    {d.monthLabel}
                  </text>
                ) : null;
              })}

              {hoveredIndex !== null && (
                <line 
                  x1={getXPos(hoveredIndex)} 
                  y1="30" 
                  x2={getXPos(hoveredIndex)} 
                  y2="210" 
                  stroke="rgba(0,0,0,0.08)" 
                  strokeWidth="1.5"
                  strokeDasharray="4 4" 
                />
              )}

              {chartTab === 'volume' ? (
                <>
                  <path
                    d={`M 70,210 L ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.fgtsFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')} L ${getXPos(chartData.length - 1)},210 Z`}
                    fill="url(#colorFgts)"
                  />
                  <path
                    d={`M ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.fgtsFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')}`}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />

                  <path
                    d={`M 70,210 L ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.sbpeFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')} L ${getXPos(chartData.length - 1)},210 Z`}
                    fill="url(#colorSbpe)"
                  />
                  <path
                    d={`M ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.sbpeFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')}`}
                    fill="none"
                    stroke="#005ca9"
                    strokeWidth="2"
                  />

                  <path
                    d={`M 70,210 L ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.totalFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')} L ${getXPos(chartData.length - 1)},210 Z`}
                    fill="url(#colorFinalized)"
                  />
                  <path
                    d={`M ${chartData.map((d, idx) => `${getXPos(idx)},${210 - ((d.totalFinalizedVolume || 0) / maxChartVal) * 180}`).join(' L ')}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />

                  {chartData.map((d, idx) => {
                    const x = getXPos(idx);
                    const yFgts = 210 - ((d.fgtsFinalizedVolume || 0) / maxChartVal) * 180;
                    const ySbpe = 210 - ((d.sbpeFinalizedVolume || 0) / maxChartVal) * 180;
                    const yTotal = 210 - ((d.totalFinalizedVolume || 0) / maxChartVal) * 180;

                    const isHovered = hoveredIndex === idx;
                    const showDotLabels = chartData.length <= 12;

                    return (
                      <g key={idx}>
                        <circle cx={x} cy={yFgts} r={isHovered ? 5 : 3} className="fill-[#f59e0b] stroke-white stroke-2 transition-all duration-150" />
                        <circle cx={x} cy={ySbpe} r={isHovered ? 5 : 3} className="fill-[#005ca9] stroke-white stroke-2 transition-all duration-150" />
                        <circle cx={x} cy={yTotal} r={isHovered ? 6 : 4} className="fill-[#10b981] stroke-white stroke-2 transition-all duration-150" />

                        {!isHovered && d.totalFinalizedVolume > 0 && showDotLabels && (
                          <text x={x} y={yTotal - 8} textAnchor="middle" className="text-[8px] font-black fill-[#059669]">
                            {formatCompactCurrency(d.totalFinalizedVolume)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              ) : (
                <>
                  {chartData.map((d, idx) => {
                    const xCenter = getXPos(idx);
                    
                    const hFgts = ((d.fgtsFinalizedCount || 0) / maxChartVal) * 180;
                    const hSbpe = ((d.sbpeFinalizedCount || 0) / maxChartVal) * 180;
                    const hTotal = ((d.totalFinalizedCount || 0) / maxChartVal) * 180;

                    const w = Math.max(3, Math.min(12, 120 / chartData.length));
                    const g = Math.max(1, Math.min(4, w * 0.35));
                    const isHovered = hoveredIndex === idx;
                    const showBarLabels = chartData.length <= 12;

                    return (
                      <g key={idx}>
                        <rect
                          x={xCenter - (1.5 * w + g)}
                          y={210 - hFgts}
                          width={w}
                          height={Math.max(hFgts, 1)}
                          rx="3"
                          className={cn("fill-[#f59e0b] transition-all duration-300", isHovered ? "brightness-105" : "brightness-100")}
                        />
                        {d.fgtsFinalizedCount > 0 && !isHovered && showBarLabels && (
                          <text x={xCenter - (w + g)} y={210 - hFgts - 4} textAnchor="middle" className="text-[7px] font-bold fill-[#d97706]">
                            {d.fgtsFinalizedCount}
                          </text>
                        )}

                        <rect
                          x={xCenter - (0.5 * w)}
                          y={210 - hSbpe}
                          width={w}
                          height={Math.max(hSbpe, 1)}
                          rx="3"
                          className={cn("fill-[#005ca9] transition-all duration-300", isHovered ? "brightness-105" : "brightness-100")}
                        />
                        {d.sbpeFinalizedCount > 0 && !isHovered && showBarLabels && (
                          <text x={xCenter} y={210 - hSbpe - 4} textAnchor="middle" className="text-[7px] font-bold fill-[#005ca9]">
                            {d.sbpeFinalizedCount}
                          </text>
                        )}

                        <rect
                          x={xCenter + (0.5 * w + g)}
                          y={210 - hTotal}
                          width={w}
                          height={Math.max(hTotal, 1)}
                          rx="3"
                          className={cn("fill-[#10b981] transition-all duration-300", isHovered ? "brightness-105" : "brightness-100")}
                        />
                        {d.totalFinalizedCount > 0 && !isHovered && showBarLabels && (
                          <text x={xCenter + (w + g)} y={210 - hTotal - 4} textAnchor="middle" className="text-[8px] font-black fill-[#059669]">
                            {d.totalFinalizedCount}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {chartData.map((_, idx) => {
                const xPos = getXPos(idx);
                const rectWidth = idx === 0 || idx === chartData.length - 1 ? wItem / 2 + 20 : wItem;
                const rectX = idx === 0 ? 50 : xPos - wItem / 2;

                return (
                  <rect
                    key={idx}
                    x={rectX}
                    y="10"
                    width={rectWidth}
                    height="210"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseOver={() => setHoveredIndex(idx)}
                  />
                );
              })}
            </svg>

            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <div 
                className="absolute z-40 bg-black/95 text-white p-3 rounded-2xl border border-white/10 shadow-2xl text-[10px] sm:text-xs font-sans space-y-1.5 pointer-events-none transition-all duration-150"
                style={{
                  left: `${(getXPos(hoveredIndex) / 600) * 100}%`,
                  top: '15px',
                  transform: 'translateX(-50%)',
                }}
              >
                <p className="font-bold mb-1 opacity-60 text-[9px] uppercase tracking-wider">
                  {chartData[hoveredIndex].monthLabel}
                </p>
                {chartTab === 'volume' ? (
                  <>
                    <p className="font-bold text-[#f59e0b] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      FGTS: {formatCurrency(chartData[hoveredIndex].fgtsFinalizedVolume)}
                    </p>
                    <p className="font-bold text-[#005ca9] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#005ca9]" />
                      SBPE: {formatCurrency(chartData[hoveredIndex].sbpeFinalizedVolume)}
                    </p>
                    <p className="font-bold text-[#10b981] flex items-center gap-1 border-t border-white/10 pt-1 mt-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Total: {formatCurrency(chartData[hoveredIndex].totalFinalizedVolume)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[#f59e0b] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      FGTS: {chartData[hoveredIndex].fgtsFinalizedCount} proc
                    </p>
                    <p className="font-bold text-[#005ca9] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#005ca9]" />
                      SBPE: {chartData[hoveredIndex].sbpeFinalizedCount} proc
                    </p>
                    <p className="font-bold text-[#10b981] flex items-center gap-1 border-t border-white/10 pt-1 mt-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Total: {chartData[hoveredIndex].totalFinalizedCount} proc
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MAPA DE CALOR POR BAIRROS (DIPONÍVEL EM VÁRIAS CIDADES) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <MapPin className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#1a1a1a] leading-none">Mapa de Calor por Bairros</h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[8px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                  >
                    <span>{selectedCity}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-amber-800/80" />
                  </button>
                  {showCityDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent" 
                        onClick={() => setShowCityDropdown(false)} 
                      />
                      <div className="absolute top-full left-0 mt-1 bg-white border border-black/10 rounded-xl shadow-lg py-1.5 z-50 min-w-[150px] animate-in fade-in slide-in-from-top-1 duration-150">
                        <p className="text-[7px] font-mono font-bold text-black/30 px-3 py-1 uppercase tracking-widest border-b border-black/5 mb-1 select-none">
                          Cidades Ativas
                        </p>
                        {availableCities.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setSelectedCity(city);
                              setShowCityDropdown(false);
                              setZoom(1);
                              setPan({ x: 0, y: 0 });
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider transition-colors flex items-center justify-between",
                              city === selectedCity 
                                ? "bg-amber-500 text-white" 
                                : "text-black/70 hover:bg-amber-50 hover:text-amber-900"
                            )}
                          >
                            <span>{city}</span>
                            {city === selectedCity && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-black/40 uppercase tracking-wider mt-1">Concentração e distribuição dos imóveis sob análise</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Imóveis Ativos: {realPropertiesInPoa.length} Cadastrado{realPropertiesInPoa.length !== 1 ? 's' : ''} em {selectedCity}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex flex-col">
            <div 
              ref={mapContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ touchAction: 'none' }}
              className={cn(
                "relative w-full h-[380px] bg-neutral-50 rounded-2xl border border-black/5 overflow-hidden flex flex-col justify-between select-none",
                isPointerDown ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              <div 
                className="absolute inset-0 origin-center select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isPointerDown ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-dashed border-black/40 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-dashed border-black/30 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-dashed border-black/20 rounded-full" />
                  <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-black/10" />
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-black/10" />
                </div>

                {(selectedCity.toLowerCase().includes('porto alegre') || selectedCity.toLowerCase() === 'poa') && (
                  <div className="absolute left-0 top-0 bottom-0 w-[18%] pointer-events-none">
                    <svg className="w-full h-full text-sky-100/45 fill-current" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M 0,0 Q 40,20 20,40 T 40,80 Q 20,95 0,100 L 0,100 L 0,0 Z" />
                    </svg>
                    <div className="absolute bottom-5 left-2 select-none -rotate-90 origin-bottom-left text-[8px] font-mono font-bold tracking-widest text-sky-800/40 uppercase">
                      Rio Guaíba
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 m-4">
                  {poaNeighborhoodData.map((b) => {
                    if (b.x === undefined || b.y === undefined) return null;

                    const isHovered = poaSelectedBairro === b.name;
                    const hasImoves = b.count > 0;

                    let dotColor = 'bg-neutral-300 border-neutral-400 text-neutral-400';
                    let ringColor = 'border-transparent';

                    if (hasImoves) {
                      if (b.heatPercent >= 75) {
                        dotColor = 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/40';
                        ringColor = 'border-rose-500/30';
                      } else if (b.heatPercent >= 35) {
                        dotColor = 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/30';
                        ringColor = 'border-amber-500/20';
                      } else {
                        dotColor = 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20';
                        ringColor = 'border-emerald-500/20';
                      }
                    }

                    const baseSize = hasImoves ? (12 + (b.heatPercent / 100) * 12) : 8;

                    return (
                      <div
                        key={b.name}
                        className="absolute group transition-all duration-300"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: isHovered ? 40 : hasImoves ? 20 : 10
                        }}
                        onMouseEnter={() => setPoaSelectedBairro(b.name)}
                        onMouseLeave={() => setPoaSelectedBairro(null)}
                      >
                        {hasImoves && (
                          <span
                            style={{
                              width: `${baseSize * 1.8}px`,
                              height: `${baseSize * 1.8}px`
                            }}
                            className={cn(
                              "absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full border animate-ping pointer-events-none duration-1000",
                              ringColor
                            )}
                          />
                        )}

                        <button
                          className={cn(
                            "rounded-full flex items-center justify-center border transition-all duration-300",
                            dotColor,
                            isHovered ? "scale-125 ring-4 ring-black/10" : ""
                          )}
                          style={{
                            width: `${baseSize}px`,
                            height: `${baseSize}px`
                          }}
                        >
                          {hasImoves && b.heatPercent >= 35 && (
                            <Flame className="w-2 h-2 text-white/90" />
                          )}
                        </button>

                        {(isHovered || (hasImoves && b.heatPercent >= 75)) && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap bg-neutral-900 border border-neutral-800 text-white rounded-md px-2 py-0.5 shadow-md pointer-events-none z-50 text-center">
                            <p className="text-[8px] font-bold tracking-wide">{b.name}</p>
                            <p className="text-[7px] text-white/50">{b.count} imóvel{b.count > 1 ? 's' : ''}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute top-4 right-4 text-black/15 pointer-events-none flex flex-col items-center">
                <div className="w-6 h-6 border border-current rounded-full flex items-center justify-center font-mono font-bold text-[8px] text-black/30">
                  N
                </div>
              </div>

              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-black/5 flex items-center gap-1.5 z-10 pointer-events-none shadow-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[9px] font-extrabold text-black/70 uppercase tracking-wider">
                  {poaNeighborhoodData.reduce((acc, curr) => acc + curr.count, 0)} Imóveis Alocados
                </span>
              </div>

              <div className="absolute top-12 right-4 flex flex-col items-end gap-1 z-30">
                <div className="flex flex-col gap-1 rounded-xl bg-white/90 backdrop-blur-md p-1 border border-black/5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(prev => {
                        const next = Math.min(4, prev + 0.3);
                        return next;
                      });
                    }}
                    className="w-7 h-7 hover:bg-neutral-100 rounded-lg flex items-center justify-center text-black/70 hover:text-black transition-all active:scale-95"
                    title="Aumentar Zoom (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(prev => {
                        const next = Math.max(1, prev - 0.3);
                        if (next === 1) setPan({ x: 0, y: 0 });
                        return next;
                      });
                    }}
                    className="w-7 h-7 hover:bg-neutral-100 rounded-lg flex items-center justify-center text-black/70 hover:text-black transition-all active:scale-95"
                    title="Diminuir Zoom (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="w-7 h-7 hover:bg-neutral-100 rounded-lg flex items-center justify-center text-black/70 hover:text-black transition-all active:scale-95 text-[9px] font-black"
                    title="Resetar Zoom"
                  >
                    1x
                  </button>
                </div>
                <span className="text-[6.5px] text-black/40 font-extrabold uppercase tracking-wider select-none bg-white/60 px-1.5 py-0.5 rounded shadow-xs backdrop-blur-xs">
                  Mouse: Zoom | Arraste para mover
                </span>
              </div>

              <div className="bg-white/80 backdrop-blur-md p-4 border-t border-black/5 z-20">
                {poaSelectedBairroData ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Flame className={cn("w-4 h-4", 
                          poaSelectedBairroData.heatPercent >= 75 ? "text-rose-500 animate-pulse" :
                          poaSelectedBairroData.heatPercent >= 35 ? "text-amber-500 animate-pulse" :
                          poaSelectedBairroData.heatPercent > 0 ? "text-emerald-500" : "text-neutral-400"
                        )} />
                        <span className="text-sm font-extrabold text-black/80">{poaSelectedBairroData.name}</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-black/5 text-black/40">
                          {poaSelectedBairroData.zone}
                        </span>
                      </div>
                      <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">
                        {poaSelectedBairroData.count} cadastrado{poaSelectedBairroData.count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 self-end sm:self-center">
                      <div>
                        <span className="text-[8px] text-black/40 uppercase font-mono font-bold block">Volume sob Gestão</span>
                        <span className="text-sm font-black text-[#1a1a1a]">
                          {formatCurrency(poaSelectedBairroData.totalPrice)}
                        </span>
                      </div>
                      <div className="border-l border-black/10 pl-6">
                        <span className="text-[8px] text-black/40 uppercase font-mono font-bold block">Preço Médio Imóvel</span>
                        <span className="text-sm font-black text-[#1a1a1a]">
                          {formatCurrency(poaSelectedBairroData.avgPrice)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 text-black/35 py-1 select-none">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      Passe o mouse ou toque nos pontos do mapa para visualizar estatísticas de densidade
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-black/30" />
                  <input
                    type="text"
                    placeholder="Buscar bairro..."
                    value={poaSearchTerm}
                    onChange={(e) => setPoaSearchTerm(e.target.value)}
                    className="w-full bg-[#fcfcfb] border border-black/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-black/10"
                  />
                </div>

                <div className="flex items-center justify-between border border-black/5 bg-[#fcfcfb] p-1 rounded-xl">
                  <button
                    onClick={() => setPoaSortBy('count')}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[9px] font-bold tracking-tight text-center transition-all",
                      poaSortBy === 'count' ? "bg-white text-black shadow-sm border border-black/5" : "text-black/40 hover:text-black/60"
                    )}
                  >
                    Quantidade
                  </button>
                  <button
                    onClick={() => setPoaSortBy('volume')}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[9px] font-bold tracking-tight text-center transition-all",
                      poaSortBy === 'volume' ? "bg-white text-black shadow-sm border border-black/5" : "text-black/40 hover:text-black/60"
                    )}
                  >
                    Volume total
                  </button>
                  <button
                    onClick={() => setPoaSortBy('avgPrice')}
                    className={cn(
                      "flex-1 py-1 rounded-lg text-[9px] font-bold tracking-tight text-center transition-all",
                      poaSortBy === 'avgPrice' ? "bg-white text-black shadow-sm border border-black/5" : "text-black/40 hover:text-black/60"
                    )}
                  >
                    Preço Médio
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[295px] overflow-y-auto pr-2 custom-scrollbar">
                {poaLeaderboardData.length > 0 ? (
                  poaLeaderboardData.map((b, index) => {
                    const isSelected = poaSelectedBairro === b.name;
                    const hasImoveis = b.count > 0;

                    const heatBgColor = 
                      b.heatPercent >= 75 ? "bg-rose-500" :
                      b.heatPercent >= 35 ? "bg-amber-500" :
                      b.heatPercent > 0 ? "bg-emerald-500" : "bg-neutral-200";

                    return (
                      <div
                        key={b.name}
                        onMouseEnter={() => setPoaSelectedBairro(b.name)}
                        onMouseLeave={() => setPoaSelectedBairro(null)}
                        className={cn(
                          "p-2.5 rounded-xl border flex flex-col transition-all cursor-pointer",
                          isSelected 
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-sm" 
                            : hasImoveis 
                              ? "bg-[#f5f5f0]/30 border-black/5 hover:bg-[#f5f5f0]/50" 
                              : "bg-white border-neutral-100 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black",
                              isSelected 
                                ? "bg-white/20 text-white" 
                                : hasImoveis 
                                  ? "bg-black/5 text-black/60" 
                                  : "bg-neutral-100 text-neutral-400"
                            )}>
                              {index + 1}
                            </span>
                            
                            <div className="truncate">
                              <p className="text-xs font-black truncate leading-none mb-0.5">{b.name}</p>
                              <div className="flex items-center gap-1">
                                <span className={cn(
                                  "text-[7px] font-extrabold uppercase px-1 py-0.2 rounded",
                                  isSelected ? "bg-white/10 text-white/70" : "bg-black/5 text-black/40"
                                )}>
                                  {b.zone}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black block">
                              {poaSortBy === 'count' ? `${b.count} imóveis` : b.totalPrice > 0 ? formatCurrency(poaSortBy === 'volume' ? b.totalPrice : b.avgPrice) : 'R$ 0'}
                            </span>
                            {poaSortBy !== 'count' && (
                              <span className={cn("text-[8px] font-bold block", isSelected ? "text-white/60" : "text-black/30")}>
                                {b.count} imóvel{b.count !== 1 ? 's' : ''}
                              </span>
                            )}
                            {poaSortBy === 'count' && (
                              <span className={cn("text-[8px] font-bold block", isSelected ? "text-white/60" : "text-black/30")}>
                                {b.totalPrice > 0 ? formatCurrency(b.totalPrice) : 'Sem valor'}
                              </span>
                            )}
                          </div>
                        </div>

                        {hasImoveis && (
                          <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", heatBgColor)} 
                              style={{ width: `${b.heatPercent}%` }} 
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-black/10">
                    <Map className="w-8 h-8 text-black/10 mx-auto mb-2" />
                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest">Nenhum bairro com imóveis inseridos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
