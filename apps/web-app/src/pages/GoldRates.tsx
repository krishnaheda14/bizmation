/**
 * Gold Rates Page
 * 
 * View and manage gold/silver rates
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
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    addDebugLog('📡 Starting to fetch gold rates from database...');
    
    try {
      const metals = ['GOLD', 'SILVER'];
      const purities = [24, 22, 18];
      const allRates: GoldRate[] = [];

      addDebugLog(`🔍 Will fetch rates for: ${metals.join(', ')} with purities: ${purities.join('K, ')}K`);

      for (const metal of metals) {
        for (const purity of purities) {
          const url = `/api/gold-rates/current?metalType=${metal}&purity=${purity}`;
          addDebugLog(`📞 Fetching: ${url}`);
          
          try {
            const response = await fetch(url);
            addDebugLog(`📥 Response status for ${metal}-${purity}K: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            addDebugLog(`📦 Response data for ${metal}-${purity}K: ${JSON.stringify(data)}`);
            
            if (data.success && data.data) {
              allRates.push(data.data);
              addDebugLog(`✅ Successfully fetched ${metal}-${purity}K: ₹${data.data.ratePerGram}/gram`);
            } else {
              addErrorLog(`No data returned for ${metal}-${purity}K. Response: ${JSON.stringify(data)}`);
            }
          } catch (fetchError: any) {
            addErrorLog(`Failed to fetch ${metal}-${purity}K: ${fetchError.message}`);
          }
        }
      }

      addDebugLog(`📊 Total rates fetched: ${allRates.length}`);
      setRates(allRates);
      setLastUpdated(new Date().toLocaleString());
      
      if (allRates.length === 0) {
        addErrorLog('⚠️ NO RATES FETCHED! Database might be empty or backend not responding.');
      }
    } catch (error: any) {
      addErrorLog(`Fatal error in fetchRates: ${error.message}`);
      console.error('Failed to fetch rates:', error);
    } finally {
      setLoading(false);
      addDebugLog('✅ Fetch operation completed');
    }
  };

  const fetchLiveRates = async () => {
    if (!confirm('⚠️ This will fetch live gold and silver rates from international markets. Continue?')) {
      return;
    }
    
    setLoading(true);
    addDebugLog('🌍 Starting LIVE fetch from free public endpoints (goldprice.org + currency-api)...');
    
    try {
      const metals = ['GOLD', 'SILVER'];
      const purities = [24, 22, 18];
      let successCount = 0;
      let failCount = 0;
      
      for (const metal of metals) {
        for (const purity of purities) {
          const url = `/api/gold-rates/fetch-live?metalType=${metal}&purity=${purity}`;
          addDebugLog(`📞 Live fetch: ${url}`);
          
          try {
            const response = await fetch(url);
            addDebugLog(`📥 Live fetch response for ${metal}-${purity}K: ${response.status}`);
            
            const data = await response.json();
            addDebugLog(`📦 Live data for ${metal}-${purity}K: ${JSON.stringify(data)}`);
            
            if (data.success) {
              successCount++;
              addDebugLog(`✅ Live fetch SUCCESS for ${metal}-${purity}K`);
            } else {
              failCount++;
              addErrorLog(`Live fetch FAILED for ${metal}-${purity}K: ${data.error || 'Unknown error'}`);
            }
          } catch (fetchError: any) {
            failCount++;
            addErrorLog(`Exception during live fetch ${metal}-${purity}K: ${fetchError.message}`);
          }
        }
      }

      addDebugLog(`📊 Live fetch complete: ${successCount} success, ${failCount} failed`);
      
      if (successCount > 0) {
        alert(`✅ Live rates fetched successfully! (${successCount} rates updated)`);
        await fetchRates();
      } else {
        addErrorLog('❌ All live fetches failed. Check your internet connection and API endpoints.');
        alert('❌ Failed to fetch live rates. Check console for details.');
      }
    } catch (error: any) {
      addErrorLog(`Fatal error in fetchLiveRates: ${error.message}`);
      console.error('Failed to fetch live rates:', error);
      alert('❌ Failed to fetch live rates. Please check your internet connection.');
    } finally {
      setLoading(false);
      addDebugLog('✅ Live fetch operation completed');
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
            onClick={fetchLiveRates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : 'Fetch Live Rates (Manual)'}
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
          
          {/* API Base URL Info */}
          <div className="mb-3 text-yellow-400">
            <p>📡 API Base URL: {window.location.origin}/api/gold-rates</p>
            <p>🔧 Backend should be: http://localhost:3000</p>
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
            <li>• Database might be empty (no rates fetched yet)</li>
            <li>• Backend server might not be running (check http://localhost:3000)</li>
            <li>• Click "Fetch Live Rates" to get fresh data from free public endpoints (data-asg.goldprice.org + jsDelivr currency API)</li>
            <li>• Check the debug console above for detailed error messages</li>
          </ul>
        </div>
      )}

      {/* Gold Rates */}
      <div className="bg-white dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">📌 About Gold Rates</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Rates are fetched from free public endpoints (data-asg.goldprice.org + jsDelivr currency API)</li>
          <li>• Prices include all applicable taxes and charges</li>
          <li>• Auto-updates daily at 9 AM (configurable in backend)</li>
          <li>• Click "Fetch Live Rates" for immediate updates</li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">🔧 Troubleshooting:</p>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
            <li>Ensure backend is running: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">cd apps/backend && npm run dev</code></li>
            <li>Check your internet connection</li>
            <li>Verify free API endpoints are accessible:<br/>
              <span className="ml-4">• data-asg.goldprice.org (Gold/Silver prices)</span><br/>
              <span className="ml-4">• cdn.jsdelivr.net (Currency rates)</span>
            </li>
            <li>Open browser console (F12) to see detailed logs</li>
            <li>Backend logs are in terminal where you ran <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">npm run dev</code></li>
          </ol>
        </div>
        <div className="p-6">
          {goldRates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No gold rates available. Click "Fetch Live Rates" to update.
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
              No silver rates available. Click "Fetch Live Rates" to update.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {silverRates.map((rate) => (
                <div key={`${rate.metalType}-${rate.purity}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
                    {rate.purity}K Silver
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-1">
                    ₹{rate.ratePerGram.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">per gram</div>
                  <div className="mt-3 text-xs text-gray-400">
                    Source: {rate.source}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rate Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📌 About Gold Rates</h3>
          <ul className="text-sm text-blue-800 space-y-1">
          <li>• Rates are fetched from free public endpoints (data-asg.goldprice.org + jsDelivr currency API)</li>
          <li>• Prices include all applicable taxes and charges</li>
          <li>• Auto-updates daily at 9 AM (configurable in backend)</li>
          <li>• Click "Fetch Live Rates" for immediate updates</li>
        </ul>
      </div>
    </div>
  );
};
