/**
 * Parties Management Page
 * 
 * Manage Customers and Wholesalers (suppliers)
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
} from 'lucide-react';

interface Party {
  id: string;
  type: 'customer' | 'wholesaler';
  name: string;
  businessName?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  totalPurchases: number;
  lastPurchaseDate?: string;
}

export const Parties: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [activeTab, setActiveTab] = useState<'customers' | 'wholesalers'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/parties');
      const data = await response.json();
      
      if (data.success) {
        setParties(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter((party) => {
    const matchesTab = party.type === activeTab.slice(0, -1); // remove 's'
    const matchesSearch =
      party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.phone.includes(searchQuery) ||
      (party.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Parties</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage customers and wholesalers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Party
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Users size={20} />
          Customers
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            {parties.filter((p) => p.type === 'customer').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('wholesalers')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'wholesalers'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Store size={20} />
          Wholesalers / Suppliers
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
            {parties.filter((p) => p.type === 'wholesaler').length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total {activeTab}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{filteredParties.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Transactions</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {filteredParties.reduce((sum, p) => sum + p.totalPurchases, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Active This Month</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {filteredParties.filter((p) => {
              if (!p.lastPurchaseDate) return false;
              const lastPurchase = new Date(p.lastPurchaseDate);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return lastPurchase >= thirtyDaysAgo;
            }).length}
          </p>
        </div>
      </div>

      {/* Parties List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-4">Loading {activeTab}...</p>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No {activeTab} found</p>
            <p className="text-sm mt-2">Add your first {activeTab.slice(0, -1)} to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredParties.map((party) => (
              <div
                key={party.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-750"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      party.type === 'customer'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                    }`}>
                      {party.type === 'customer' ? <Users size={24} /> : <Store size={24} />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{party.name}</h3>
                      {party.businessName && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">{party.businessName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1">
                      <Edit size={16} />
                    </button>
                    <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone size={14} />
                    <span>{party.phone}</span>
                  </div>
                  {party.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail size={14} />
                      <span className="truncate">{party.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin size={14} />
                    <span className="truncate">{party.city}, {party.state}</span>
                  </div>
                  {party.gstin && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Building size={14} />
                      <span className="text-xs">GSTIN: {party.gstin}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Transactions:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{party.totalPurchases}</span>
                  </div>
                  {party.lastPurchaseDate && (
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Last Purchase:</span>
                      <span>{new Date(party.lastPurchaseDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      {showAddModal && (
        <AddPartyModal
          type={activeTab === 'customers' ? 'customer' : 'wholesaler'}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchParties();
          }}
        />
      )}
    </div>
  );
};

// Add Party Modal Component
interface AddPartyModalProps {
  type: 'customer' | 'wholesaler';
  onClose: () => void;
  onSuccess: () => void;
}

const AddPartyModal: React.FC<AddPartyModalProps> = ({ type, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    type,
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${type === 'customer' ? 'Customer' : 'Wholesaler'} added successfully!`);
        onSuccess();
      } else {
        alert('Failed to add party');
      }
    } catch (error) {
      console.error('Failed to add party:', error);
      alert('Failed to add party. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Add {type === 'customer' ? 'Customer' : 'Wholesaler'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Name {type === 'wholesaler' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={type === 'wholesaler'}
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="email@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GSTIN {type === 'wholesaler' && '(Optional for B2B)'}
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : `Add ${type === 'customer' ? 'Customer' : 'Wholesaler'}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
