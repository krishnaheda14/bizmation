/**
 * Stock on Hand  
 * 
 * View current stock levels and valuation
 */

import React, { useState } from 'react';
import { Package, Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface StockItem {
  id: string;
  itemName: string;
  sku: string;
  category: string;
  metalType: string;
  purity: number;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  unitPrice: number;
  totalValue: number;
  location: string;
  reorderLevel: number;
}

export const StockOnHand: React.FC = () => {
  const [stockItems] = useState<StockItem[]>([
    {
      id: '1',
      itemName: '22K Gold Mangalsutra Chain',
      sku: 'GM-22K-001',
      category: 'Mangalsutra',
      metalType: 'GOLD',
      purity: 22,
      quantity: 5,
      grossWeight: 77.5,
      netWeight: 74.0,
      unitPrice: 425000,
      totalValue: 2125000,
      location: 'Counter-1',
      reorderLevel: 3,
    },
    {
      id: '2',
      itemName: 'Silver Anklet Pair (Payal)',
      sku: 'SA-925-002',
      category: 'Anklet',
      metalType: 'SILVER',
      purity: 92.5,
      quantity: 12,
      grossWeight: 540.0,
      netWeight: 540.0,
      unitPrice: 8500,
      totalValue: 102000,
      location: 'Counter-2',
      reorderLevel: 5,
    },
    {
      id: '3',
      itemName: 'Diamond Necklace Set',
      sku: 'DN-18K-003',
      category: 'Necklace',
      metalType: 'GOLD',
      purity: 18,
      quantity: 2,
      grossWeight: 65.0,
      netWeight: 56.0,
      unitPrice: 850000,
      totalValue: 1700000,
      location: 'Vault',
      reorderLevel: 1,
    },
    {
      id: '4',
      itemName: 'Gold Bangles (Set of 4)',
      sku: 'GB-22K-004',
      category: 'Bangles',
      metalType: 'GOLD',
      purity: 22,
      quantity: 8,
      grossWeight: 416.0,
      netWeight: 416.0,
      unitPrice: 225000,
      totalValue: 1800000,
      location: 'Counter-1',
      reorderLevel: 4,
    },
    {
      id: '5',
      itemName: 'Gold Chain (24 inch)',
      sku: 'GC-22K-006',
      category: 'Chain',
      metalType: 'GOLD',
      purity: 22,
      quantity: 15,
      grossWeight: 277.5,
      netWeight: 277.5,
      unitPrice: 95000,
      totalValue: 1425000,
      location: 'Counter-2',
      reorderLevel: 8,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [metalFilter, setMetalFilter] = useState<string>('All');

  const filteredStock = stockItems.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesMetal = metalFilter === 'All' || item.metalType === metalFilter;
    return matchesSearch && matchesCategory && matchesMetal;
  });

  const stats = {
    totalItems: stockItems.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: stockItems.reduce((sum, item) => sum + item.totalValue, 0),
    goldItems: stockItems.filter((item) => item.metalType === 'GOLD').reduce((sum, item) => sum + item.quantity, 0),
    silverItems: stockItems.filter((item) => item.metalType === 'SILVER').reduce((sum, item) => sum + item.quantity, 0),
    lowStock: stockItems.filter((item) => item.quantity <= item.reorderLevel).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Package className="text-purple-600 dark:text-purple-400" />
            Stock on Hand
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Current inventory levels and valuation
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={20} className="text-blue-600 dark:text-blue-400" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Items</p>
          </div>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₹{(stats.totalValue / 1000000).toFixed(2)}M
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Gold Items</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.goldItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Silver Items</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.silverItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Low Stock</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lowStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by item name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Categories</option>
            <option value="Ring">Ring</option>
            <option value="Necklace">Necklace</option>
            <option value="Earrings">Earrings</option>
            <option value="Bangles">Bangles</option>
            <option value="Chain">Chain</option>
            <option value="Mangalsutra">Mangalsutra</option>
            <option value="Anklet">Anklet</option>
          </select>
          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Metals</option>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Metal/Purity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Weight (g)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStock.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.itemName}</div>
                    {item.quantity <= item.reorderLevel && (
                      <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
                        <AlertCircle size={12} />
                        Low Stock
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">{item.metalType}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.purity}K</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-bold ${item.quantity <= item.reorderLevel ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">{item.grossWeight.toFixed(3)}g</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Net: {item.netWeight.toFixed(3)}g</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                    ₹{item.unitPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600 dark:text-green-400">
                    ₹{item.totalValue.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
