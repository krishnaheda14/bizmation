/**
 * AI Insights Page
 * 
 * Analytics dashboard showing sales insights, top products, categories, locations
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  MapPin,
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface SalesInsight {
  totalSales: number;
  totalRevenue: number;
  avgOrderValue: number;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    totalSold: number;
    revenue: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  topLocations: Array<{
    location: string;
    count: number;
    revenue: number;
  }>;
  recentTrends: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<SalesInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    fetchInsights();
  }, [dateRange]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/insights?days=${dateRange}`);
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI Insights</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Data-driven business intelligence</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Sales</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {insights?.totalSales || 0}
              </p>
            </div>
            <ShoppingBag className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                ₹{(insights?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Order Value</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                ₹{(insights?.avgOrderValue || 0).toLocaleString()}
              </p>
            </div>
            <BarChart3 className="text-purple-500" size={40} />
          </div>
        </div>
      </div>

      {/* Top 3 Selling Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award size={24} />
            Top 3 Selling Products
          </h2>
        </div>
        <div className="p-6">
          {insights?.topProducts && insights.topProducts.length > 0 ? (
            <div className="space-y-4">
              {insights.topProducts.slice(0, 3).map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{product.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{product.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white">{product.totalSold} sold</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ₹{product.revenue.toLocaleString()} revenue
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No sales data available</p>
          )}
        </div>
      </div>

      {/* Top Categories & Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package size={24} />
              Top Categories
            </h2>
          </div>
          <div className="p-6">
            {insights?.topCategories && insights.topCategories.length > 0 ? (
              <div className="space-y-3">
                {insights.topCategories.map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-white capitalize">
                        {cat.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-white">{cat.count} items</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ₹{cat.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No category data</p>
            )}
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin size={24} />
              Top Locations
            </h2>
          </div>
          <div className="p-6">
            {insights?.topLocations && insights.topLocations.length > 0 ? (
              <div className="space-y-3">
                {insights.topLocations.map((loc, index) => (
                  <div key={loc.location} className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-300 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {loc.location}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 dark:text-white">{loc.count} orders</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ₹{loc.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No location data</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={24} />
          AI-Powered Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <h3 className="font-semibold mb-2">📈 Growth Opportunity</h3>
            <p className="text-sm">
              {insights?.topCategories && insights.topCategories.length > 0
                ? `${insights.topCategories[0].category} category is trending. Consider expanding inventory.`
                : 'Expand your product catalog to increase sales.'}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <h3 className="font-semibold mb-2">🎯 Focus Area</h3>
            <p className="text-sm">
              {insights?.topLocations && insights.topLocations.length > 0
                ? `${insights.topLocations[0].location} generates highest revenue. Optimize regional marketing.`
                : 'Track customer locations to identify high-value regions.'}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <h3 className="font-semibold mb-2">💡 Smart Insight</h3>
            <p className="text-sm">
              {insights?.avgOrderValue
                ? insights.avgOrderValue > 50000
                  ? 'High AOV detected! Focus on premium catalog expansion.'
                  : 'Consider bundling products to increase average order value.'
                : 'Start collecting sales data for personalized insights.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
