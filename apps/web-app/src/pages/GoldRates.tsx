/**
 * Gold Rates Page
 * 
 * Fetches live gold/silver rates DIRECTLY from free public APIs
 * NO BACKEND REQUIRED - Works standalone on Cloudflare Pages
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface GoldRate {
  metalType: string;
  purity: number;
  ratePerGram: number;
  effectiveDate: string;
  source: string;
}

// Free API endpoints (NO API KEYS NEEDED!)
const GOLD_API = 'https://data-asg.goldprice.org/dbXRates/USD';
const CURRENCY_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

export const GoldRates: React.FC = () => {
  const [rates, setRates] = useState<GoldRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
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

      // Step 3: Calculate rates per gram in INR
      // 1 troy ounce = 31.1035 grams
      const GRAMS_PER_OUNCE = 31.1035;
      
      const gold24kPerGram = (xauPrice * usdToInr) / GRAMS_PER_OUNCE;
      const silver24kPerGram = (xagPrice * usdToInr) / GRAMS_PER_OUNCE;

      addDebugLog(`🧮 Calculation: (USD per ounce × INR per USD) ÷ 31.1035 grams`);
      addDebugLog(`🧮 Gold 24K: (${xauPrice} × ${usdToInr}) ÷ ${GRAMS_PER_OUNCE} = ₹${gold24kPerGram.toFixed(2)}/gram`);
      addDebugLog(`🧮 Silver 24K: (${xagPrice} × ${usdToInr}) ÷ ${GRAMS_PER_OUNCE} = ₹${silver24kPerGram.toFixed(2)}/gram`);

      // Calculate different purities
      const allRates: GoldRate[] = [
        // Gold rates
        {
          metalType: 'GOLD',
          purity: 24,
          ratePerGram: gold24kPerGram,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        },
        {
          metalType: 'GOLD',
          purity: 22,
          ratePerGram: (gold24kPerGram * 22) / 24,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        },
        {
          metalType: 'GOLD',
          purity: 18,
          ratePerGram: (gold24kPerGram * 18) / 24,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        },
        // Silver rates
        {
          metalType: 'SILVER',
          purity: 24,
          ratePerGram: silver24kPerGram,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        },
        {
          metalType: 'SILVER',
          purity: 22,
          ratePerGram: (silver24kPerGram * 22) / 24,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        },
        {
          metalType: 'SILVER',
          purity: 18,
          ratePerGram: (silver24kPerGram * 18) / 24,
          effectiveDate: new Date().toISOString(),
          source: 'data-asg.goldprice.org + jsDelivr'
        }
      ];

      addDebugLog(`📊 Successfully calculated ${allRates.length} rates`);
      allRates.forEach(rate => {
        addDebugLog(`  ✅ ${rate.metalType}-${rate.purity}K: ₹${rate.ratePerGram.toFixed(2)}/gram`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gold & Silver Rates</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {lastUpdated && `Last updated: ${lastUpdated}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {showDebug ? '🐛 Hide Debug' : '🐛 Show Debug'}
          </button>
          <button
            onClick={fetchRates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh Live Rates'}
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs overflow-auto max-h-96">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white">🐛 Debug Console</h3>
            <button
              onClick={() => {
                setDebugInfo([]);
                setErrorLog([]);
                addDebugLog('Console cleared');
              }}
              className="text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>
          
          {/* API Info */}
          <div className="mb-3 text-yellow-400">
            <p>📡 Fetching DIRECTLY from free APIs (no backend needed):</p>
            <p className="ml-4">🔗 Gold/Silver: {GOLD_API}</p>
            <p className="ml-4">🔗 Currency: {CURRENCY_API}</p>
            <p className="mt-2">✅ NO API KEYS REQUIRED!</p>
          </div>

          {/* Error Log */}
          {errorLog.length > 0 && (
            <div className="mb-3 text-red-400 border-t border-red-800 pt-2">
              <p className="font-bold">❌ ERRORS ({errorLog.length}):</p>
              {errorLog.map((log, i) => (
                <p key={i}>{log}</p>
              ))}
            </div>
          )}

          {/* Debug Log */}
          <div className="border-t border-gray-700 pt-2">
            <p className="font-bold text-white mb-1">📋 Debug Log ({debugInfo.length}):</p>
            {debugInfo.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              debugInfo.map((log, i) => (
                <p key={i}>{log}</p>
              ))
            )}
          </div>
        </div>
      )}

      {/* Status Banner */}
      {rates.length === 0 && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">⚠️ No Gold Rates Available</h3>
          <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
            <li>• Check your internet connection</li>
            <li>• Verify free API endpoints are accessible (check debug console)</li>
            <li>• Click "Refresh Live Rates" to try again</li>
            <li>• Open browser console (F12) for detailed error messages</li>
          </ul>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">📌 About Gold Rates</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Rates fetched DIRECTLY from free public APIs (no backend needed)</li>
          <li>• Live international market data (XAU/XAG)</li>
          <li>• Automatic USD → INR conversion</li>
          <li>• NO API KEYS required - completely free!</li>
          <li>• Data sources:
            <ul className="ml-6 mt-1 space-y-1">
              <li>→ data-asg.goldprice.org (Gold/Silver prices)</li>
              <li>→ cdn.jsdelivr.net (Currency exchange)</li>
            </ul>
          </li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">🔧 How It Works:</p>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Fetch XAU (gold) price in USD per troy ounce</li>
            <li>Fetch XAG (silver) price in USD per troy ounce</li>
            <li>Fetch USD to INR exchange rate</li>
            <li>Calculate: (USD per ounce × INR per USD) ÷ 31.1035 grams</li>
            <li>Calculate different purities: 22K = (24K × 22) ÷ 24</li>
          </ol>
        </div>
      </div>

      {/* Gold Rates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} />
            Gold Rates (INR per gram)
          </h2>
        </div>
        <div className="p-6">
          {goldRates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              {loading ? 'Loading...' : 'No gold rates available. Click "Refresh Live Rates" to fetch.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {goldRates.map((rate) => (
                <div key={`${rate.metalType}-${rate.purity}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                    {rate.purity}K Gold
                  </div>
                  <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                    ₹{rate.ratePerGram.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">per gram</div>
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                    Source: {rate.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Silver Rates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-gray-400 to-gray-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} />
            Silver Rates (INR per gram)
          </h2>
        </div>
        <div className="p-6">
          {silverRates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              {loading ? 'Loading...' : 'No silver rates available. Click "Refresh Live Rates" to fetch.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {silverRates.map((rate) => (
                <div key={`${rate.metalType}-${rate.purity}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                    {rate.purity}K Silver
                  </div>
                  <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
                    ₹{rate.ratePerGram.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">per gram</div>
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                    Source: {rate.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
