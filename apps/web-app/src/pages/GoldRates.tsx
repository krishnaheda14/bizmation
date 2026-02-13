/**
 * Gold Rates Page
 * 
 * Fetches live gold/silver rates DIRECTLY from free public APIs
 * NO BACKEND REQUIRED - Works standalone on Cloudflare Pages
 * 
 * Pricing: Gold per 10g, Silver per 1kg
 * Includes 9% import duty for Indian market
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

interface GoldRate {
  metalType: string;
  purity: number;
  ratePerGram: number;
  displayRate: number; // Per 10g for gold, per 1kg for silver
  effectiveDate: string;
  source: string;
}

// Free API endpoints (NO API KEYS NEEDED!)
const GOLD_API = 'https://data-asg.goldprice.org/dbXRates/USD';
const CURRENCY_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

// Import duty for India
const IMPORT_DUTY = 1.09; // 9% import duty

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
    addDebugLog('📡 Starting to fetch LIVE gold rates from free APIs...');
    addDebugLog(`🔗 Gold API: ${GOLD_API}`);
    addDebugLog(`🔗 Currency API: ${CURRENCY_API}`);
    
    try {
      // Step 1: Fetch XAU (Gold) and XAG (Silver) prices in USD
      addDebugLog('📞 Fetching precious metals prices (XAU/XAG in USD)...');
      const goldResponse = await fetch(GOLD_API);
      addDebugLog(`📥 Gold API Response Status: ${goldResponse.status} ${goldResponse.statusText}`);
      
      if (!goldResponse.ok) {
        throw new Error(`Gold API returned ${goldResponse.status}: ${goldResponse.statusText}`);
      }

      const goldData = await goldResponse.json();
      addDebugLog(`📦 Gold API Response: ${JSON.stringify(goldData, null, 2)}`);

      // Extract prices (USD per troy ounce)
      const xauPrice = goldData.items?.[0]?.xauPrice || 0; // Gold price in USD
      const xagPrice = goldData.items?.[0]?.xagPrice || 0; // Silver price in USD
      
      addDebugLog(`💰 XAU (Gold): $${xauPrice} per troy ounce`);
      addDebugLog(`💰 XAG (Silver): $${xagPrice} per troy ounce`);

      if (!xauPrice || !xagPrice) {
        throw new Error('Invalid gold/silver prices received from API');
      }

      // Step 2: Fetch USD to INR conversion rate
      addDebugLog('📞 Fetching USD to INR exchange rate...');
      const currencyResponse = await fetch(CURRENCY_API);
      addDebugLog(`📥 Currency API Response Status: ${currencyResponse.status} ${currencyResponse.statusText}`);
      
      if (!currencyResponse.ok) {
        throw new Error(`Currency API returned ${currencyResponse.status}: ${currencyResponse.statusText}`);
      }

      const currencyData = await currencyResponse.json();
      addDebugLog(`📦 Currency API Response: ${JSON.stringify(currencyData, null, 2)}`);

      const usdToInr = currencyData.usd?.inr || 0;
      addDebugLog(`💱 USD to INR rate: ${usdToInr}`);

      if (!usdToInr) {
        throw new Error('Invalid USD to INR rate received from API');
      }

      // Step 3: Calculate rates per gram in INR with 9% import duty
      // 1 troy ounce = 31.1035 grams
      const GRAMS_PER_OUNCE = 31.1035;
      
      // Base rates (before import duty)
      const baseGold24kPerGram = (xauPrice * usdToInr) / GRAMS_PER_OUNCE;
      const baseSilver24kPerGram = (xagPrice * usdToInr) / GRAMS_PER_OUNCE;
      
      // Add 9% import duty for Indian market
      const gold24kPerGram = baseGold24kPerGram * IMPORT_DUTY;
      const silver24kPerGram = baseSilver24kPerGram * IMPORT_DUTY;

      addDebugLog(`🧮 Calculation: (USD per ounce × INR per USD) ÷ 31.1035 grams × 1.09 (import duty)`);
      addDebugLog(`🧮 Gold 24K: (${xauPrice} × ${usdToInr}) ÷ ${GRAMS_PER_OUNCE} × ${IMPORT_DUTY} = ₹${gold24kPerGram.toFixed(2)}/gram`);
      addDebugLog(`🧮 Silver 24K: (${xagPrice} × ${usdToInr}) ÷ ${GRAMS_PER_OUNCE} × ${IMPORT_DUTY} = ₹${silver24kPerGram.toFixed(2)}/gram`);

      // Calculate different purities with display rates
      // Gold: per 10 grams, Silver: per 1 kg (1000 grams)
      const allRates: GoldRate[] = [
        // Gold rates (display per 10g)
        {
          metalType: 'GOLD',
          purity: 24,
          ratePerGram: gold24kPerGram,
          displayRate: gold24kPerGram * 10, // Per 10 grams
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        },
        {
          metalType: 'GOLD',
          purity: 22,
          ratePerGram: (gold24kPerGram * 22) / 24,
          displayRate: ((gold24kPerGram * 22) / 24) * 10, // Per 10 grams
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        },
        {
          metalType: 'GOLD',
          purity: 18,
          ratePerGram: (gold24kPerGram * 18) / 24,
          displayRate: ((gold24kPerGram * 18) / 24) * 10, // Per 10 grams
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        },
        // Silver rates (display per 1kg)
        {
          metalType: 'SILVER',
          purity: 24,
          ratePerGram: silver24kPerGram,
          displayRate: silver24kPerGram * 1000, // Per 1 kg
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        },
        {
          metalType: 'SILVER',
          purity: 22,
          ratePerGram: (silver24kPerGram * 22) / 24,
          displayRate: ((silver24kPerGram * 22) / 24) * 1000, // Per 1 kg
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        },
        {
          metalType: 'SILVER',
          purity: 18,
          ratePerGram: (silver24kPerGram * 18) / 24,
          displayRate: ((silver24kPerGram * 18) / 24) * 1000, // Per 1 kg
          effectiveDate: new Date().toISOString(),
          source: 'Live International Market'
        }
      ];

      addDebugLog(`📊 Successfully calculated ${allRates.length} rates (with 9% import duty)`);
      allRates.forEach(rate => {
        const unit = rate.metalType === 'GOLD' ? '10g' : '1kg';
        addDebugLog(`  ✅ ${rate.metalType}-${rate.purity}K: ₹${rate.displayRate.toFixed(2)}/${unit}`);
      });

      setRates(allRates);
      setLastUpdated(new Date().toLocaleString());
      addDebugLog('✅ All rates updated successfully!');
      
    } catch (error: any) {
      addErrorLog(`Failed to fetch rates: ${error.message}`);
      console.error('Failed to fetch rates:', error);
      // Keep existing rates if we have them
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
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 text-lg mb-3">Live Market Pricing</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300">
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
          <p className="mt-1">Data sources: data-asg.goldprice.org • cdn.jsdelivr.net</p>
        </div>
      </div>
    </div>
  );
};
