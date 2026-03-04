/**
 * Gold Rates Page
 *
 * Fetches live gold/silver rates via CORS-proxied free public APIs.
 * NO BACKEND REQUIRED - Works standalone on Cloudflare Pages.
 *
 * Pricing: Gold per 10g, Silver per 1kg
 * Includes 9% import duty for Indian market
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { fetchLiveMetalRates } from '../lib/goldPrices';

interface GoldRate {
  metalType: string;
  purity: number;
  ratePerGram: number;
  displayRate: number; // Per 10g for gold, per 1kg for silver
  effectiveDate: string;
  source: string;
}

export const GoldRates: React.FC = () => {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false); // Hidden by default
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev, logMessage]);
  };

  const addErrorLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ❌ ${message}`;
    console.error(logMessage);
    setErrorLog(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    addDebugLog('🔧 GoldRates component mounted');
    addDebugLog('🌍 Fetching from FREE public APIs (no backend needed)');
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    addDebugLog('📡 Starting to fetch LIVE gold rates via CORS proxy...');
    try {
      const allRates = await fetchLiveMetalRates();
      setRates(allRates as GoldRate[]);
      setLastUpdated(new Date().toLocaleString());
      addDebugLog(`✅ Fetched ${allRates.length} rates successfully`);
      allRates.forEach((rate) => {
        const unit = rate.metalType === 'GOLD' ? '10g' : '1kg';
        addDebugLog(`  ✅ ${rate.metalType}-${rate.purity}K: ₹${rate.displayRate.toFixed(2)}/${unit}`);
      });
    } catch (error: any) {
      addErrorLog(`Failed to fetch rates: ${error.message}`);
      console.error('Failed to fetch rates:', error);
      if (rates.length === 0) {
        addErrorLog('⚠️ No rates available. Check your internet connection.');
      }
    } finally {
      setLoading(false);
      addDebugLog('✅ Fetch operation completed');
    }
  };

  const goldRates = rates.filter((r) => r.metalType === 'GOLD');
  const silverRates = rates.filter((r) => r.metalType === 'SILVER');

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
              {lastUpdated ? `Last updated: ${lastUpdated}` : 'Real-time international market prices with 9% import duty'}
            </p>
          </div>
          <div className="flex gap-3">
            {showDebug && (
              <button
                onClick={() => setShowDebug(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
              >
                Hide Debug
              </button>
            )}
            <button
              onClick={fetchRates}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Fetching...' : 'Refresh Rates'}
            </button>
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-xs overflow-auto max-h-96 shadow-2xl mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white text-sm">🐛 Debug Console</h3>
              <button
                onClick={() => {
                  setDebugInfo([]);
                  setErrorLog([]);
                  addDebugLog('Console cleared');
                }}
                className="text-red-400 hover:text-red-300 px-3 py-1 bg-red-900/30 rounded"
              >
                Clear
              </button>
            </div>
            
            {errorLog.length > 0 && (
              <div className="mb-3 text-red-400 border-t border-red-800 pt-2">
                <p className="font-bold">❌ ERRORS ({errorLog.length}):</p>
                {errorLog.map((log, i) => (
                  <p key={i}>{log}</p>
                ))}
              </div>
            )}

            <div className="border-t border-gray-700 pt-2">
              <p className="font-bold text-white mb-1">📋 Debug Log ({debugInfo.length}):</p>
              {debugInfo.map((log, i) => (
                <p key={i}>{log}</p>
              ))}
            </div>
          </div>
        )}

        {/* Status Banner */}
        {rates.length === 0 && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-xl p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200 text-lg mb-2">No Rates Available</h3>
                <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Click "Refresh Rates" to fetch latest data</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 rounded-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-lg mb-3">Live Market Pricing</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-800 dark:text-amber-300">
                <div>
                  <p className="font-semibold mb-1">✓ Real-time international market data</p>
                  <p className="font-semibold mb-1">✓ Automatic USD → INR conversion</p>
                  <p className="font-semibold mb-1">✓ Includes 9% import duty</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">✓ Gold: Priced per 10 grams</p>
                  <p className="font-semibold mb-1">✓ Silver: Priced per 1 kilogram</p>
                  <p className="font-semibold mb-1">✓ No API keys required</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gold Rates */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full"></div>
            Gold Rates
          </h2>
          {goldRates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Loading gold rates...' : 'No gold rates available. Click "Refresh Rates" to fetch.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {goldRates.map((rate) => (
                <div 
                  key={`${rate.metalType}-${rate.purity}`} 
                  className="group relative bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-yellow-200 dark:border-yellow-800 overflow-hidden hover:scale-105"
                >
                  {/* Decorative gradient overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-300/30 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-yellow-800 dark:text-yellow-300 text-sm font-bold uppercase tracking-wider">
                        {rate.purity}K Gold
                      </span>
                      <Sparkles className="text-yellow-600" size={20} />
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-4xl font-extrabold text-yellow-900 dark:text-yellow-100 mb-1">
                        ₹{rate.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                        per 10 grams
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-yellow-300 dark:border-yellow-700">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-yellow-600 dark:text-yellow-400">Per gram:</span>
                        <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                          ₹{rate.ratePerGram.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Silver Rates */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full"></div>
            Silver Rates
          </h2>
          {silverRates.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg">
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Loading silver rates...' : 'No silver rates available. Click "Refresh Rates" to fetch.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {silverRates.map((rate) => (
                <div 
                  key={`${rate.metalType}-${rate.purity}`} 
                  className="group relative bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-300 dark:border-gray-700 overflow-hidden hover:scale-105"
                >
                  {/* Decorative gradient overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-300/30 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-800 dark:text-gray-300 text-sm font-bold uppercase tracking-wider">
                        {rate.purity}K Silver
                      </span>
                      <TrendingUp className="text-gray-600" size={20} />
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">
                        ₹{rate.displayRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-gray-700 dark:text-gray-400 text-sm font-medium">
                        per kilogram
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Per gram:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          ₹{rate.ratePerGram.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Prices include 9% import duty for Indian market • Updated in real-time from international markets</p>
          <p className="mt-1">Data sources: Swissquote Public Quotes (XAU/USD, XAG/USD) • fawazahmed0 Currency API (USD→INR)</p>
        </div>
      </div>
    </div>
  );
};
