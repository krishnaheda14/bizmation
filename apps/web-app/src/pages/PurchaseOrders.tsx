/**
 * Purchase Orders Management
 * 
 * Track purchase orders from suppliers
 */

import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, Calendar, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  orderNo: string;
  invoiceNo: string;
  supplier: string;
  date: Date;
  receivedDate?: Date;
  createdOn: Date;
  billDiscount: number;
  roundingOff: number;
  grandAmount: number;
  receivedAmount: number;
  store: string;
  status: 'Pending' | 'Partially Received' | 'Received' | 'Cancelled';
  notes: string;
  updatedAt: Date;
}

export const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([
    {
      id: '1',
      orderNo: 'PO-2026-001',
      invoiceNo: 'INV-MB-1234',
      supplier: 'Mumbai Bullion Traders',
      date: new Date('2026-02-08'),
      receivedDate: new Date('2026-02-09'),
      createdOn: new Date('2026-02-07'),
      billDiscount: 5000,
      roundingOff: -12,
      grandAmount: 285000,
      receivedAmount: 285000,
      store: 'Main Store',
      status: 'Received',
      notes: 'Urgent order for wedding season',
      updatedAt: new Date('2026-02-09'),
    },
    {
      id: '2',
      orderNo: 'PO-2026-002',
      invoiceNo: 'INV-CG-5678',
      supplier: 'Chennai Gold Mart',
      date: new Date('2026-02-10'),
      createdOn: new Date('2026-02-09'),
      billDiscount: 2000,
      roundingOff: 8,
      grandAmount: 150000,
      receivedAmount: 75000,
      store: 'Main Store',
      status: 'Partially Received',
      notes: 'Payment terms: 50% advance, 50% on delivery',
      updatedAt: new Date('2026-02-10'),
    },
    {
      id: '3',
      orderNo: 'PO-2026-003',
      invoiceNo: 'INV-DG-9012',
      supplier: 'Delhi Gems & Jewellers',
      date: new Date('2026-02-10'),
      createdOn: new Date('2026-02-10'),
      billDiscount: 0,
      roundingOff: 0,
      grandAmount: 425000,
      receivedAmount: 0,
      store: 'Branch Store',
      status: 'Pending',
      notes: '',
      updatedAt: new Date('2026-02-10'),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Partially Received': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Received': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusIcons = {
    'Pending': <Clock size={16} />,
    'Partially Received': <Calendar size={16} />,
    'Received': <CheckCircle size={16} />,
    'Cancelled': <XCircle size={16} />,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'Pending').length,
    received: orders.filter((o) => o.status === 'Received').length,
    totalAmount: orders.reduce((sum, o) => sum + o.grandAmount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <ShoppingCart className="text-green-600 dark:text-green-400" />
            Purchase Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage supplier purchase orders
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          <Plus size={20} />
          New Purchase Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Received</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.received}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Amount</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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
              placeholder="Search by order number, invoice number, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grand Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{order.orderNo}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{order.store}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{order.invoiceNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{order.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-white">{order.date.toLocaleDateString('en-IN')}</div>
                    {order.receivedDate && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Received: {order.receivedDate.toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-gray-900 dark:text-white">
                      ₹{order.grandAmount.toLocaleString('en-IN')}
                    </div>
                    {order.billDiscount > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Disc: ₹{order.billDiscount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      ₹{order.receivedAmount.toLocaleString('en-IN')}
                    </div>
                    {order.receivedAmount < order.grandAmount && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        Due: ₹{(order.grandAmount - order.receivedAmount).toLocaleString('en-IN')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusColors[order.status]}`}>
                      {statusIcons[order.status]}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3">
                      View
                    </button>
                    <button className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">No purchase orders found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            {orders.length === 0 ? 'Create your first purchase order' : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </div>
  );
};
