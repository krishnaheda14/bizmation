/**
 * Suppliers Management Page
 * 
 * Manage supplier information and accounts
 */

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Phone, Mail, MapPin, DollarSign, Edit, Trash2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  state: string;
  address: string;
  gstin?: string;
  balance: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
}

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 'SUP001',
      name: 'Mumbai Bullion Traders',
      contactPerson: 'Ramesh Gupta',
      mobile: '+91-22-12345678',
      email: 'ramesh@mumbaibullion.com',
      state: 'Maharashtra',
      address: 'Shop 12, Zaveri Bazaar, Mumbai',
      gstin: '27CCCCC0000C1Z5',
      balance: 125000,
      totalPurchases: 2850000,
      lastPurchaseDate: '2026-02-08',
    },
    {
      id: 'SUP002',
      name: 'Chennai Gold Mart',
      contactPerson: 'Venkatesh Iyer',
      mobile: '+91-44-87654321',
      email: 'venkat@chennaigold.com',
      state: 'Tamil Nadu',
      address: '23, T Nagar Main Road, Chennai',
      gstin: '33DDDDD0000D1Z5',
      balance: 85000,
      totalPurchases: 1950000,
      lastPurchaseDate: '2026-02-05',
    },
    {
      id: 'SUP003',
      name: 'Delhi Gems & Jewellers',
      contactPerson: 'Suresh Sharma',
      mobile: '+91-11-98765432',
      email: 'suresh@delhigems.com',
      state: 'Delhi',
      address: 'Plot 45, Dariba Kalan, Delhi',
      gstin: '07EEEEE0000E1Z5',
      balance: 0,
      totalPurchases: 3200000,
      lastPurchaseDate: '2026-01-28',
    },
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    email: '',
    state: '',
    address: '',
    gstin: '',
  });

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.mobile.includes(searchQuery) ||
    supplier.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      // Update existing supplier
      setSuppliers(suppliers.map(s => 
        s.id === editingSupplier.id 
          ? { ...s, ...formData }
          : s
      ));
    } else {
      // Add new supplier
      const newSupplier: Supplier = {
        id: `SUP${String(suppliers.length + 1).padStart(3, '0')}`,
        ...formData,
        balance: 0,
        totalPurchases: 0,
      };
      setSuppliers([...suppliers, newSupplier]);
    }
    
    setShowAddModal(false);
    setEditingSupplier(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      mobile: '',
      email: '',
      state: '',
      address: '',
      gstin: '',
    });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      mobile: supplier.mobile,
      email: supplier.email,
      state: supplier.state,
      address: supplier.address,
      gstin: supplier.gstin || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  const stats = {
    total: suppliers.length,
    totalBalance: suppliers.reduce((sum, s) => sum + s.balance, 0),
    totalPurchases: suppliers.reduce((sum, s) => sum + s.totalPurchases, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Building2 className="text-blue-600 dark:text-blue-400" />
            Suppliers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage supplier information and accounts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingSupplier(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus size={20} />
          Add Supplier
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Suppliers</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Balance Due</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{stats.totalBalance.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Purchases</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{stats.totalPurchases.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Search suppliers by name, contact person, mobile, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Suppliers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{supplier.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">ID: {supplier.id}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(supplier)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(supplier.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Phone size={16} className="text-gray-400 dark:text-gray-500" />
                <span><strong>Contact:</strong> {supplier.contactPerson}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Phone size={16} className="text-gray-400 dark:text-gray-500" />
                <span>{supplier.mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail size={16} className="text-gray-400 dark:text-gray-500" />
                <span>{supplier.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <MapPin size={16} className="text-gray-400 dark:text-gray-500" />
                <span>{supplier.state}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance Due</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    ₹{supplier.balance.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ₹{supplier.totalPurchases.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {supplier.lastPurchaseDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Last Purchase: {new Date(supplier.lastPurchaseDate).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupplier(null);
                  resetForm();
                }} 
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Mumbai Bullion Traders"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Ramesh Gupta"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="+91-9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="supplier@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Maharashtra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupplier(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
