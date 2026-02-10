/**
 * Stock Movement
 * 
 * Track all inventory movements (in/out/transfer)
 */

import React, { useState } from 'react';
import { ArrowRightLeft, Search, ArrowUp, ArrowDown, RefreshCw, Calendar } from 'lucide-react';

interface StockMovement {
  id: string;
  date: Date;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  itemName: string;
  sku: string;
  quantity: number;
  weight: number;
  from: string;
  to: string;
  reference: string;
  reason: string;
  performedBy: string;
}

export const StockMovement: React.FC = () => {
  const [movements] = useState<StockMovement[]>([
    {
      id: '1',
      date: new Date('2026-02-10T10:30:00'),
      type: 'IN',
      itemName: '22K Gold Mangalsutra Chain',
      sku: 'GM-22K-001',
      quantity: 5,
      weight: 77.5,
      from: 'Mumbai Bullion Traders',
      to: 'Main Store - Counter-1',
      reference: 'PO-2026-001',
      reason: 'Purchase Order Receipt',
      performedBy: 'Admin',
    },
    {
      id: '2',
      date: new Date('2026-02-10T11:15:00'),
      type: 'OUT',
      itemName: 'Diamond Necklace Set',
      sku: 'DN-18K-003',
      quantity: 1,
      weight: 32.5,
      from: 'Main Store - Vault',
      to: 'Customer - Priya Sharma',
      reference: 'INV-2026-045',
      reason: 'Sales',
      performedBy: 'Salesperson 1',
    },
    {
      id: '3',
      date: new Date('2026-02-10T14:20:00'),
      type: 'TRANSFER',
      itemName: 'Silver Anklet Pair (Payal)',
      sku: 'SA-925-002',
      quantity: 3,
      weight: 135.0,
      from: 'Main Store - Counter-2',
      to: 'Branch Store - Counter-1',
      reference: 'TRF-2026-012',
      reason: 'Stock Transfer',
      performedBy: 'Store Manager',
    },
    {
      id: '4',
      date: new Date('2026-02-09T16:45:00'),
      type: 'ADJUSTMENT',
      itemName: 'Gold Bangles (Set of 4)',
      sku: 'GB-22K-004',
      quantity: -1,
      weight: -52.0,
      from: 'Main Store - Counter-1',
      to: 'N/A',
      reference: 'ADJ-2026-003',
      reason: 'Stock Reconciliation - Physical count mismatch',
      performedBy: 'Admin',
    },
    {
      id: '5',
      date: new Date('2026-02-09T09:00:00'),
      type: 'IN',
      itemName: 'Gold Chain (24 inch)',
      sku: 'GC-22K-006',
      quantity: 10,
      weight: 185.0,
      from: 'Chennai Gold Mart',
      to: 'Main Store - Counter-2',
      reference: 'PO-2026-002',
      reason: 'Purchase Order Receipt',
      performedBy: 'Admin',
    },
    {
      id: '6',
      date: new Date('2026-02-08T15:30:00'),
      type: 'OUT',
      itemName: 'Temple Jewellery Earrings',
      sku: 'CAT007',
      quantity: 1,
      weight: 12.5,
      from: 'Main Store - Counter-1',
      to: 'Customer - Rajesh Kumar',
      reference: 'INV-2026-042',
      reason: 'Sales',
      performedBy: 'Salesperson 2',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('7days');

  const typeColors = {
    'IN': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'OUT': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'TRANSFER': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'ADJUSTMENT': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const typeIcons = {
    'IN': <ArrowDown size={16} />,
    'OUT': <ArrowUp size={16} />,
    'TRANSFER': <ArrowRightLeft size={16} />,
    'ADJUSTMENT': <RefreshCw size={16} />,
  };

  const getDateFilter = () => {
    const now = new Date();
    const days = parseInt(dateFilter.replace('days', ''));
    const filterDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return filterDate;
  };

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.reference.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || movement.type === typeFilter;
    const matchesDate = dateFilter === 'all' || movement.date >= getDateFilter();
    return matchesSearch && matchesType && matchesDate;
  });

  const stats = {
    totalMovements: filteredMovements.length,
    inMovements: filteredMovements.filter((m) => m.type === 'IN').length,
    outMovements: filteredMovements.filter((m) => m.type === 'OUT').length,
    transfers: filteredMovements.filter((m) => m.type === 'TRANSFER').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <ArrowRightLeft className="text-indigo-600 dark:text-indigo-400" />
            Stock Movement
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all inventory movements and transactions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Movements</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalMovements}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Stock In</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.inMovements}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="text-red-600 dark:text-red-400" size={20} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Stock Out</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outMovements}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="text-blue-600 dark:text-blue-400" size={20} />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Transfers</p>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.transfers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by item name, SKU, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Types</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
            <option value="TRANSFER">Transfer</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qty / Weight</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">
                      {movement.date.toLocaleDateString('en-IN')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {movement.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${typeColors[movement.type]}`}>
                      {typeIcons[movement.type]}
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{movement.itemName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{movement.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`font-bold ${movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.abs(movement.weight).toFixed(3)}g
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{movement.from}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{movement.to}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-blue-600 dark:text-blue-400 font-medium">{movement.reference}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{movement.reason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{movement.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
