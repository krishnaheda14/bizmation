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

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const metals = ['GOLD', 'SILVER'];
      const purities = [24, 22, 18];
      const allRates: GoldRate[] = [];

      for (const metal of metals) {
        for (const purity of purities) {
          const response = await fetch(
            `/api/gold-rates/current?metalType=${metal}&purity=${purity}`
          );
          const data = await response.json();
          if (data.success && data.data) {
            allRates.push(data.data);
          }
        }
      }

      setRates(allRates);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Failed to fetch rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveRates = async () => {
    if (!confirm('⚠️ This will fetch live gold and silver rates from international markets. Continue?')) {
      return;
    }
    
    setLoading(true);
    try {
      const metals = ['GOLD', 'SILVER'];
      const purities = [24, 22, 18];
      
      for (const metal of metals) {
        for (const purity of purities) {
          await fetch(
            `/api/gold-rates/fetch-live?metalType=${metal}&purity=${purity}`
          );
        }
      }

      alert('✅ Live rates fetched successfully!');
      await fetchRates();
    } catch (error) {
      console.error('Failed to fetch live rates:', error);
      alert('❌ Failed to fetch live rates. Please check your internet connection.');
    } finally {
      setLoading(false);
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
        <button
          onClick={fetchLiveRates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching...' : 'Fetch Live Rates (Manual)'}
        </button>
      </div>

      {/* Gold Rates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} />
            Gold Rates (INR per gram)
          </h2>
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
          <li>• Rates are fetched from GoldAPI.io (live market data)</li>
          <li>• Prices include all applicable taxes and charges</li>
          <li>• Auto-updates daily at 9 AM (configurable in backend)</li>
          <li>• Click "Fetch Live Rates" for immediate updates</li>
        </ul>
      </div>
    </div>
  );
};
