"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { UploadCloud, FileSpreadsheet, ChevronRight, BarChart3, AlertCircle, Building2, TrendingUp, TrendingDown, Search, X, ChevronDown, Activity, PieChart as PieChartIcon, ShieldCheck, Wallet, Flame, Menu, ChevronLeft, Download, Printer, RefreshCw, Filter } from "lucide-react";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, Sector, ComposedChart, ReferenceLine, ScatterChart, Scatter, ZAxis, LabelList, AreaChart, Area } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Fixed workspace user – no login required
const USER_ID = "059a4524-555c-491a-8c8a-dc9618f8d788";

// ── SWR Cache helpers (localStorage) ─────────────────────────────────────────
const cacheSet = (key: string, data: any) => {
  try { localStorage.setItem(`findata_cache_${key}`, JSON.stringify(data)); } catch {}
};
const cacheGet = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(`findata_cache_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(num);
};

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  const [filesToUpload, setFilesToUpload] = useState<{ file: File; status: 'pending' | 'uploading' | 'success' | 'error'; errorMsg?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [industries, setIndustries] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"Yearly" | "Quarterly">("Yearly");
  const [timeRange, setTimeRange] = useState<number>(6);
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedCrossSectionalPeriod, setSelectedCrossSectionalPeriod] = useState<string | null>(null);
  
  const [sectorOverview, setSectorOverview] = useState<any>(null);
  const [valuation, setValuation] = useState<any>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [sectorValuation, setSectorValuation] = useState<any[]>([]);
  const [sectorValuationLoading, setSectorValuationLoading] = useState(false);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [sectorOverviewLoading, setSectorOverviewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [refreshInterval, setRefreshInterval] = useState<number | null>(60);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>("");

  const [historyRange, setHistoryRange] = useState<string>("3M");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [hiddenDataKeys, setHiddenDataKeys] = useState<Record<string, boolean>>({});

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey || (e.payload && e.payload.dataKey);
    if (dataKey) {
      setHiddenDataKeys(prev => ({
        ...prev,
        [dataKey]: !prev[dataKey]
      }));
    }
  };

  const renderLegendText = (value: string, entry: any) => {
    const dataKey = entry.dataKey || (entry.payload && entry.payload.dataKey);
    const isHidden = dataKey ? hiddenDataKeys[dataKey] : false;
    return (
      <span style={{ 
        color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)',
        textDecoration: isHidden ? 'line-through' : 'none',
        opacity: isHidden ? 0.4 : 1,
        cursor: 'pointer',
        fontWeight: isHidden ? 400 : 500,
        userSelect: 'none'
      }}>
        {value}
      </span>
    );
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    // Load dashboard on mount
    loadDashboard(USER_ID);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    fetchIndustries(USER_ID);
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      fetchStocks(USER_ID, selectedIndustry, reportType);
      fetchSectorOverview(USER_ID, selectedIndustry, reportType, timeRange);
    }
  }, [selectedIndustry, reportType, timeRange]);

  useEffect(() => {
    if (selectedIndustry) {
      saveDashboard(USER_ID, selectedIndustry, reportType, selectedTickers);
    }
  }, [selectedTickers, reportType, timeRange]);


  // Fetch valuation (P/E, P/B) whenever a single ticker is selected
  useEffect(() => {
    if (selectedTickers.length === 1) {
      const ticker = selectedTickers[0];
      const cacheKey = `valuation_${ticker}_${reportType}`;
      // Show cached data immediately (stale)
      const cached = cacheGet<any>(cacheKey);
      if (cached) {
        setValuation(cached);
        setValuationLoading(false);
      } else {
        setValuation(null);
        setValuationLoading(true);
      }
      // Fetch fresh data in background
      fetch(`${API_BASE_URL}/api/stocks/${ticker}/valuation?user_id=${USER_ID}&report_type=${reportType}`)
        .then(r => r.json())
        .then(data => {
          setValuation(data);
          setValuationLoading(false);
          cacheSet(cacheKey, data);
          setLastRefreshTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        })
        .catch((err) => {
          console.warn("Valuation fetch failed:", err);
          setValuationLoading(false);
        });
    } else {
      setValuation(null);
    }
  }, [selectedTickers, reportType, refreshTrigger]);

  // Fetch historical price & volume whenever a single ticker or range is selected
  useEffect(() => {
    if (selectedTickers.length === 1) {
      const ticker = selectedTickers[0];
      const cacheKey = `history_${ticker}_${historyRange}`;
      // Show cached data immediately (stale)
      const cached = cacheGet<any[]>(cacheKey);
      if (cached) {
        setHistoryData(cached);
        setHistoryLoading(false);
      } else {
        setHistoryData([]);
        setHistoryLoading(true);
      }
      // Fetch fresh data in background
      fetch(`${API_BASE_URL}/api/stocks/${ticker}/history?range=${historyRange}`)
        .then(r => r.json())
        .then(data => {
          if (data.history) {
            setHistoryData(data.history);
            cacheSet(cacheKey, data.history);
          }
          setHistoryLoading(false);
        })
        .catch((err) => {
          console.warn("History fetch failed:", err);
          setHistoryLoading(false);
        });
    } else {
      setHistoryData([]);
    }
  }, [selectedTickers, historyRange, refreshTrigger]);



  
  useEffect(() => {
    if (selectedIndustry) {
      const cacheKey = `sector_valuation_${selectedIndustry}_${reportType}`;
      // Show cached data immediately (stale)
      const cached = cacheGet<any[]>(cacheKey);
      if (cached) {
        setSectorValuation(cached);
        setSectorValuationLoading(false);
      } else {
        setSectorValuationLoading(true);
      }
      // Fetch fresh data in background
      fetch(`${API_BASE_URL}/api/sectors/${encodeURIComponent(selectedIndustry)}/valuation?user_id=${USER_ID}&report_type=${reportType}`)
        .then(r => r.json())
        .then(data => {
          const val = data.valuation || [];
          setSectorValuation(val);
          setSectorValuationLoading(false);
          cacheSet(cacheKey, val);
          setLastRefreshTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        })
        .catch((err) => {
          console.warn("Sector valuation fetch failed:", err);
          setSectorValuationLoading(false);
        });
    }
  }, [selectedIndustry, reportType, refreshTrigger]);



  // Live data auto-refresh interval effect
  useEffect(() => {
    if (!refreshInterval) return;
    const intervalMs = refreshInterval * 60 * 1000;
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const loadDashboard = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.active_icb_sector) {
          setSelectedIndustry(data.active_icb_sector);
          if (data.active_report_type) setReportType(data.active_report_type);
          if (data.selected_tickers) setSelectedTickers(data.selected_tickers);
        }
      }
    } catch (e) {
      console.warn("loadDashboard failed:", e);
    }
  };

  const saveDashboard = async (userId: string, industry: string | null, rType: string, tickers: string[]) => {
    try {
      await fetch(`${API_BASE_URL}/api/dashboard/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, active_icb_sector: industry, active_report_type: rType, selected_tickers: tickers })
      });
    } catch (e) {
      console.warn("saveDashboard failed:", e);
    }
  };


  const fetchIndustries = async (userId: string) => {
    const cacheKey = `industries_${userId}`;
    // Show cached immediately
    const cached = cacheGet<string[]>(cacheKey);
    if (cached) setIndustries(cached);
    // Revalidate in background
    try {
      const res = await fetch(`${API_BASE_URL}/api/industries?user_id=${userId}`);
      const data = await res.json();
      const list = data.industries || [];
      setIndustries(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.warn("fetchIndustries failed:", e);
    }
  };

  const fetchStocks = async (userId: string, ind: string, rType: string) => {
    const cacheKey = `stocks_${userId}_${ind}_${rType}`;
    // Show cached immediately
    const cached = cacheGet<any[]>(cacheKey);
    if (cached) setStocks(cached);
    
    setStocksLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/stocks?user_id=${userId}&industry=${encodeURIComponent(ind)}&report_type=${rType}`);
      const data = await res.json();
      const list = data.stocks || [];
      setStocks(list);
      cacheSet(cacheKey, list);
    } catch (e) {
      console.warn("fetchStocks failed:", e);
    } finally {
      setStocksLoading(false);
    }
  };

  const fetchSectorOverview = async (userId: string, ind: string, rType: string, periods: number) => {
    const cacheKey = `sector_overview_${userId}_${ind}_${rType}_${periods}`;
    // Show cached immediately
    const cached = cacheGet<any>(cacheKey);
    if (cached) setSectorOverview(cached);
    
    setSectorOverviewLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sectors/${encodeURIComponent(ind)}/overview?user_id=${userId}&report_type=${rType}&last_periods=${periods}`);
      const data = await res.json();
      setSectorOverview(data);
      cacheSet(cacheKey, data);
    } catch (e) {
      console.warn("fetchSectorOverview failed:", e);
    } finally {
      setSectorOverviewLoading(false);
    }
  };



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFilesToUpload(selectedFiles.map(f => ({ file: f, status: 'pending' })));
      setError(null);
      setSuccessMsg(null);
    }
  };

  const handleUpload = async (filesFromSidebar?: FileList | null) => {
    let targets = filesToUpload;
    if (filesFromSidebar && filesFromSidebar.length > 0) {
      targets = Array.from(filesFromSidebar).map(f => ({ file: f, status: 'pending' }));
      setFilesToUpload(targets);
    }
    
    if (targets.length === 0) return;

    
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < targets.length; i++) {
      setFilesToUpload(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));
      
      const targetFile = targets[i].file;
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("user_id", USER_ID);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Failed to process Excel file.");
        const data = await response.json();
        
        successCount++;
        setFilesToUpload(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success' } : item));
      } catch (err: any) {
        failCount++;
        setFilesToUpload(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', errorMsg: err.message || "Failed" } : item));
      }
    }
    
    setUploading(false);
    
    if (successCount > 0) {
      setSuccessMsg(`Successfully imported ${successCount} file(s) securely.`);
      fetchIndustries(USER_ID);
    }
    if (failCount > 0) {
      setError(`Failed to import ${failCount} file(s). Please review the errors below.`);
    } else {
      setFilesToUpload([]);
    }
  };

  const selectTicker = (ticker: string) => {
    setSelectedTickers([ticker]); // Single select
    setShowDropdown(false);
  };
  
  const clearSelection = () => {
    setSelectedTickers([]);
    setSearchTerm("");
  };

  // --- Data Transformations ---
  const activePeriodIndex = useMemo(() => {
    if (!sectorOverview?.periods?.length) return 0;
    if (selectedCrossSectionalPeriod) {
      const idx = sectorOverview.periods.indexOf(selectedCrossSectionalPeriod);
      if (idx !== -1) return idx;
    }
    return sectorOverview.periods.length - 1;
  }, [sectorOverview, selectedCrossSectionalPeriod]);

  const valuationAnalysis = useMemo(() => {
    if (!sectorValuation || sectorValuation.length === 0) return null;
    
    const validPE = sectorValuation.filter(v => v.pe !== null && v.pe !== undefined);
    const validPB = sectorValuation.filter(v => v.pb !== null && v.pb !== undefined);
    
    const avgPE = validPE.length ? (validPE.reduce((sum, v) => sum + v.pe, 0) / validPE.length) : null;
    const avgEPSGrowth = sectorValuation.reduce((sum, v) => sum + v.eps_growth, 0) / sectorValuation.length;
    const avgPB = validPB.length ? (validPB.reduce((sum, v) => sum + v.pb, 0) / validPB.length) : null;
    const avgROE = sectorValuation.reduce((sum, v) => sum + v.roe, 0) / sectorValuation.length;
    
    const getRegression = (data: any[], xKey: string, yKey: string) => {
      const pts = data.filter(d => d[xKey] !== null && d[yKey] !== null && d[xKey] !== undefined && d[yKey] !== undefined);
      const n = pts.length;
      if (n < 2) return null;
      
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (const p of pts) {
        const x = p[xKey];
        const y = p[yKey];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }
      
      const denom = n * sumXX - sumX * sumX;
      if (denom === 0) return null;
      
      const m = (n * sumXY - sumX * sumY) / denom;
      const c = (sumY - m * sumX) / n;
      
      const minX = Math.min(...pts.map(p => p[xKey]));
      const maxX = Math.max(...pts.map(p => p[xKey]));
      
      const pad = (maxX - minX) * 0.15 || 5;
      const startX = minX - pad;
      const endX = maxX + pad;
      
      return [
        { [xKey]: startX, [yKey]: m * startX + c },
        { [xKey]: endX, [yKey]: m * endX + c }
      ];
    };
    
    const peReg = getRegression(validPE, 'eps_growth', 'pe');
    const pbReg = getRegression(validPB, 'roe', 'pb');
    
    return { avgPE, avgEPSGrowth, avgPB, avgROE, peReg, pbReg };
  }, [sectorValuation]);
  
  const absoluteData = useMemo(() => {
    if (!sectorOverview?.metrics?.ROA) return [];
    const mapped = sectorOverview.metrics.ROA.map((item: any) => {
      const ticker = item.ticker;
      const getVal = (metric: string) => {
        const mItem = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return mItem && mItem.data[activePeriodIndex] !== undefined ? mItem.data[activePeriodIndex] : 0;
      };
      return { 
        name: ticker, 
        NIM: getVal("NIM"), 
        NPL: getVal("NPL"), 
        LLR: getVal("LLR"),
        CAR: getVal("CAR"),
        ROA: getVal("ROA"),
        ROE: getVal("ROE"),
        GrossLoans: getVal("Gross Loans"),
        CASAAmount: getVal("CASA Amount"),
        GPM: getVal("GPM"),
        SGAMargin: getVal("SG&A Margin"),
        ParentProfitMargin: getVal("Parent Profit Margin"),
        NetProfitParent: getVal("Net Profit Parent"),
        OPM: getVal("OPM")
      };
    });
    return mapped.filter((item: any) => !hiddenDataKeys[item.name]);
  }, [sectorOverview, activePeriodIndex, hiddenDataKeys]);

  const nimSorted = [...absoluteData].sort((a,b) => b.NIM - a.NIM);
  const nplSorted = [...absoluteData].sort((a,b) => a.NPL - b.NPL); // Lower NPL is better, sort ascending
  const llrSorted = [...absoluteData].sort((a,b) => b.LLR - a.LLR); // Higher LLR is better
  const carSorted = [...absoluteData].sort((a,b) => b.CAR - a.CAR);
  const roaSorted = [...absoluteData].sort((a,b) => b.ROA - a.ROA);
  const roeSorted = [...absoluteData].sort((a,b) => b.ROE - a.ROE);
  const grossLoansSorted = [...absoluteData].sort((a,b) => b.GrossLoans - a.GrossLoans);
  const casaAmountSorted = [...absoluteData].sort((a,b) => b.CASAAmount - a.CASAAmount);
  const gpmSorted = [...absoluteData].sort((a,b) => b.GPM - a.GPM);
  const sgaMarginSorted = [...absoluteData].sort((a,b) => b.SGAMargin - a.SGAMargin);
  const parentProfitMarginSorted = [...absoluteData].sort((a,b) => b.ParentProfitMargin - a.ParentProfitMargin);
  const netProfitParentSorted = [...absoluteData].sort((a,b) => b.NetProfitParent - a.NetProfitParent);
  const opmSorted = [...absoluteData].sort((a,b) => b.OPM - a.OPM);

  const exportToCSV = () => {
    if (!sectorOverview) return;
    
    let csvRows = [];
    
    if (selectedTickers.length === 1) {
      const ticker = selectedTickers[0];
      const metrics = Object.keys(sectorOverview.metrics);
      csvRows.push(["Period", ...metrics].join(","));
      
      sectorOverview.periods.forEach((period: string, pIdx: number) => {
        const row = [period];
        metrics.forEach(metric => {
          const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
          row.push(item && item.data[pIdx] !== undefined ? item.data[pIdx] : "");
        });
        csvRows.push(row.join(","));
      });
    } else {
      const period = sectorOverview.periods[activePeriodIndex];
      const metrics = Object.keys(sectorOverview.metrics);
      const allTickers = new Set<string>();
      Object.values(sectorOverview.metrics).forEach((arr: any) => {
        arr.forEach((item: any) => allTickers.add(item.ticker));
      });
      const tickersArr = Array.from(allTickers);
      
      csvRows.push([`Ticker (As of ${period})`, ...metrics].join(","));
      
      tickersArr.forEach(ticker => {
        const row = [ticker];
        metrics.forEach(metric => {
          const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
          row.push(item && item.data[activePeriodIndex] !== undefined ? item.data[activePeriodIndex] : "");
        });
        csvRows.push(row.join(","));
      });
    }
    
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = selectedTickers.length === 1 
      ? `${selectedTickers[0]}_${reportType}_Data.csv`
      : `${selectedIndustry}_Overall_${reportType}_${sectorOverview.periods[activePeriodIndex].replace('/', '-')}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimeSeriesData = (metricName: string) => {
    if (!sectorOverview || !sectorOverview.periods) return [];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const row: any = { period: p };
      sectorOverview.metrics[metricName]?.forEach((tickerItem: any) => {
        row[tickerItem.ticker] = tickerItem.data[pIdx];
      });
      return row;
    });
  };

  const casaData = useMemo(() => getTimeSeriesData("CASA"), [sectorOverview]);
  const ldrData = useMemo(() => getTimeSeriesData("LDR"), [sectorOverview]);
  const cofData = useMemo(() => getTimeSeriesData("COF"), [sectorOverview]);
  const yoeaData = useMemo(() => getTimeSeriesData("YOEA"), [sectorOverview]);
  const creditGrowthData = useMemo(() => getTimeSeriesData("Credit Growth"), [sectorOverview]);
  const depositGrowthData = useMemo(() => getTimeSeriesData("Deposit Growth"), [sectorOverview]);
  const gpmData = useMemo(() => getTimeSeriesData("GPM"), [sectorOverview]);
  const sgaData = useMemo(() => getTimeSeriesData("SG&A Margin"), [sectorOverview]);
  const opmData = useMemo(() => getTimeSeriesData("OPM"), [sectorOverview]);
  const parentMarginData = useMemo(() => getTimeSeriesData("Parent Profit Margin"), [sectorOverview]);
  const parentProfitAbsData = useMemo(() => getTimeSeriesData("Net Profit Parent"), [sectorOverview]);

  const topKPIs = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    
    const currPeriod = sectorOverview.periods[activePeriodIndex];
    const isQuarterly = currPeriod?.includes('Q');
    
    let yoyIndex = -1;
    if (isQuarterly) {
      const match = currPeriod.match(/Q(\d+)\s*\/\s*(\d+)/i);
      if (match) {
        const q = match[1];
        const y = parseInt(match[2]);
        const targetPeriod = `Q${q}/${y - 1}`;
        yoyIndex = sectorOverview.periods.findIndex((p: string) => p.replace(/\s+/g, '') === targetPeriod);
      }
      if (yoyIndex === -1 && activePeriodIndex >= 4) {
        yoyIndex = activePeriodIndex - 4;
      }
    }

    const getVal = (metric: string, idx: number) => {
      const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
      return item ? (item.data[idx] || 0) : 0;
    };
    
    const getPBT = (idx: number) => {
      const pbt = getVal("PBT", idx);
      if (pbt !== 0) return pbt;
      return getVal("NII", idx) + getVal("Net Fee", idx) + getVal("Net FX", idx) + getVal("Net Trading Sec", idx) + getVal("Net Inv Sec", idx) + getVal("Other Income", idx) + getVal("Dividends", idx) - Math.abs(getVal("OPEX", idx)) - Math.abs(getVal("Provision", idx));
    };

    const getKPI = (name: string, valFn: (idx: number) => number) => {
      const curr = valFn(activePeriodIndex);
      const prevQ = activePeriodIndex > 0 ? valFn(activePeriodIndex - 1) : curr;
      const changeQ = prevQ !== 0 ? ((curr - prevQ) / Math.abs(prevQ)) * 100 : 0;
      
      let changeY = undefined;
      if (isQuarterly && yoyIndex !== -1) {
        const prevY = valFn(yoyIndex);
        changeY = prevY !== 0 ? ((curr - prevY) / Math.abs(prevY)) * 100 : 0;
      }
      
      return { 
        name, 
        value: curr, 
        change: changeQ, 
        suffix: isQuarterly ? 'QoQ' : 'YoY',
        changeYoY: changeY
      };
    };

    if (selectedIndustry === "Food & Beverage") {
      return [
        getKPI('Net Sales', idx => getVal("Net Sales", idx)),
        getKPI('Operating Profit', idx => {
          const op = getVal("Operating Profit", idx);
          if (op !== 0) return op;
          return getVal("Gross Profit", idx) - Math.abs(getVal("Selling Expenses", idx)) - Math.abs(getVal("Admin Expenses", idx));
        }),
        getKPI('Net Profit', idx => getVal("Net Profit Parent", idx) || getVal("Net Profit", idx))
      ];
    }

    return [
      getKPI('Net Interest Income', idx => getVal("NII", idx)),
      getKPI('Profit Before Tax', idx => getPBT(idx)),
      getKPI('Net Profit', idx => getVal("Net Profit Parent", idx) || getVal("Net Profit", idx))
    ];
  }, [selectedTickers, sectorOverview, activePeriodIndex, selectedIndustry]);

  // Deep Dive Data Transformations
  const waterfallData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    
    const getVal = (metric: string) => {
      const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
      return item ? (item.data[activePeriodIndex] || 0) : 0;
    };

    if (selectedIndustry === "Food & Beverage") {
      const netSales = getVal("Net Sales");
      const grossProfit = getVal("Gross Profit");
      const cogs = Math.abs(getVal("Cost of sales") || (netSales - grossProfit));
      const sellingExp = Math.abs(getVal("Selling Expenses"));
      const adminExp = Math.abs(getVal("Admin Expenses"));
      const sga = sellingExp + adminExp;
      
      const pbt = getVal("PBT") || (grossProfit - sga);
      const netProfit = getVal("Net Profit Parent") || getVal("Net Profit") || pbt;

      const s1 = netSales;
      const s2 = s1 - cogs;
      const s3 = s2 - sga;
      const s4 = pbt;
      const s5 = netProfit;

      const financialOther = s4 - s3;
      const taxContribution = s5 - s4;

      const getColor = (val: number) => val >= 0 ? '#2ecc71' : '#e74c3c';

      return [
        { name: 'Net Sales', value: [0, s1], color: '#2ecc71', val: netSales },
        { name: 'COGS', value: [s2, s1], color: '#e74c3c', val: -cogs },
        { name: 'Gross Profit', value: [0, s2], color: '#f39c12', val: s2 },
        { name: 'SG&A', value: [s3, s2], color: '#e74c3c', val: -sga },
        { name: 'Fin & Other Net', value: [Math.min(s3, s4), Math.max(s3, s4)], color: getColor(financialOther), val: financialOther },
        { name: 'PBT', value: [0, s4], color: '#9b59b6', val: s4 },
        { name: 'Tax', value: [Math.min(s4, s5), Math.max(s4, s5)], color: '#e74c3c', val: taxContribution },
        { name: 'Net Profit', value: [0, s5], color: '#3498db', val: s5 }
      ];
    }

    const nii = getVal("NII");
    const netFee = getVal("Net Fee");
    const netFx = getVal("Net FX");
    const netTrading = getVal("Net Trading Sec");
    const netInv = getVal("Net Inv Sec");
    const otherInc = getVal("Other Income");
    const dividends = getVal("Dividends");

    const s1 = nii;
    const s2 = s1 + netFee;
    const s3 = s2 + netFx;
    const s4 = s3 + netTrading;
    const s5 = s4 + netInv;
    const s6 = s5 + otherInc;
    const s7 = s6 + dividends;
    const toi = s7;

    const absOpex = Math.abs(getVal("OPEX"));
    const s8 = toi - absOpex;

    const absProv = Math.abs(getVal("Provision"));
    const s9 = s8 - absProv;

    const absTax = Math.abs(getVal("Tax"));
    const s10 = s9 - absTax;

    const absMi = Math.abs(getVal("Minority Interest"));
    const s11 = s10 - absMi;

    const netProfitParent = getVal("Net Profit Parent") || s11;

    const getColor = (val: number) => val >= 0 ? '#2ecc71' : '#e74c3c';

    return [
      { name: 'NII', value: [0, s1], color: getColor(nii), val: nii },
      { name: 'Net Fee', value: [Math.min(s1, s2), Math.max(s1, s2)], color: getColor(netFee), val: netFee },
      { name: 'Net FX', value: [Math.min(s2, s3), Math.max(s2, s3)], color: getColor(netFx), val: netFx },
      { name: 'Trading Sec', value: [Math.min(s3, s4), Math.max(s3, s4)], color: getColor(netTrading), val: netTrading },
      { name: 'Invest Sec', value: [Math.min(s4, s5), Math.max(s4, s5)], color: getColor(netInv), val: netInv },
      { name: 'Other Inc', value: [Math.min(s5, s6), Math.max(s5, s6)], color: getColor(otherInc), val: otherInc },
      { name: 'Dividends', value: [Math.min(s6, s7), Math.max(s6, s7)], color: getColor(dividends), val: dividends },
      { name: 'OPEX', value: [s8, toi], color: '#e74c3c', val: -absOpex },
      { name: 'Provision', value: [s9, s8], color: '#e74c3c', val: -absProv },
      { name: 'Tax', value: [s10, s9], color: '#e74c3c', val: -absTax },
      { name: 'Minority Int', value: [s11, s10], color: '#e74c3c', val: -absMi },
      { name: 'Net Profit', value: [0, netProfitParent], color: '#3498db', val: netProfitParent }
    ];
  }, [selectedTickers, sectorOverview, activePeriodIndex, selectedIndustry]);

  const nimTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        NII: getVal("NII"),
        NIM: getVal("NIM")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const assetQualityTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        NPL: getVal("NPL"),
        LLR: getVal("LLR")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const roeRoaTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        ROA: getVal("ROA"),
        ROE: getVal("ROE")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const marginsTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        GPM: getVal("GPM"),
        OPM: getVal("OPM"),
        NPM: getVal("Parent Profit Margin"),
        SGA: getVal("SG&A Margin")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const solvencyTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      const st = getVal("ShortTermDebt");
      const lt = getVal("LongTermDebt");
      const eq = getVal("Equity");
      const de = eq > 0 ? ((st + lt) / eq) * 100 : 0;
      return {
        period: p,
        DE: parseFloat(de.toFixed(2)),
        InterestExpense: getVal("Interest Expense")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const workingCapitalTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        ReceivableDays: getVal("Receivable Days"),
        InventoryDays: getVal("Inventory Days"),
        PayableDays: getVal("Payable Days"),
        CCC: getVal("CCC")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const cashFlowTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        CFO: getVal("CFO"),
        FCFE: getVal("FCFE"),
        CFI: getVal("CFI"),
        CFINetCapex: getVal("CFI_NetCapex"),
        CFINetLoans: getVal("CFI_NetLoans"),
        CFIOther: getVal("CFI_Other"),
        CFF: getVal("CFF"),
        CFFShareIssue: getVal("CFF_ShareIssue"),
        CFFShareRepurchase: getVal("CFF_ShareRepurchase"),
        CFFNetBorrowing: getVal("CFF_NetBorrowing"),
        CFFLease: getVal("CFF_Lease"),
        CFFDividends: getVal("CFF_Dividends"),
        CFFOther: getVal("CFF_Other")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const yoeaCofTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        YOEA: getVal("YOEA"),
        COF: getVal("COF")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const yoeaCofSpreadData = useMemo(() => {
    return yoeaCofTrendData.map((item: any) => ({
      ...item,
      spread: [item.COF, item.YOEA]
    }));
  }, [yoeaCofTrendData]);

  const growthTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string, idx: number) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[idx] || 0) : 0;
      };
      if (selectedIndustry === "Food & Beverage") {
        const isQuarterly = p.includes('Q');
        let yoyIdx = -1;
        if (isQuarterly) {
          const match = p.match(/Q(\d+)\s*\/\s*(\d+)/i);
          if (match) {
            const q = match[1];
            const y = parseInt(match[2]);
            const target = `Q${q}/${y - 1}`;
            yoyIdx = sectorOverview.periods.findIndex((pr: string) => pr.replace(/\s+/g, '') === target);
          }
          if (yoyIdx === -1 && pIdx >= 4) yoyIdx = pIdx - 4;
        } else {
          if (pIdx >= 1) yoyIdx = pIdx - 1;
        }
        
        const currSales = getVal("Net Sales", pIdx);
        const prevSales = yoyIdx !== -1 ? getVal("Net Sales", yoyIdx) : 0;
        const salesGrowth = prevSales > 0 ? ((currSales - prevSales) / prevSales) * 100 : 0;
        
        const currNP = getVal("Net Profit Parent", pIdx) || getVal("Net Profit", pIdx);
        const prevNP = yoyIdx !== -1 ? (getVal("Net Profit Parent", yoyIdx) || getVal("Net Profit", yoyIdx)) : 0;
        const npGrowth = prevNP > 0 ? ((currNP - prevNP) / prevNP) * 100 : 0;

        return {
          period: p,
          RevenueGrowth: parseFloat(salesGrowth.toFixed(2)),
          NetProfitGrowth: parseFloat(npGrowth.toFixed(2))
        };
      }
      return {
        period: p,
        CreditGrowth: getVal("Credit Growth", pIdx),
        DepositGrowth: getVal("Deposit Growth", pIdx)
      };
    });
  }, [selectedTickers, sectorOverview, selectedIndustry]);

  const revenueNetProfitAbsData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      return {
        period: p,
        Revenue: getVal("Net Sales"),
        NetProfitParent: getVal("Net Profit Parent") || getVal("Net Profit")
      };
    });
  }, [selectedTickers, sectorOverview]);

  const ldrSmlTrendData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return [];
    const ticker = selectedTickers[0];
    return sectorOverview.periods.map((p: string, pIdx: number) => {
      const getVal = (metric: string) => {
        const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
        return item ? (item.data[pIdx] || 0) : 0;
      };
      
      const ldr = getVal("LDR");
      const mdhLoans = getVal("MediumTermLoans") + getVal("LongTermLoans");
      const ltLiab = getVal("BL_TotalLiab_1_5Y") + getVal("BL_TotalLiab_Over5Y");
      const cof = getVal("COF");
      
      const stUsedForMdh = Math.max(0, mdhLoans - ltLiab);
      const sml = mdhLoans > 0 ? (stUsedForMdh / mdhLoans) * 100 : 0;
      
      return {
        period: p,
        LDR: ldr,
        SML: parseFloat(sml.toFixed(2)),
        COF: cof
      };
    });
  }, [selectedTickers, sectorOverview]);

  const carKPI = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return { current: 0, change: 0, period: "" };
    const ticker = selectedTickers[0];
    const getVal = (metric: string, idx: number) => {
      const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
      return item ? (item.data[idx] || 0) : 0;
    };
    if (selectedIndustry === "Food & Beverage") {
      const getDE = (idx: number) => {
        const st = getVal("ShortTermDebt", idx);
        const lt = getVal("LongTermDebt", idx);
        const eq = getVal("Equity", idx);
        return eq > 0 ? ((st + lt) / eq) * 100 : 0;
      };
      const currentDE = getDE(activePeriodIndex);
      const prevDE = activePeriodIndex > 0 ? getDE(activePeriodIndex - 1) : currentDE;
      return {
        current: currentDE,
        change: currentDE - prevDE,
        period: sectorOverview.periods[activePeriodIndex]
      };
    }
    const currentCAR = getVal("CAR", activePeriodIndex);
    const prevCAR = activePeriodIndex > 0 ? getVal("CAR", activePeriodIndex - 1) : currentCAR;
    return { 
      current: currentCAR, 
      change: currentCAR - prevCAR, 
      period: sectorOverview.periods[activePeriodIndex] 
    };
  }, [selectedTickers, sectorOverview, activePeriodIndex, selectedIndustry]);

  const donutData = useMemo(() => {
    if (selectedTickers.length !== 1 || !sectorOverview) return { assets: [], funding: [], totalAssets: 0 };
    const ticker = selectedTickers[0];
    const getVal = (metric: string) => {
      const item = sectorOverview.metrics[metric]?.find((t: any) => t.ticker === ticker);
      return item ? (item.data[activePeriodIndex] || 0) : 0;
    };
    
    if (selectedIndustry === "Food & Beverage") {
      const cash = getVal("Cash");
      const rec = getVal("Receivables");
      const inv = getVal("Inventories");
      const fa = getVal("Fixed Assets");
      const totalAssets = getVal("Assets");
      const otherAssets = Math.max(0, totalAssets - cash - rec - inv - fa);

      const assets = [
        { name: 'Cash & Equivalents', value: cash, fill: '#2ecc71' },
        { name: 'Accounts Receivables', value: rec, fill: '#3498db' },
        { name: 'Inventories', value: inv, fill: '#e67e22' },
        { name: 'Fixed Assets', value: fa, fill: '#9b59b6' },
        { name: 'Other Assets', value: otherAssets, fill: '#95a5a6' }
      ].filter(d => d.value > 0);

      const stDebt = getVal("ShortTermDebt");
      const ltDebt = getVal("LongTermDebt");
      const equity = getVal("Equity");
      const otherLiab = Math.max(0, totalAssets - equity - stDebt - ltDebt);

      const funding = [
        { name: 'Short-term Debt', value: stDebt, fill: '#e74c3c' },
        { name: 'Long-term Debt', value: ltDebt, fill: '#c0392b' },
        { name: 'Other Liabilities', value: otherLiab, fill: '#95a5a6' },
        { name: 'Owner\'s Equity', value: equity, fill: '#f1c40f' }
      ].filter(d => d.value > 0);

      return { assets, funding, totalAssets };
    }
    
    const loans = getVal("Loans");
    const ibAssets = getVal("Interbank Assets");
    const invSec = getVal("Investment Securities");
    const totalAssets = getVal("Assets");
    const otherAssets = Math.max(0, totalAssets - loans - ibAssets - invSec);
    
    const assets = [
      { name: 'Customer Loans', value: loans, fill: '#4a86e8' },
      { name: 'Interbank Balances', value: ibAssets, fill: '#f39c12' },
      { name: 'Investment Secs', value: invSec, fill: '#2ecc71' },
      { name: 'Other Assets', value: otherAssets, fill: '#95a5a6' }
    ].filter(d => d.value > 0);
    
    const deposits = getVal("Deposits");
    const valPapers = getVal("Valuable Papers");
    const ibBorr = getVal("Interbank Borrowings");
    const equity = getVal("Equity");
    const totalLiab = deposits + valPapers + ibBorr + equity; 
    const otherLiab = Math.max(0, totalAssets - totalLiab);
    
    const funding = [
      { name: 'Customer Deposits', value: deposits, fill: '#4a86e8' },
      { name: 'Valuable Papers', value: valPapers, fill: '#9b59b6' },
      { name: 'Interbank Borrowings', value: ibBorr, fill: '#e74c3c' },
      { name: 'Equity', value: equity, fill: '#f39c12' },
      { name: 'Other Liabilities', value: otherLiab, fill: '#95a5a6' }
    ].filter(d => d.value > 0);
    
    return { assets, funding, totalAssets };
  }, [selectedTickers, sectorOverview, activePeriodIndex, selectedIndustry]);

  const displayTickers = stocks.map(s => s.ticker);
  const colors = [
    "#4a86e8", "#e74c3c", "#f39c12", "#1abc9c", "#9b59b6", 
    "#34495e", "#d4b58e", "#2ecc71", "#e67e22", "#8e44ad", 
    "#16a085", "#27ae60", "#2980b9", "#f1c40f", "#d35400"
  ];

  const sortedParentProfitTickers = useMemo(() => {
    if (!parentProfitAbsData || parentProfitAbsData.length === 0) return displayTickers;
    const latestData = parentProfitAbsData[parentProfitAbsData.length - 1];
    if (!latestData) return displayTickers;
    return [...displayTickers].sort((a, b) => {
      const valA = latestData[a] || 0;
      const valB = latestData[b] || 0;
      return valB - valA;
    });
  }, [displayTickers, parentProfitAbsData]);

  const filteredStocks = stocks.filter(s => s.ticker.toLowerCase().includes(searchTerm.toLowerCase()));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{data.name || data.period}</p>
          {payload.map((p: any) => (
             <p key={p.dataKey} style={{ margin: 0, color: p.color || p.fill || 'var(--text-main)' }}>
               {p.name}: {p.payload.val !== undefined ? formatNumber(p.payload.val) : formatNumber(p.value)} {p.name.includes('Growth') || p.name === 'NIM' || p.name === 'NPL' || p.name === 'CAR' || p.name === 'LLR' ? '%' : ''}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const CustomBubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: '1rem', color: 'var(--accent-color)' }}>{data.ticker}</p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Price: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{new Intl.NumberFormat('en-US').format(data.price)} VND</span></p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>P/E: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{data.pe !== null ? `${data.pe}x` : 'N/A'}</span></p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>EPS Growth: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{data.eps_growth}%</span></p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>P/B: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{data.pb !== null ? `${data.pb}x` : 'N/A'}</span></p>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ROE: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{data.roe}%</span></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Market Cap: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatNumber(data.market_cap / 1e9)}B VND</span></p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="11">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  // Dynamic progress calculation logic
  const isDeepDive = selectedTickers.length === 1;
  const activeLoadingCount = (isDeepDive ? 
    ((valuationLoading ? 1 : 0) + (historyLoading ? 1 : 0)) : 
    ((stocksLoading ? 1 : 0) + (sectorOverviewLoading ? 1 : 0) + (sectorValuationLoading ? 1 : 0))
  );
  const totalLoadingTasks = isDeepDive ? 2 : 3;
  const completedTasks = totalLoadingTasks - activeLoadingCount;
  const isCurrentlyLoading = activeLoadingCount > 0;
  const loadingProgress = isCurrentlyLoading ? Math.round((completedTasks / totalLoadingTasks) * 100) : 100;

  let loadingMessage = "Processing data...";
  if (isDeepDive) {
    if (valuationLoading && historyLoading) {
      loadingMessage = "Loading valuation & historical data...";
    } else if (valuationLoading) {
      loadingMessage = "Analyzing detailed valuation...";
    } else if (historyLoading) {
      loadingMessage = "Loading historical price & volume...";
    }
  } else {
    if (stocksLoading && sectorOverviewLoading) {
      loadingMessage = "Loading stocks list & sector data...";
    } else if (stocksLoading) {
      loadingMessage = "Synchronizing stocks list...";
    } else if (sectorOverviewLoading) {
      loadingMessage = "Analyzing sector financial metrics...";
    } else if (sectorValuationLoading) {
      loadingMessage = "Running sector valuation model...";
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Top Edge Progress Bar */}
      {isCurrentlyLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${loadingProgress}%`,
          height: '4px',
          background: 'linear-gradient(90deg, var(--accent-color) 0%, #3498db 50%, var(--accent-color) 100%)',
          zIndex: 9999,
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px var(--accent-color)'
        }} />
      )}

      {/* Glassmorphic Bottom Loading Toast */}
      {isCurrentlyLoading && (
        <div className="card glass animate-fade-in" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          borderRadius: '12px'
        }}>
          <RefreshCw className="animate-spin" size={18} color="var(--accent-color)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {loadingMessage} ({loadingProgress}%)
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {(error || successMsg) && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {error && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: '#fef2f2', borderLeft: '4px solid #e53e3e', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <AlertCircle size={24} color="#e53e3e" />
              <span style={{ color: '#c53030', fontWeight: 500 }}>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}><X size={16} color="#c53030" /></button>
            </div>
          )}
          {successMsg && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: '#f0fff4', borderLeft: '4px solid #38a169', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <ShieldCheck size={24} color="#38a169" />
              <span style={{ color: '#2f855a', fontWeight: 500 }}>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}><X size={16} color="#2f855a" /></button>
            </div>
          )}
        </div>
      )}

      {/* Floating Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        style={{ position: 'fixed', top: '24px', left: isSidebarOpen ? '260px' : '24px', zIndex: 100, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'left 0.3s ease', color: 'var(--text-secondary)' }}
        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside style={{ width: isSidebarOpen ? '280px' : '0px', opacity: isSidebarOpen ? 1 : 0, overflow: 'hidden', backgroundColor: 'var(--bg-surface)', borderRight: isSidebarOpen ? '1px solid var(--border-color)' : 'none', display: 'flex', flexDirection: 'column', zIndex: 10, transition: 'all 0.3s ease' }}>
        <div style={{ width: '280px', padding: '32px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <BarChart3 size={32} color="var(--accent-color)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>FinData</h1>
          </div>
          
          <button className="btn" style={{ width: '100%', marginBottom: '32px' }} onClick={() => document.getElementById('fileUploadSidebar')?.click()}><UploadCloud size={18} />Upload Data</button>
          <input type="file" id="fileUploadSidebar" accept=".xlsx,.xls" multiple style={{ display: 'none' }} onChange={(e) => { 
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files);
            }
          }} />

          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.05em' }}>ICB Level II Sectors</h3>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {industries.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '12px' }}>No private data uploaded yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {industries.map(ind => (
                  <li key={ind} style={{ marginBottom: '8px' }}>
                    <button onClick={() => { setSelectedIndustry(ind); setSelectedTickers([]); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: selectedIndustry === ind ? 'var(--bg-main)' : 'transparent', color: selectedIndustry === ind ? 'var(--accent-color)' : 'var(--text-primary)', fontWeight: selectedIndustry === ind ? 600 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {ind}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>


      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', overflowX: 'hidden' }}>
        {!selectedIndustry ? (
          /* Upload View */
          <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '60px 20px', marginBottom: '32px', backgroundColor: 'var(--bg-main)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => document.getElementById('fileUpload')?.click()}>
              <UploadCloud size={64} color="var(--accent-color)" style={{ marginBottom: '24px' }} />
              <h2 style={{ marginBottom: '12px', fontSize: '1.8rem' }}>Upload Financial Statement</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0' }}>Securely import Excel formats (.xlsx, .xls) to your workspace.</p>
              <input type="file" id="fileUpload" accept=".xlsx,.xls" multiple style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            {filesToUpload.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', textAlign: 'left', maxHeight: '180px', overflowY: 'auto', padding: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                {filesToUpload.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, marginRight: '12px' }}>
                      <FileSpreadsheet size={16} color="var(--accent-color)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.file.name}>{item.file.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', flexShrink: 0,
                      backgroundColor: item.status === 'success' ? '#e6f4ea' : item.status === 'error' ? '#fce8e6' : item.status === 'uploading' ? '#fef7e0' : '#f1f3f4',
                      color: item.status === 'success' ? '#137333' : item.status === 'error' ? '#c5221f' : item.status === 'uploading' ? '#b06000' : '#5f6368'
                    }}>
                      {item.status === 'success' ? 'Success' : item.status === 'error' ? 'Error' : item.status === 'uploading' ? 'Uploading...' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#e53e3e', marginBottom: '24px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)' }}><AlertCircle size={20} /><span>{error}</span></div>}
            {successMsg && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#38a169', marginBottom: '24px', padding: '12px', backgroundColor: '#f0fff4', borderRadius: 'var(--radius-sm)' }}><AlertCircle size={20} /><span>{successMsg}</span></div>}
            <button className="btn" onClick={() => handleUpload()} disabled={filesToUpload.length === 0 || uploading} style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}>
              {uploading ? 'Processing Data...' : 'Start Secure Import'}
              {!uploading && <ChevronRight size={24} />}
            </button>
          </div>
        ) : (!sectorOverview && sectorOverviewLoading) ? (
          <div className="card glass animate-fade-in" style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <RefreshCw className="animate-spin" size={48} color="var(--accent-color)" />
            <div>
              <h2 style={{ marginBottom: '12px', fontSize: '1.8rem', fontWeight: 700 }}>Loading analytics data...</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0' }}>Please wait a moment while the system extracts and processes sector financial data.</p>
            </div>
          </div>
        ) : !sectorOverview || !sectorOverview.metrics ? (
          <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '60px 40px' }}>
            <AlertCircle size={64} color="#e53e3e" style={{ marginBottom: '24px' }} />
            <h2 style={{ marginBottom: '12px', fontSize: '1.8rem' }}>No Data Available</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0' }}>Please ensure data for this sector has been successfully uploaded and processed.</p>
          </div>
        ) : (
          /* Dashboard View */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '8px' }}>
              {/* Row 1: Title and Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 700 }}>{selectedIndustry}</h2>
                
                <div className="no-print" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Single-select Search Bar */}
                  <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', width: '300px' }}>
                      <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                      {selectedTickers.length === 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{selectedTickers[0]}</span>
                          <div onClick={clearSelection} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', backgroundColor: 'var(--bg-main)', borderRadius: '50%' }}>
                            <X size={14} color="var(--text-primary)" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            placeholder="Search or select a ticker..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                            onClick={() => setShowDropdown(true)}
                            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.95rem' }}
                          />
                          <ChevronDown size={18} color="var(--text-secondary)" />
                        </>
                      )}
                    </div>
                    
                    {showDropdown && selectedTickers.length === 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
                        {filteredStocks.length === 0 ? (
                           <div style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>No tickers found.</div>
                        ) : (
                          filteredStocks.map(stock => (
                            <div 
                              key={stock.ticker} 
                              onClick={() => selectTicker(stock.ticker)}
                              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s ease' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{stock.ticker}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {sectorOverview?.periods && (
                    <select
                      className="dropdown"
                      value={selectedCrossSectionalPeriod || sectorOverview.periods[sectorOverview.periods.length - 1]}
                      onChange={(e) => setSelectedCrossSectionalPeriod(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', outline: 'none' }}
                    >
                      {sectorOverview.periods.map((p: string) => (
                        <option key={p} value={p}>As of: {p}</option>
                      ))}
                    </select>
                  )}

                  <select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value={6}>6 Periods</option>
                    <option value={8}>8 Periods</option>
                    <option value={12}>12 Periods</option>
                  </select>

                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setReportType("Yearly")} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: reportType === "Yearly" ? 'var(--bg-main)' : 'transparent', fontWeight: reportType === "Yearly" ? 600 : 400, color: reportType === "Yearly" ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}>Yearly</button>
                    <button onClick={() => setReportType("Quarterly")} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: reportType === "Quarterly" ? 'var(--bg-main)' : 'transparent', fontWeight: reportType === "Quarterly" ? 600 : 400, color: reportType === "Quarterly" ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}>Quarterly</button>
                  </div>
                </div>
              </div>

              {/* Row 2: Subtitle / Deep Dive */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>
                  {selectedTickers.length === 0 ? "Peer Comparison Dashboard" : `Deep Dive: ${selectedTickers[0]} Company Profile`}
                </p>
                
                {/* Auto Refresh Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {lastRefreshTime && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Refreshed at: <strong style={{ color: 'var(--text-primary)' }}>{lastRefreshTime}</strong>
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={14} className={refreshInterval ? "animate-pulse" : ""} style={{ color: refreshInterval ? '#2ecc71' : 'var(--text-secondary)' }} />
                        Auto-Refresh:
                      </span>
                      <select 
                        value={refreshInterval === null ? 'off' : refreshInterval} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setRefreshInterval(val === 'off' ? null : Number(val));
                        }}
                        style={{ 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--bg-surface)', 
                          color: 'var(--text-primary)', 
                          fontSize: '0.85rem', 
                          fontWeight: 500, 
                          outline: 'none', 
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <option value="30">30m</option>
                        <option value="60">1h</option>
                        <option value="120">2h</option>
                        <option value="180">3h</option>
                        <option value="off">Off</option>
                      </select>
                    </div>

                    {/* Manual Refresh Button */}
                    <button 
                      onClick={() => setRefreshTrigger(prev => prev + 1)}
                      title="Refresh live data now"
                      disabled={valuationLoading || sectorValuationLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        cursor: (valuationLoading || sectorValuationLoading) ? 'not-allowed' : 'pointer',
                        opacity: (valuationLoading || sectorValuationLoading) ? 0.6 : 1,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!valuationLoading && !sectorValuationLoading) {
                          e.currentTarget.style.borderColor = 'var(--accent-color)';
                          e.currentTarget.style.color = 'var(--accent-color)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                    >
                      <RefreshCw size={14} className={valuationLoading || sectorValuationLoading ? "animate-spin" : ""} />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* STATE 1: OVERALL COMPARISON (PEER COMPARISON) */}
            {sectorOverview && selectedTickers.length === 0 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                  {/* Global Stock Filter Selector */}
                  <div className="card" style={{ 
                    padding: '16px 20px', 
                    marginBottom: '24px', 
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="var(--accent-color)" /> Filter Stocks:
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => {
                            setHiddenDataKeys({});
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-color)';
                            e.currentTarget.style.color = 'var(--accent-color)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Show All
                        </button>
                        <button 
                          onClick={() => {
                            const allHidden: Record<string, boolean> = {};
                            displayTickers.forEach(t => {
                              allHidden[t] = true;
                            });
                            setHiddenDataKeys(allHidden);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-color)';
                            e.currentTarget.style.color = 'var(--accent-color)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Hide All
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {displayTickers.map((ticker, idx) => {
                        const color = colors[idx % colors.length];
                        const isHidden = hiddenDataKeys[ticker];
                        return (
                          <div
                            key={ticker}
                            onClick={() => handleLegendClick({ dataKey: ticker })}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 14px',
                              borderRadius: '30px',
                              border: isHidden 
                                ? '1px solid var(--border-color)' 
                                : `1px solid ${color}`,
                              background: isHidden 
                                ? 'transparent' 
                                : `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.08)`,
                              color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)',
                              cursor: 'pointer',
                              fontWeight: isHidden ? 500 : 600,
                              fontSize: '0.85rem',
                              transition: 'all 0.2s ease',
                              opacity: isHidden ? 0.5 : 1,
                              textDecoration: isHidden ? 'line-through' : 'none',
                              userSelect: 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (isHidden) {
                                e.currentTarget.style.borderColor = color;
                                e.currentTarget.style.background = `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.03)`;
                                e.currentTarget.style.opacity = '0.8';
                              } else {
                                e.currentTarget.style.opacity = '0.85';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (isHidden) {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.opacity = '0.5';
                              } else {
                                e.currentTarget.style.opacity = '1';
                              }
                            }}
                          >
                            <span style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: isHidden ? 'var(--text-secondary)' : color,
                              display: 'inline-block'
                            }} />
                            {ticker}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                {/* Module 0: Valuation (P/E vs EPS Growth, P/B vs ROE) */}
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BarChart3 color="var(--accent-color)" /> Valuation (Pricing & Efficiency)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    
                    {/* Bubble Chart 1: PE vs EPS Growth */}
                    <div className="card" style={{ padding: '24px' }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>P/E vs. EPS Growth (%YoY)</h4>
                      <div style={{ width: '100%', height: 350 }}>
                        {sectorValuationLoading ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>Loading valuation data...</div>
                        ) : sectorValuation.length === 0 ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>No valuation data available</div>
                        ) : (
                          <ResponsiveContainer>
                            <ScatterChart margin={{ top: 30, right: 80, bottom: 20, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                              <XAxis type="number" dataKey="eps_growth" name="EPS Growth" unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'EPS Growth (%)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 11 }} />
                              <YAxis type="number" dataKey="pe" name="P/E" tickFormatter={(v) => v + 'x'} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} domain={[0, 'dataMax + 4']} label={{ value: 'P/E (x)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                              <ZAxis type="number" dataKey="market_cap" range={[80, 500]} name="Market Cap" unit="B VND" />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomBubbleTooltip />} />
                              {valuationAnalysis && valuationAnalysis.avgPE !== null && (
                                <ReferenceLine y={valuationAnalysis.avgPE} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Avg PE: ${valuationAnalysis.avgPE.toFixed(1)}x`, fill: '#e74c3c', fontSize: 10, fontWeight: 600, position: 'right' }} />
                              )}
                              {valuationAnalysis && valuationAnalysis.avgEPSGrowth !== null && (
                                <ReferenceLine x={valuationAnalysis.avgEPSGrowth} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Avg Growth: ${valuationAnalysis.avgEPSGrowth.toFixed(1)}%`, fill: '#e74c3c', fontSize: 10, fontWeight: 600, position: 'top' }} />
                              )}
                              <Scatter name="Stock" data={sectorValuation.filter(item => !hiddenDataKeys[item.ticker]).map(item => ({...item, market_cap_bil: item.market_cap / 1e9}))}>
                                {sectorValuation.filter(item => !hiddenDataKeys[item.ticker]).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                                <LabelList dataKey="ticker" position="top" style={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 700 }} />
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Bubble Chart 2: PB vs ROE */}
                    <div className="card" style={{ padding: '24px' }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>P/B vs. ROE (%)</h4>
                      <div style={{ width: '100%', height: 350 }}>
                        {sectorValuationLoading ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>Loading valuation data...</div>
                        ) : sectorValuation.length === 0 ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>No valuation data available</div>
                        ) : (
                          <ResponsiveContainer>
                            <ScatterChart margin={{ top: 30, right: 80, bottom: 20, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                              <XAxis type="number" dataKey="roe" name="ROE" unit="%" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'ROE (%)', position: 'insideBottom', offset: -5, fill: 'var(--text-secondary)', fontSize: 11 }} />
                              <YAxis type="number" dataKey="pb" name="P/B" tickFormatter={(v) => v + 'x'} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} domain={[0, 'dataMax + 0.5']} label={{ value: 'P/B (x)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 11 }} />
                              <ZAxis type="number" dataKey="market_cap" range={[80, 500]} name="Market Cap" unit="B VND" />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomBubbleTooltip />} />
                              {valuationAnalysis && valuationAnalysis.avgPB !== null && (
                                <ReferenceLine y={valuationAnalysis.avgPB} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Avg PB: ${valuationAnalysis.avgPB.toFixed(1)}x`, fill: '#e74c3c', fontSize: 10, fontWeight: 600, position: 'right' }} />
                              )}
                              {valuationAnalysis && valuationAnalysis.avgROE !== null && (
                                <ReferenceLine x={valuationAnalysis.avgROE} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: `Avg ROE: ${valuationAnalysis.avgROE.toFixed(1)}%`, fill: '#e74c3c', fontSize: 10, fontWeight: 600, position: 'top' }} />
                              )}
                              <Scatter name="Stock" data={sectorValuation.filter(item => !hiddenDataKeys[item.ticker]).map(item => ({...item, market_cap_bil: item.market_cap / 1e9}))}>
                                {sectorValuation.filter(item => !hiddenDataKeys[item.ticker]).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                                <LabelList dataKey="ticker" position="top" style={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 700 }} />
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>
                </section>

                {/* Module 1: Profitability (NIM & YOEA) */}
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><Wallet color="var(--accent-color)" /> Profitability</h3>
                  
                  {selectedIndustry === "Banks" && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Net Interest Margin (NIM) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, nimSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={nimSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="NIM" fill="#4a86e8" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Yield on Earning Assets (YOEA) %</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={yoeaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Row 2: ROA & ROE */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Return on Assets (ROA) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, roaSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={roaSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="ROA" fill="#f39c12" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Return on Equity (ROE) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, roeSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={roeSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="ROE" fill="#e74c3c" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Module 2: CASA & COF */}
                {selectedIndustry === "Banks" && (
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><PieChartIcon color="#9b59b6" /> Funding & Costs</h3>
                  
                  {/* CASA & COF Group */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>CASA Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={casaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Cost of Funds (COF) Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={cofData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis domain={[0, 'auto']} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* Module 3: Credit & Growth */}
                {selectedIndustry === "Banks" && (
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><Activity color="#f39c12" /> Credit & Deposit Growth</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Deposit Growth (%YoY)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={depositGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Credit Growth (%YoY)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={creditGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* Module 2: Asset Quality & Liquidity */}
                {selectedIndustry === "Banks" && (
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><Flame color="#e74c3c" /> Asset Quality & Liquidity</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Non-Performing Loan (NPL) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, nplSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={nplSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="NPL" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out">
                              {nplSorted.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.NPL > 3 ? '#e74c3c' : (entry.NPL > 1.5 ? '#f39c12' : '#2ecc71')} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Loan Loss Reserve (LLR) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, llrSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={llrSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="LLR" fill="#e67e22" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* Module 3: Solvency */}
                {selectedIndustry === "Banks" && (
                <section>
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}><ShieldCheck color="#2ecc71" /> Solvency & Liquidity</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Capital Adequacy Ratio (CAR) % - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(350, carSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={carSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} domain={[0, 'dataMax + 2']} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <ReferenceLine x={8} stroke="#e74c3c" strokeDasharray="3 3" label={{ position: 'top', value: 'Basel II (8%)', fill: '#e74c3c', fontSize: 12, fontWeight: 600 }} />
                            <Bar dataKey="CAR" fill="#1abc9c" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Loan to Deposit Ratio (LDR) Trend</h4>
                      <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                          <LineChart data={ldrData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            <Legend iconType="circle" onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((ticker, i) => (
                              <Line key={ticker} type="monotone" dataKey={ticker} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" hide={hiddenDataKeys[ticker]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* Module F&B: Operations & Profitability */}
                {selectedIndustry === "Food & Beverage" && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Row 1: GPM, SG&A Margin & OPM */}
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                    <Activity color="var(--accent-color)" /> F&B Operations & Margins
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Gross Profit Margin & SG&A Margin (%) - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, gpmSorted.length * 50) }}>
                        <ResponsiveContainer>
                          <ComposedChart layout="vertical" data={gpmSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="GPM" name="Gross Profit Margin" fill="#2ecc71" radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={true} animationDuration={500} />
                            <Line type="monotone" dataKey="SGAMargin" name="SG&A Margin" stroke="none" dot={{ fill: '#e67e22', r: 6, stroke: '#e67e22', strokeWidth: 2 }} legendType="circle" isAnimationActive={true} animationDuration={500} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Row 1b: Trends of margins */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Gross Profit Margin (GPM) Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={gpmData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} name={t} hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>SG&A Margin Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={sgaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} name={t} hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Operating Profit Margin (OPM) Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={opmData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} name={t} hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Parent Company Profit & Margins */}
                  <h3 style={{ fontSize: '1.6rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                    <Wallet color="#9b59b6" /> Parent Company Attribution
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Attributable to Parent Company (B VND) - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, netProfitParentSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={netProfitParentSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="NetProfitParent" name="Net Profit Parent (B VND)" fill="#9b59b6" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Net Profit Margin of Parent Company (%) - {sectorOverview.periods[activePeriodIndex]}</h4>
                      <div style={{ width: '100%', height: Math.max(300, parentProfitMarginSorted.length * 35) }}>
                        <ResponsiveContainer>
                          <BarChart layout="vertical" data={parentProfitMarginSorted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis dataKey="name" type="category" interval={0} tick={{ fill: 'var(--text-main)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                            <Bar dataKey="ParentProfitMargin" name="Parent Profit Margin" fill="#e74c3c" radius={[0, 4, 4, 0]} barSize={24} isAnimationActive={true} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Trends of margins */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Attributable to Parent Company Trend (B VND)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={parentProfitAbsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => formatNumber(v) + 'B'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {sortedParentProfitTickers.map((t) => {
                              const originalIndex = displayTickers.indexOf(t);
                              const color = colors[originalIndex !== -1 ? originalIndex : 0];
                              return (
                                <Bar key={t} dataKey={t} fill={color} radius={[4, 4, 0, 0]} isAnimationActive={true} name={t} hide={hiddenDataKeys[t]} />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>Parent Profit Margin Trend (%)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={parentMarginData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} padding={{ left: 20, right: 20 }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v + '%'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} onClick={handleLegendClick} formatter={renderLegendText} />
                            {displayTickers.map((t, i) => (
                              <Line key={t} type="monotone" dataKey={t} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={true} name={t} hide={hiddenDataKeys[t]} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
                )}
                
              </div>
            )}

            {/* STATE 2: DEEP DIVE DASHBOARD (COMPANY PROFILE) */}
            {sectorOverview && selectedTickers.length === 1 && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Dòng -1: Stock Valuation (P/E, P/B) */}
                {(valuation || valuationLoading) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {valuation?.error && (
                      <div style={{ padding: '12px 16px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '8px', color: '#e74c3c', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>Error loading stock valuation: {valuation.error}</span>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {/* Price */}
                    <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(74,134,232,0.15) 0%, rgba(74,134,232,0.05) 100%)', border: '1px solid rgba(74,134,232,0.3)', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #4a86e8, #9b59b6)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Current Price</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#4a86e8', letterSpacing: '-0.02em' }}>
                        {valuationLoading ? '...' : valuation?.price ? new Intl.NumberFormat('en-US').format(valuation.price) : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>VND / share</div>
                    </div>

                    {/* EPS */}
                    <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #1abc9c, #2ecc71)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>EPS</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                        {valuationLoading ? '...' : valuation?.eps ? new Intl.NumberFormat('en-US').format(Math.round(valuation.eps)) : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>VND / share ({valuation?.eps_label || valuation?.period})</div>
                    </div>

                    {/* P/E */}
                    <div className="card" style={{ padding: '20px', background: valuation?.pe && valuation.pe < 15 ? 'linear-gradient(135deg, rgba(46,204,113,0.15) 0%, rgba(46,204,113,0.05) 100%)' : valuation?.pe && valuation.pe > 25 ? 'linear-gradient(135deg, rgba(231,76,60,0.12) 0%, rgba(231,76,60,0.04) 100%)' : undefined, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: valuation?.pe && valuation.pe < 15 ? 'linear-gradient(90deg, #2ecc71, #1abc9c)' : valuation?.pe && valuation.pe > 25 ? 'linear-gradient(90deg, #e74c3c, #e67e22)' : 'linear-gradient(90deg, #f39c12, #e67e22)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>P/E</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: valuation?.pe && valuation.pe < 15 ? '#2ecc71' : valuation?.pe && valuation.pe > 25 ? '#e74c3c' : '#f39c12', letterSpacing: '-0.02em' }}>
                        {valuationLoading ? '...' : valuation?.pe ? `${valuation.pe}x` : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Price / EPS</div>
                    </div>

                    {/* BVPS */}
                    <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #9b59b6, #8e44ad)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>BVPS</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                        {valuationLoading ? '...' : valuation?.bvps ? new Intl.NumberFormat('en-US').format(Math.round(valuation.bvps)) : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>VND / share ({valuation?.period})</div>
                    </div>

                    {/* P/B */}
                    <div className="card" style={{ padding: '20px', background: valuation?.pb && valuation.pb < 1.5 ? 'linear-gradient(135deg, rgba(46,204,113,0.15) 0%, rgba(46,204,113,0.05) 100%)' : valuation?.pb && valuation.pb > 3 ? 'linear-gradient(135deg, rgba(231,76,60,0.12) 0%, rgba(231,76,60,0.04) 100%)' : undefined, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: valuation?.pb && valuation.pb < 1.5 ? 'linear-gradient(90deg, #2ecc71, #1abc9c)' : valuation?.pb && valuation.pb > 3 ? 'linear-gradient(90deg, #e74c3c, #e67e22)' : 'linear-gradient(90deg, #f39c12, #e67e22)' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>P/B</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: valuation?.pb && valuation.pb < 1.5 ? '#2ecc71' : valuation?.pb && valuation.pb > 3 ? '#e74c3c' : '#f39c12', letterSpacing: '-0.02em' }}>
                        {valuationLoading ? '...' : valuation?.pb ? `${valuation.pb}x` : 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Price / BVPS</div>
                    </div>
                  </div>
                </div>
              )}

                {/* Row -0.5: Historical Price & Volume Chart */}
                {selectedTickers.length === 1 && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <h3 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <TrendingUp color="var(--accent-color)" /> Historical Price & Volume Trend
                      </h3>
                      <div style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        background: 'rgba(201, 176, 144, 0.08)', 
                        padding: '4px', 
                        borderRadius: '30px', 
                        border: '1px solid rgba(201, 176, 144, 0.15)' 
                      }}>
                        {["1M", "3M", "5M", "YTD", "1Y", "3Y", "5Y", "ALL"].map((r) => (
                          <button
                            key={r}
                            onClick={() => setHistoryRange(r)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: 'none',
                              background: historyRange === r ? 'var(--accent-color)' : 'transparent',
                              color: historyRange === r ? '#ffffff' : 'var(--text-secondary)',
                              fontSize: '0.8rem',
                              fontWeight: historyRange === r ? 600 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {historyLoading && historyData.length === 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350, color: 'var(--text-secondary)' }}>
                        <div className="animate-pulse">Loading historical data from vnstock...</div>
                      </div>
                    ) : historyData.length === 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350, color: 'var(--text-secondary)' }}>
                        No historical data available for this range
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: 350, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={historyData} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                            <defs>
                              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis 
                              dataKey="time" 
                              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }} 
                              axisLine={false} 
                              tickLine={false} 
                              dy={10} 
                            />
                            <YAxis 
                              yAxisId="price" 
                              tickFormatter={(v) => new Intl.NumberFormat('en-US').format(v)}
                              tick={{ fill: 'var(--text-primary)', fontSize: '0.75rem' }} 
                              axisLine={false} 
                              tickLine={false} 
                              domain={['auto', 'auto']}
                              dx={-10}
                            />
                            <YAxis 
                              yAxisId="volume" 
                              orientation="right" 
                              tickFormatter={(v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v}
                              tick={{ fill: 'var(--text-secondary)', fontSize: '0.75rem' }} 
                              axisLine={false} 
                              tickLine={false} 
                              dx={10}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--bg-surface)', 
                                borderColor: 'var(--border-color)', 
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-md)'
                              }}
                              labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                              formatter={(value: any, name: any) => {
                                if (name === "Closing Price") return [new Intl.NumberFormat('en-US').format(value) + " VND", name];
                                return [new Intl.NumberFormat('en-US').format(value), "Volume"];
                              }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Area 
                              yAxisId="price"
                              type="monotone" 
                              dataKey="close" 
                              name="Closing Price" 
                              stroke="var(--accent-color)" 
                              strokeWidth={2.5}
                              fill="url(#colorClose)" 
                              isAnimationActive={true} 
                              animationDuration={400} 
                            />
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              name="Volume" 
                              fill="rgba(52, 152, 219, 0.2)" 
                              barSize={15}
                              radius={[2, 2, 0, 0]}
                              isAnimationActive={true} 
                              animationDuration={400} 
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Dòng 0: Top KPIs */}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

                  {topKPIs.map((kpi, idx) => (
                    <div key={idx} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>{kpi.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {formatNumber(kpi.value)}B
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                          {kpi.changeYoY !== undefined && kpi.changeYoY !== 0 && (
                            <div style={{ 
                              display: 'flex', alignItems: 'center', gap: '4px', 
                              padding: '4px 8px', borderRadius: '20px', 
                              backgroundColor: kpi.changeYoY > 0 ? '#e8f8f5' : '#fef2f2',
                              color: kpi.changeYoY > 0 ? '#2ecc71' : '#e74c3c',
                              fontWeight: 600, fontSize: '0.8rem'
                            }}>
                              {kpi.changeYoY > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {kpi.changeYoY > 0 ? '+' : ''}{kpi.changeYoY.toFixed(1)}% YoY
                            </div>
                          )}
                          
                          {kpi.change !== 0 && (
                            <div style={{ 
                              display: 'flex', alignItems: 'center', gap: '4px', 
                              padding: '4px 8px', borderRadius: '20px', 
                              backgroundColor: kpi.change > 0 ? '#e8f8f5' : '#fef2f2',
                              color: kpi.change > 0 ? '#2ecc71' : '#e74c3c',
                              fontWeight: 600, fontSize: '0.8rem'
                            }}>
                              {kpi.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}% {kpi.suffix}
                            </div>
                          )}
                          {kpi.change === 0 && kpi.changeYoY === undefined && activePeriodIndex === 0 && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Row 1: Waterfall */}
                <div className="card" style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <TrendingUp color="var(--accent-color)" /> Earnings Waterfall ({sectorOverview.periods[activePeriodIndex]})
                  </h3>
                  <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                      <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tickFormatter={(v) => v >= 1000 ? v/1000 + 'k' : v} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip cursor={{fill: 'var(--bg-main)'}} content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={40} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out">
                          {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>


                {/* Row 2 & Row 2.1: Industry-Specific Layouts (Margins, Solvency, Revenue, Working Capital, NIM, LDR, etc.) */}
                {selectedIndustry === "Food & Beverage" ? (
                  <>
                    {/* Row 2.0 (F&B): Revenue & Net Profit and Margins Trend */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Left: Revenue & Net Profit */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <BarChart3 color="#1abc9c" /> Revenue & Net Profit (B VND)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <BarChart data={revenueNetProfitAbsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar dataKey="Revenue" name="Revenue (Net Sales)" fill="#1abc9c" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={500} />
                              <Bar dataKey="NetProfitParent" name="Net Profit (MI Excluded)" fill="#3498db" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={500} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right: Margins Trend (Profitability) */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Wallet color="#3498db" /> Margins Trend (Profitability)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <LineChart data={marginsTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend onClick={handleLegendClick} formatter={renderLegendText} />
                              <Line type="monotone" dataKey="GPM" name="GPM (%)" stroke="#2ecc71" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["GPM"]} />
                              <Line type="monotone" dataKey="OPM" name="OPM (%)" stroke="#3498db" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["OPM"]} />
                              <Line type="monotone" dataKey="NPM" name="NPM (%)" stroke="#e74c3c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["NPM"]} />
                              <Line type="monotone" dataKey="SGA" name="SG&A (%)" stroke="#e67e22" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["SGA"]} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Row 2.1 (F&B): Working Capital & CCC and Solvency & Coverage */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Left: Working Capital & Cash Conversion Cycle */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Activity color="var(--accent-color)" /> Working Capital & Cash Conversion Cycle
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <LineChart data={workingCapitalTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis tickFormatter={(v) => v + ' d'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend onClick={handleLegendClick} formatter={renderLegendText} />
                              <Line type="monotone" dataKey="ReceivableDays" name="Receivable Days (DSO)" stroke="#3498db" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["ReceivableDays"]} />
                              <Line type="monotone" dataKey="InventoryDays" name="Inventory Days (DIO)" stroke="#e67e22" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["InventoryDays"]} />
                              <Line type="monotone" dataKey="PayableDays" name="Payable Days (DPO)" stroke="#e74c3c" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["PayableDays"]} />
                              <Line type="monotone" dataKey="CCC" name="Cash Conversion Cycle (CCC)" stroke="var(--accent-color)" strokeWidth={3.5} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["CCC"]} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right: Solvency & Coverage (D/E & Interest Expense) */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <PieChartIcon color="#9b59b6" /> Solvency & Coverage (D/E & Interest Expense)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <ComposedChart data={solvencyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis yAxisId="left" tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: '#9b59b6' }} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v + '%'} tick={{ fill: '#3498db' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend onClick={handleLegendClick} formatter={renderLegendText} />
                              <Bar yAxisId="left" dataKey="InterestExpense" name="Interest Expense (B)" fill="rgba(155, 89, 182, 0.4)" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["InterestExpense"]} />
                              <Line yAxisId="right" type="monotone" dataKey="DE" name="D/E (%)" stroke="#3498db" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} hide={hiddenDataKeys["DE"]} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Row 2 (Banks): NIM Trend and Funding & Costs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Left: NIM Trend */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Wallet color="#3498db" /> NIM Trend (Profitability)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <ComposedChart data={nimTrendData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis yAxisId="left" tickFormatter={(v) => v >= 1000 ? v/1000 + 'k' : v} tick={{ fill: '#3498db' }} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v + '%'} tick={{ fill: '#f39c12' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="NII" name="Net Interest Income" fill="#3498db" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <Line yAxisId="right" type="monotone" dataKey="NIM" name="NIM (%)" stroke="#f39c12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right: Funding & Costs (YOEA vs COF) */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <PieChartIcon color="#9b59b6" /> Funding & Costs (YOEA vs COF)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <ComposedChart data={yoeaCofSpreadData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorSpread" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3498db" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#3498db" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Area type="monotone" dataKey="spread" name="Spread" stroke="none" fill="url(#colorSpread)" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <Line type="monotone" dataKey="YOEA" name="YOEA (%)" stroke="#3498db" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <Line type="monotone" dataKey="COF" name="COF (%)" stroke="#e74c3c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Row 2.1 (Banks): LDR & COF Trend and Growth (Credit vs Deposits) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Left: LDR & COF Trend */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Activity color="#3498db" /> Loan to Deposit Ratio (LDR) & Cost of Funds (COF) Trend
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <ComposedChart data={ldrSmlTrendData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis yAxisId="left" tickFormatter={(v) => v + '%'} tick={{ fill: '#3498db' }} axisLine={false} tickLine={false} dx={-10} domain={['auto', 'auto']} />
                              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v + '%'} tick={{ fill: '#f39c12' }} axisLine={false} tickLine={false} dx={10} domain={[0, 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="LDR" name="LDR (%)" fill="#3498db" radius={[4, 4, 0, 0]} barSize={32} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <Line yAxisId="right" type="monotone" dataKey="COF" name="COF (%)" stroke="#f39c12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <ReferenceLine yAxisId="left" y={85} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ position: 'top', value: 'NHNN Limit (85%)', fill: '#e74c3c', fontSize: 11, fontWeight: 600 }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right: Growth (Credit vs Deposits) */}
                      <div className="card">
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <TrendingUp color="#1abc9c" /> Growth (Credit vs Deposits)
                        </h3>
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <LineChart data={growthTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                              <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                              <Line type="monotone" dataKey="CreditGrowth" name="Credit Growth (%)" stroke="#1abc9c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                              <Line type="monotone" dataKey="DepositGrowth" name="Deposit Growth (%)" stroke="#f39c12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Row 2.2: F&B Cash Flow statement charts */}
                {selectedIndustry === "Food & Beverage" && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* Column 1: CFO & FCFE Trend */}
                    <div className="card">
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity color="var(--accent-color)" /> CFO & FCFE Trend (B VND)
                      </h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={cashFlowTrendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis width={75} tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="CFO" name="CFO" stroke="#2ecc71" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} />
                            <Line type="monotone" dataKey="FCFE" name="FCFE" stroke="var(--accent-color)" strokeWidth={3.5} dot={{ r: 5 }} activeDot={{ r: 7 }} strokeDasharray="5 5" isAnimationActive={true} animationDuration={500} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Column 2: CFI & Components */}
                    <div className="card">
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 color="#9b59b6" /> CFI & Components (B VND)
                      </h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <ComposedChart data={cashFlowTrendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis width={75} tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="CFINetCapex" name="Net Capex" fill="#e74c3c" stackId="cfi" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFINetLoans" name="Net Loans/Debt" fill="#1abc9c" stackId="cfi" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFIOther" name="Other Investing" fill="#95a5a6" stackId="cfi" barSize={15} isAnimationActive={true} />
                            <Line type="monotone" dataKey="CFI" name="Total CFI" stroke="#9b59b6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Column 3: CFF & Components */}
                    <div className="card">
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 color="#f39c12" /> CFF & Components (B VND)
                      </h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <ComposedChart data={cashFlowTrendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis width={75} tickFormatter={(v) => formatNumber(v) + 'B'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="CFFShareIssue" name="Share Issue" fill="#2ecc71" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFFShareRepurchase" name="Share Repurchase" fill="#c0392b" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFFNetBorrowing" name="Net Borrowing" fill="#3498db" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFFDividends" name="Dividends Paid" fill="#9b59b6" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFFLease" name="Lease Payments" fill="#7f8c8d" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Bar dataKey="CFFOther" name="Other Financing" fill="#bdc3c7" stackId="cff" barSize={15} isAnimationActive={true} />
                            <Line type="monotone" dataKey="CFF" name="Total CFF" stroke="#f39c12" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 2.2: NPL & LLR vs SML (Asset Quality & Liquidity Risk) */}
                {selectedIndustry === "Banks" && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="card">
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Flame color="#e74c3c" /> NPL vs LLR (Asset Quality)
                      </h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={assetQualityTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis yAxisId="left" tickFormatter={(v) => v + '%'} tick={{ fill: '#e74c3c' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v + '%'} tick={{ fill: '#2ecc71' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="NPL" name="NPL (%)" stroke="#e74c3c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                            <Line yAxisId="right" type="monotone" dataKey="LLR" name="LLR Coverage (%)" stroke="#2ecc71" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} strokeDasharray="5 5" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldCheck color="#2ecc71" /> Short-term Funds for Med/Long-term Loans (SML)
                      </h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <AreaChart data={ldrSmlTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorSml" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#2ecc71" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tickFormatter={(v) => v + '%'} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dx={-10} domain={[0, 'dataMax + 10']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="SML" name="SML (%)" stroke="#2ecc71" strokeWidth={3} fillOpacity={1} fill="url(#colorSml)" isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                            <ReferenceLine y={30} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 4" label={{ position: 'top', value: 'NHNN Limit (<= 30%)', fill: '#e74c3c', fontSize: 11, fontWeight: 600 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 2.5: ROE vs ROA Trend & CAR Widget */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="card">
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <TrendingUp color="#9b59b6" /> ROA & ROE Trend (Profitability)
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <LineChart data={roeRoaTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                          <XAxis dataKey="period" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} dy={10} />
                          <YAxis yAxisId="left" tickFormatter={(v) => v + '%'} tick={{ fill: '#9b59b6' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v + '%'} tick={{ fill: '#e67e22' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="ROE" name="ROE (%)" stroke="#9b59b6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                          <Line yAxisId="right" type="monotone" dataKey="ROA" name="ROA (%)" stroke="#e67e22" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    {selectedIndustry === "Food & Beverage" ? (
                      <>
                        <ShieldCheck size={48} color={carKPI.current < 100 ? '#2ecc71' : carKPI.current < 150 ? '#f39c12' : '#e74c3c'} style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Debt / Equity (Leverage)</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>{carKPI.period}</p>
                        
                        <div style={{ fontSize: '4.5rem', fontWeight: 800, color: carKPI.current < 100 ? '#2ecc71' : carKPI.current < 150 ? '#f39c12' : '#e74c3c', lineHeight: 1 }}>
                          {formatNumber(carKPI.current)}%
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: carKPI.change <= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600, marginTop: '24px' }}>
                          {carKPI.change <= 0 ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                          {carKPI.change > 0 ? '+' : ''}{formatNumber(carKPI.change)}% vs Prev
                        </div>
                        
                        <div style={{ marginTop: '24px', padding: '8px 24px', backgroundColor: carKPI.current < 100 ? '#e8f8f5' : '#fef2f2', color: carKPI.current < 100 ? '#27ae60' : '#e74c3c', borderRadius: '20px', fontSize: '1rem', fontWeight: 600 }}>
                          {carKPI.current < 100 ? 'Low Leverage (Safe < 100%)' : 'High Leverage'}
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={48} color={carKPI.current > 8 ? '#2ecc71' : '#e74c3c'} style={{ marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>CAR (Solvency KPI)</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>{carKPI.period}</p>
                        
                        <div style={{ fontSize: '4rem', fontWeight: 800, color: carKPI.current > 8 ? '#2ecc71' : '#e74c3c', lineHeight: 1 }}>
                          {formatNumber(carKPI.current)}%
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: carKPI.change >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 600, marginTop: '24px' }}>
                          {carKPI.change >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                          {carKPI.change > 0 ? '+' : ''}{formatNumber(carKPI.change)}% vs Prev
                        </div>
                        
                        {carKPI.current > 8 && (
                          <div style={{ marginTop: '24px', padding: '8px 24px', backgroundColor: '#e8f8f5', color: '#27ae60', borderRadius: '20px', fontSize: '1rem', fontWeight: 600 }}>
                            Safe Buffer (Basel II &gt; 8%)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>


                {/* Row 3: Balance Sheet */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <PieChartIcon color="var(--accent-color)" size={20} />
                      Asset Breakdown
                    </h3>
                    <div style={{ width: '100%', height: 350, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Assets</p>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{formatNumber(donutData.totalAssets)}</p>
                      </div>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={donutData.assets} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out">
                            {donutData.assets.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <PieChartIcon color="var(--accent-color)" size={20} />
                      Funding Breakdown
                    </h3>
                    <div style={{ width: '100%', height: 350, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Liab & Equity</p>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{formatNumber(donutData.totalAssets)}</p>
                      </div>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={donutData.funding} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" labelLine={false} label={renderCustomizedLabel} isAnimationActive={true} animationDuration={500} animationEasing="ease-in-out">
                            {donutData.funding.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
