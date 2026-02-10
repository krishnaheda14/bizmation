/**
 * Dashboard Home Page
 * 
 * Overview with key metrics and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  Camera,
  Plus,
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
}

export const Dashboard: React.FC = () => {
  const [goldRate, setGoldRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoldRate();
  }, []);

  const fetchGoldRate = async () => {
    try {
      const response = await fetch('/api/gold-rates/current?metalType=GOLD&purity=22');
      const data = await response.json();
      if (data.success) {
        setGoldRate(data.data.ratePerGram);
      }
    } catch (error) {
      console.error('Failed to fetch gold rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics: MetricCard[] = [
    {
      title: 'Today\'s Sales',
      value: '₹0',
      change: '+0%',
      icon: <DollarSign size={24} />,
      color: 'bg-green-500',
    },
    {
      title: 'Inventory Items',
      value: '0',
      change: '0 total',
      icon: <Package size={24} />,
      color: 'bg-blue-500',
    },
    {
      title: 'Gold Rate (22K)',
      value: loading ? '...' : `₹${goldRate.toFixed(2)}`,
      change: 'per gram',
      icon: <TrendingUp size={24} />,
      color: 'bg-yellow-500',
    },
    {
      title: 'Catalog Items',
      value: '0',
      change: '0 listed',
      icon: <Camera size={24} />,
      color: 'bg-purple-500',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Create Invoice',
      description: 'Generate GST-compliant jewelry invoice',
      icon: <ShoppingCart size={32} />,
      action: '/billing',
    },
    {
      title: 'Add to Inventory',
      description: 'Register new jewelry items',
      icon: <Plus size={32} />,
      action: '/inventory',
    },
    {
      title: 'Upload to Catalog',
      description: 'AI-powered product cataloging',
      icon: <Camera size={32} />,
      action: '/catalog',
    },
    {
      title: 'Check Gold Rates',
      description: 'View live metal prices',
      icon: <TrendingUp size={32} />,
      action: '/rates',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${metric.color} text-white p-3 rounded-lg`}>
                {metric.icon}
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">{metric.title}</h3>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">{metric.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{metric.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <a
              key={idx}
              href={`#${action.action}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm mt-2">Start by creating an invoice or adding inventory</p>
        </div>
      </div>
    </div>
  );
};
