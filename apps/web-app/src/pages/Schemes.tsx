/**
 * Schemes Management
 * 
 * Manage gold saving schemes, monthly installment tracking
 * Popular feature in Indian jewelry retail
 */

import React, { useState } from 'react';
import { Coins, Plus, Search, TrendingUp, Calendar, Users } from 'lucide-react';

interface Scheme {
  id: string;
  schemeNo: string;
  customerName: string;
  customerPhone: string;
  schemeType: 'Gold Savings' | 'Diamond Scheme' | 'Platinum Scheme';
  monthlyInstallment: number;
  totalMonths: number;
  paidMonths: number;
  startDate: Date;
  maturityDate: Date;
  totalPaid: number;
  bonusPercentage: number;
  status: 'Active' | 'Matured' | 'Closed' | 'Defaulted';
}

export const Schemes: React.FC = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([
    {
      id: '1',
      schemeNo: 'SCH001',
      customerName: 'Priya Sharma',
      customerPhone: '+91-9876543210',
      schemeType: 'Gold Savings',
      monthlyInstallment: 5000,
      totalMonths: 11,
      paidMonths: 8,
      startDate: new Date('2025-06-01'),
      maturityDate: new Date('2026-05-01'),
      totalPaid: 40000,
      bonusPercentage: 10,
      status: 'Active',
    },
    {
      id: '2',
      schemeNo: 'SCH002',
      customerName: 'Rajesh Patel',
      customerPhone: '+91-9876543211',
      schemeType: 'Gold Savings',
      monthlyInstallment: 10000,
      totalMonths: 11,
      paidMonths: 11,
      startDate: new Date('2025-03-01'),
      maturityDate: new Date('2026-02-01'),
      totalPaid: 110000,
      bonusPercentage: 10,
      status: 'Matured',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statusColors = {
    'Active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Matured': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Defaulted': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch =
      scheme.schemeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || scheme.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: schemes.length,
    active: schemes.filter((s) => s.status === 'Active').length,
    matured: schemes.filter((s) => s.status === 'Matured').length,
    totalAmount: schemes.reduce((sum, s) => sum + s.totalPaid, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Coins className="text-yellow-600 dark:text-yellow-400" />
            Schemes Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gold savings schemes & monthly installment tracking
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold"
        >
          <Plus size={20} />
          New Scheme
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-600 dark:text-blue-400" size={24} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Schemes</p>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Matured</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.matured}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="text-yellow-600 dark:text-yellow-400" size={24} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            ₹{stats.totalAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by scheme number, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Matured">Matured</option>
            <option value="Closed">Closed</option>
            <option value="Defaulted">Defaulted</option>
          </select>
        </div>
      </div>

      {/* Schemes List */}
      <div className="space-y-4">
        {filteredSchemes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Coins size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No schemes found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {schemes.length === 0 ? 'Create your first scheme' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          filteredSchemes.map((scheme) => {
            const progress = (scheme.paidMonths / scheme.totalMonths) * 100;
            const bonusAmount = (scheme.totalPaid * scheme.bonusPercentage) / 100;
            const totalValue = scheme.totalPaid + bonusAmount;

            return (
              <div key={scheme.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">{scheme.schemeNo}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[scheme.status]}`}>
                        {scheme.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">{scheme.customerName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{scheme.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Maturity Date</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {scheme.maturityDate.toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{scheme.schemeType}</span>
                    <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                      {scheme.paidMonths} / {scheme.totalMonths} months
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{progress.toFixed(0)}% completed</p>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-white">
                      ₹{scheme.monthlyInstallment.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{scheme.totalPaid.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bonus ({scheme.bonusPercentage}%)</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{bonusAmount.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      ₹{totalValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Record Payment
                  </button>
                  <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                    Print
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
