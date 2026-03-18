/**
 * Gold Rates Page
 *
 * Fetches live gold/silver rates via the Cloudflare Worker (primary) or
 * fawazahmed0 CDN (fallback).  NO BACKEND REQUIRED.
 *
 * Gold purity grades: 999 (24K), 995 (24K), 916 (22K), 750 (18K) â€” per 10g
 * Silver: 999 only â€” per 1kg
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchLiveMetalRates, fetchWorkerData, type MetalRate, type WorkerData } from '../lib/goldPrices';

interface GoldRate extends MetalRate {}

export const GoldRates: React.FC = () => {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [workerData, setWorkerData] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string>('Unknown');

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev, logMessage]);
  };

  const addErrorLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] âŒ ${message}`;
    console.error(logMessage);
    setErrorLog(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    addDebugLog('ðŸ”§ GoldRates component mounted');
    const workerUrl = import.meta.env.VITE_GOLD_WORKER_URL;
    if (workerUrl) {
      addDebugLog(`âš¡ Cloudflare Worker: ${workerUrl}`);
    } else {
      addDebugLog('ðŸŒ No Worker URL â€” fetching from CDN');
    }
    fetchRates();

    // Auto-refresh every 5 minutes (matches Worker cron interval)
    const interval = setInterval(() => {
      addDebugLog('ðŸ”„ Auto-refresh triggered (5-min interval)');
      fetchRates();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    addDebugLog('ðŸ“¡ Fetching live ratesâ€¦');
    try {
      const [allRates, wData] = await Promise.all([
        fetchLiveMetalRates(),
        fetchWorkerData(),
      ]);
      setRates(allRates as GoldRate[]);
      setWorkerData(wData);
      const src = allRates[0]?.source ?? 'Unknown';
      setSourceLabel(src);
      setLastUpdated(new Date().toLocaleString());
      addDebugLog(`âœ… ${allRates.length} rates fetched â€” source: ${src}`);
      allRates.forEach((rate) => {
        const unit = rate.metalType === 'GOLD' ? '10g' : '1kg';
        addDebugLog(`  ${rate.purityLabel ?? rate.purity} ${rate.metalType}: â‚¹${rate.displayRate.toFixed(0)}/${unit}`);
      });
    } catch (error: any) {
      addErrorLog(`Failed: ${error.message}`);
      if (rates.length === 0) addErrorLog('âš ï¸ No rates available. Check internet connection.');
    } finally {
      setLoading(false);
      addDebugLog('âœ… Fetch operation completed');
    }
  };

  const goldRates = rates.filter((r) => r.metalType === 'GOLD');
  const silverRates = rates.filter((r) => r.metalType === 'SILVER');

  // Colour accent per gold purity
  const goldAccent: Record<number, { border: string; badge: string; text: string }> = {
    999: { border: 'border-yellow-400', badge: 'bg-yellow-500 text-black', text: 'text-yellow-900 dark:text-yellow-100' },
    995: { border: 'border-amber-300', badge: 'bg-amber-400 text-black', text: 'text-amber-900 dark:text-amber-100' },
    916: { border: 'border-orange-300', badge: 'bg-orange-400 text-white', text: 'text-orange-900 dark:text-orange-100' },
    750: { border: 'border-rose-300', badge: 'bg-rose-400 text-white', text: 'text-rose-900 dark:text-rose-100' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-700 bg-clip-text text-transparent flex items-center gap-3">
              <Sparkles className="text-yellow-500" size={36} />
              Live Precious Metal Rates
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'Real-time prices Â· 9% import duty included'}
              <span className="ml-3 inline-block align-middle">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Source: {sourceLabel}
                </span>
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDebug(v => !v)}
              className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-all"
            >
              {showDebug ? 'Hide Debug' : 'Debug'}
            </button>
            <button
              onClick={fetchRates}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Fetchingâ€¦' : 'Refresh Rates'}
            </button>
          </div>
        </div>

        {/* â”€â”€ Market Data Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {workerData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'XAU/USD', value: `$${workerData.xauUsd.toFixed(2)}`, sub: 'Gold per troy oz', color: 'text-yellow-700 dark:text-yellow-400' },
              { label: 'XAG/USD', value: `$${workerData.xagUsd.toFixed(4)}`, sub: 'Silver per troy oz', color: 'text-gray-600 dark:text-gray-300' },
              { label: 'USD/INR', value: `â‚¹${workerData.usdToInr.toFixed(2)}`, sub: 'Exchange rate', color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'XAU/INR', value: `â‚¹${Math.round(workerData.xauInr).toLocaleString('en-IN')}`, sub: 'Gold per troy oz', color: 'text-amber-700 dark:text-amber-400' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* â”€â”€ Debug Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {showDebug && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-xs overflow-auto max-h-80 shadow-2xl mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">ðŸ› Debug Console</h3>
              <button onClick={() => { setDebugInfo([]); setErrorLog([]); }} className="text-red-400 hover:text-red-300 px-3 py-1 bg-red-900/30 rounded">Clear</button>
            </div>
            {errorLog.length > 0 && (
              <div className="mb-3 text-red-400 border-t border-red-800 pt-2">
                <p className="font-bold">âŒ ERRORS ({errorLog.length}):</p>
                {errorLog.map((log, i) => <p key={i}>{log}</p>)}
              </div>
            )}
            <div className="border-t border-gray-700 pt-2">
              <p className="font-bold text-white mb-1">ðŸ“‹ Log ({debugInfo.length}):</p>
              {debugInfo.map((log, i) => <p key={i}>{log}</p>)}
            </div>
          </div>
        )}

        {/* No-rates banner */}
        {rates.length === 0 && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-xl p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200 text-lg mb-1">No Rates Available</h3>
                <p className="text-sm text-red-800 dark:text-red-300">Check your internet connection and click Refresh Rates.</p>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Info Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-8 shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 rounded-lg flex-shrink-0">
              <TrendingUp className="text-white" size={22} />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-amber-800 dark:text-amber-300 flex-1">
              <p className="font-semibold">âœ“ Real-time Cloudflare Worker (5-min KV cache)</p>
              <p className="font-semibold">âœ“ Gold: per 10 grams Â· Silver: per 1 kilogram</p>
              <p className="font-semibold">âœ“ 9% import duty for Indian market</p>
              <p className="font-semibold">âœ“ Silver 999 rate (no hidden surcharge)</p>
            </div>
          </div>
        </div>

        {/* â”€â”€ Gold Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full" />
            Gold Rates
          </h2>
          {goldRates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Loading gold ratesâ€¦' : 'No gold rates available. Click Refresh Rates.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {goldRates.map((rate) => {
                const accent = goldAccent[rate.purity] ?? goldAccent[999];
                return (
                  <div
                    key={`${rate.metalType}-${rate.purity}`}
                    className={`group relative bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${accent.border} overflow-hidden hover:scale-105`}
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-yellow-300/30 to-transparent rounded-full -mr-14 -mt-14 group-hover:scale-150 transition-transform duration-500" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded-full ${accent.badge}`}>
                          {rate.purityLabel ?? `${rate.purity} Gold`}
                        </span>
                        <Sparkles className="text-yellow-500" size={18} />
                      </div>
                      <div className="mb-3">
                        <div className="text-3xl font-extrabold text-yellow-900 dark:text-yellow-100 mb-0.5">
                          â‚¹{rate.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">per 10 grams</div>
                      </div>
                      <div className="pt-3 border-t border-yellow-300 dark:border-yellow-700 flex justify-between items-center text-xs">
                        <span className="text-yellow-600 dark:text-yellow-400">Per gram</span>
                        <span className="font-bold text-yellow-800 dark:text-yellow-200">â‚¹{rate.ratePerGram.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* â”€â”€ Silver Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full" />
            Silver Rates
          </h2>
          {silverRates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Loading silver ratesâ€¦' : 'No silver rates available.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {silverRates.map((rate) => (
                <div
                  key={`${rate.metalType}-${rate.purity}`}
                  className="group relative bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-300 dark:border-gray-600 overflow-hidden hover:scale-105"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-gray-300/30 to-transparent rounded-full -mr-14 -mt-14 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-1 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                        {rate.purityLabel ?? `${rate.purity} Silver`}
                      </span>
                      <TrendingUp className="text-gray-500" size={18} />
                    </div>
                    <div className="mb-3">
                      <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-0.5">
                        â‚¹{rate.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs font-medium">per kilogram</div>
                    </div>
                    <div className="pt-3 border-t border-gray-300 dark:border-gray-700 flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Per gram</span>
                      <span className="font-bold text-gray-700 dark:text-gray-200">â‚¹{rate.ratePerGram.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Gold: 999 Â· 995 Â· 916 (22K) Â· 750 (18K) â€” Prices include 9% import duty</p>
          <p>Silver: 999 purity Â· Prices include 9% import duty</p>
          <p className="flex items-center justify-center gap-1.5">
            Data: Cloudflare Worker â†’
            <a
              href="https://gold-rates-worker.namanchandak750.workers.dev/gold-rates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
            >
              Worker <ExternalLink size={12} />
            </a>
            Â· fawazahmed0 Currency API Â· Swissquote (fallback)
          </p>
        </div>
      </div>
    </div>
  );
};
