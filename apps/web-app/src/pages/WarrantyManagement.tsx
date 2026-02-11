/**
 * Warranty Management System
 * 
 * Digital warranty card generation and tracking
 * Auto-generate warranty on sale, customer lookup
 * WhatsApp delivery integration, expiry reminders
 */

import React, { useState, useRef } from 'react';
import {
  Shield,
  Search,
  Plus,
  Calendar,
  Phone,
  Mail,
  Download,
  Printer,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Package,
  MessageSquare,
  Bell,
  FileText,
  Eye,
  X,
} from 'lucide-react';

interface Warranty {
  id: string;
  warrantyNo: string;
  invoiceNo: string;
  itemName: string;
  itemSKU: string;
  itemCategory: string;
  metalType: string;
  purity: number;
  netWeight: number;
  grossWeight: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  purchaseDate: Date;
  warrantyPeriod: number; // months
  expiryDate: Date;
  coverageDetails: string;
  termsConditions: string;
  status: 'Active' | 'Expired' | 'Claimed' | 'Void';
  whatsappSent: boolean;
  emailSent: boolean;
  reminderSent: boolean;
  notes: string;
}

export const WarrantyManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'lookup' | 'reminders'>('list');
  const [warranties, setWarranties] = useState<Warranty[]>([
    {
      id: '1',
      warrantyNo: 'WRT-2026-001',
      invoiceNo: 'INV-2026-001',
      itemName: '22K Gold Necklace Set',
      itemSKU: 'GN-001',
      itemCategory: 'Necklace',
      metalType: 'GOLD',
      purity: 22,
      netWeight: 44.2,
      grossWeight: 45.5,
      customerName: 'Priya Sharma',
      customerPhone: '+91-9876543210',
      customerEmail: 'priya.sharma@email.com',
      purchaseDate: new Date('2025-11-15'),
      warrantyPeriod: 12,
      expiryDate: new Date('2026-11-15'),
      coverageDetails: 'Manufacturing defects, polishing, cleaning',
      termsConditions: 'Valid only with original invoice. Does not cover physical damage or misuse.',
      status: 'Active',
      whatsappSent: true,
      emailSent: true,
      reminderSent: false,
      notes: '',
    },
    {
      id: '2',
      warrantyNo: 'WRT-2026-002',
      invoiceNo: 'INV-2026-002',
      itemName: '18K Diamond Ring 0.5ct',
      itemSKU: 'DR-001',
      itemCategory: 'Ring',
      metalType: 'GOLD',
      purity: 18,
      netWeight: 3.5,
      grossWeight: 4.2,
      customerName: 'Rajesh Patel',
      customerPhone: '+91-9876543211',
      customerEmail: 'rajesh.patel@email.com',
      purchaseDate: new Date('2025-12-20'),
      warrantyPeriod: 24,
      expiryDate: new Date('2027-12-20'),
      coverageDetails: 'Diamond setting security, metal polishing, sizing (one-time free)',
      termsConditions: 'Diamond warranty subject to GIA certificate verification.',
      status: 'Active',
      whatsappSent: true,
      emailSent: false,
      reminderSent: false,
      notes: '',
    },
  ]);

  const getStatusStats = () => {
    const active = warranties.filter((w) => w.status === 'Active').length;
    const expiringSoon = warranties.filter(
      (w) =>
        w.status === 'Active' &&
        w.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    ).length;
    const expired = warranties.filter((w) => w.status === 'Expired').length;
    return { active, expiringSoon, expired };
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Shield className="text-green-600" />
            Warranty Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Digital warranty cards with WhatsApp delivery
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400">Active</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">{stats.active}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Expiring Soon</p>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {stats.expiringSoon}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-600 dark:text-red-400">Expired</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <FileText size={20} />
          All Warranties
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Plus size={20} />
          Create Warranty
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'lookup'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Search size={20} />
          Customer Lookup
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'reminders'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Bell size={20} />
          Reminders
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && <WarrantiesList warranties={warranties} />}
      {activeTab === 'create' && (
        <CreateWarranty
          onSave={(warranty) => {
            setWarranties([warranty, ...warranties]);
            setActiveTab('list');
          }}
        />
      )}
      {activeTab === 'lookup' && <CustomerLookup warranties={warranties} />}
      {activeTab === 'reminders' && <WarrantyReminders warranties={warranties} />}
    </div>
  );
};

// Warranties List Component
interface WarrantiesListProps {
  warranties: Warranty[];
}

const WarrantiesList: React.FC<WarrantiesListProps> = ({ warranties }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

  const filteredWarranties = warranties.filter((warranty) => {
    const matchesSearch =
      warranty.warrantyNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warranty.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      warranty.customerPhone.includes(searchQuery) ||
      warranty.itemName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filterStatus || warranty.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Claimed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Void':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sendWhatsApp = (warranty: Warranty) => {
    // Placeholder for WhatsApp integration
    alert(
      `📱 WhatsApp message would be sent to ${warranty.customerPhone}\n\n` +
        `Dear ${warranty.customerName},\n` +
        `Your warranty card for ${warranty.itemName} is ready!\n` +
        `Warranty No: ${warranty.warrantyNo}\n` +
        `Valid until: ${warranty.expiryDate.toLocaleDateString()}\n\n` +
        `View your warranty: https://yourdomain.com/warranty/${warranty.id}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by warranty no, customer name, phone, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Claimed">Claimed</option>
            <option value="Void">Void</option>
          </select>
        </div>
      </div>

      {/* Warranties Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredWarranties.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p>No warranties found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Warranty No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Purchase Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWarranties.map((warranty) => (
                  <tr key={warranty.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {warranty.warrantyNo}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Inv: {warranty.invoiceNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {warranty.customerName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warranty.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {warranty.itemName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warranty.itemSKU} | {warranty.netWeight}g
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {warranty.purchaseDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {warranty.expiryDate.toLocaleDateString()}
                      </div>
                      {warranty.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 &&
                        warranty.status === 'Active' && (
                          <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <AlertCircle size={12} />
                            Expiring soon
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          warranty.status
                        )}`}
                      >
                        {warranty.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {warranty.whatsappSent ? (
                          <CheckCircle className="text-green-600 dark:text-green-400" size={18} />
                        ) : (
                          <Clock className="text-gray-400" size={18} />
                        )}
                        {warranty.emailSent ? (
                          <CheckCircle className="text-blue-600 dark:text-blue-400" size={18} />
                        ) : (
                          <Clock className="text-gray-400" size={18} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedWarranty(warranty)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => sendWhatsApp(warranty)}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          title="Send WhatsApp"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300" title="Print">
                          <Printer size={18} />
                        </button>
                        <button className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300" title="Download">
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warranty Details Modal */}
      {selectedWarranty && (
        <WarrantyDetailsModal warranty={selectedWarranty} onClose={() => setSelectedWarranty(null)} />
      )}
    </div>
  );
};

// Create Warranty Component
interface CreateWarrantyProps {
  onSave: (warranty: Warranty) => void;
}

const CreateWarranty: React.FC<CreateWarrantyProps> = ({ onSave }) => {
  const [formData, setFormData] = useState<Partial<Warranty>>({
    invoiceNo: '',
    itemName: '',
    itemSKU: '',
    itemCategory: 'Ring',
    metalType: 'GOLD',
    purity: 22,
    netWeight: 0,
    grossWeight: 0,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    purchaseDate: new Date(),
    warrantyPeriod: 12,
    coverageDetails: 'Manufacturing defects, polishing, cleaning',
    termsConditions: 'Valid only with original invoice. Does not cover physical damage or misuse.',
    status: 'Active',
    whatsappSent: false,
    emailSent: false,
    reminderSent: false,
    notes: '',
  });

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const calculateExpiryDate = () => {
    const expiry = new Date(formData.purchaseDate!);
    expiry.setMonth(expiry.getMonth() + (formData.warrantyPeriod || 12));
    return expiry;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.itemName || !formData.invoiceNo) {
      alert('Please fill in all required fields');
      return;
    }

    const warranty: Warranty = {
      id: String(Date.now()),
      warrantyNo: `WRT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      invoiceNo: formData.invoiceNo!,
      itemName: formData.itemName!,
      itemSKU: formData.itemSKU!,
      itemCategory: formData.itemCategory!,
      metalType: formData.metalType!,
      purity: formData.purity!,
      netWeight: formData.netWeight!,
      grossWeight: formData.grossWeight!,
      customerName: formData.customerName!,
      customerPhone: formData.customerPhone!,
      customerEmail: formData.customerEmail!,
      purchaseDate: formData.purchaseDate!,
      warrantyPeriod: formData.warrantyPeriod!,
      expiryDate: calculateExpiryDate(),
      coverageDetails: formData.coverageDetails!,
      termsConditions: formData.termsConditions!,
      status: formData.status!,
      whatsappSent: sendWhatsApp,
      emailSent: sendEmail,
      reminderSent: false,
      notes: formData.notes!,
    };

    onSave(warranty);
    
    if (sendWhatsApp || sendEmail) {
      let message = '✅ Warranty created successfully!\n\n';
      if (sendWhatsApp) message += '📱 WhatsApp notification sent\n';
      if (sendEmail) message += '📧 Email notification sent\n';
      alert(message);
    } else {
      alert('✅ Warranty created successfully!');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
        Create New Warranty
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice & Item Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Item Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="INV-2026-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item SKU
              </label>
              <input
                type="text"
                value={formData.itemSKU}
                onChange={(e) => setFormData({ ...formData, itemSKU: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="GN-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="22K Gold Necklace Set"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.itemCategory}
                onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Ring">Ring</option>
                <option value="Necklace">Necklace</option>
                <option value="Earrings">Earrings</option>
                <option value="Bracelet">Bracelet</option>
                <option value="Bangles">Bangles</option>
                <option value="Chain">Chain</option>
                <option value="Pendant">Pendant</option>
                <option value="Anklet">Anklet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metal Type
              </label>
              <select
                value={formData.metalType}
                onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purity (Karat)
              </label>
              <select
                value={formData.purity}
                onChange={(e) => setFormData({ ...formData, purity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="24">24K</option>
                <option value="22">22K</option>
                <option value="20">20K</option>
                <option value="18">18K</option>
                <option value="14">14K</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Net Weight (grams)
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.netWeight}
                onChange={(e) => setFormData({ ...formData, netWeight: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="customer@email.com"
              />
            </div>
          </div>
        </div>

        {/* Warranty Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Warranty Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchaseDate?.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, purchaseDate: new Date(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warranty Period (months) *
              </label>
              <select
                value={formData.warrantyPeriod}
                onChange={(e) =>
                  setFormData({ ...formData, warrantyPeriod: parseInt(e.target.value) })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
                <option value="60">60 Months (5 Years)</option>
                <option value="120">120 Months (Lifetime)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Coverage Details
              </label>
              <textarea
                value={formData.coverageDetails}
                onChange={(e) => setFormData({ ...formData, coverageDetails: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="What is covered under this warranty..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={formData.termsConditions}
                onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Warranty terms and conditions..."
              />
            </div>
          </div>
        </div>

        {/* Delivery Options */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Delivery Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-5 h-5 text-green-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-green-600" size={20} />
                  <span className="font-medium text-gray-800 dark:text-white">Send via WhatsApp</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Instant delivery to customer's WhatsApp
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-5 h-5 text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="text-blue-600" size={20} />
                  <span className="font-medium text-gray-800 dark:text-white">Send via Email</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Send PDF warranty card to customer's email
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Create & Send Warranty
          </button>
        </div>
      </form>
    </div>
  );
};

// Customer Lookup Component
interface CustomerLookupProps {
  warranties: Warranty[];
}

const CustomerLookup: React.FC<CustomerLookupProps> = ({ warranties }) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Warranty[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!searchInput.trim()) {
      alert('Please enter a phone number, email, or warranty number');
      return;
    }

    const results = warranties.filter(
      (w) =>
        w.customerPhone.includes(searchInput) ||
        w.customerEmail.toLowerCase().includes(searchInput.toLowerCase()) ||
        w.warrantyNo.toLowerCase().includes(searchInput.toLowerCase())
    );

    setSearchResults(results);
    setSearched(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Search className="text-blue-600" />
          Customer Warranty Lookup
        </h2>

        <div className="flex gap-4">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearched(false);
            }}
            placeholder="Enter phone number, email, or warranty number..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
          />
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
          >
            <Search size={20} />
            Search
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          💡 Customers can use this to check their warranty status online
        </p>
      </div>

      {/* Search Results */}
      {searched && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Search Results ({searchResults.length})
          </h3>

          {searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No warranties found</p>
              <p className="text-sm mt-2">
                Please check the phone number, email, or warranty number and try again
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((warranty) => (
                <div
                  key={warranty.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {warranty.itemName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Warranty No: {warranty.warrantyNo}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        warranty.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {warranty.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Purchase Date</p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {warranty.purchaseDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Expiry Date</p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {warranty.expiryDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Item Details</p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {warranty.metalType} {warranty.purity}K | {warranty.netWeight}g
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Coverage</p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {warranty.warrantyPeriod} months
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Coverage:</strong> {warranty.coverageDetails}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2">
                      <Download size={16} />
                      Download
                    </button>
                    <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-2">
                      <Printer size={16} />
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Warranty Reminders Component
interface WarrantyRemindersProps {
  warranties: Warranty[];
}

const WarrantyReminders: React.FC<WarrantyRemindersProps> = ({ warranties }) => {
  const expiringSoon = warranties.filter(
    (w) =>
      w.status === 'Active' &&
      w.expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 &&
      w.expiryDate.getTime() > Date.now()
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Bell className="text-yellow-600" />
          Warranty Expiry Reminders
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Automatically send reminders to customers 30 days before warranty expiry
        </p>

        {expiringSoon.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-500" />
            <p className="text-lg">No warranties expiring in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expiringSoon.map((warranty) => {
              const daysLeft = Math.ceil(
                (warranty.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={warranty.id}
                  className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="text-yellow-600 dark:text-yellow-400" size={20} />
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                          {warranty.customerName}
                        </h4>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {warranty.customerPhone}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                        {warranty.itemName} - {warranty.warrantyNo}
                      </p>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Expires in {daysLeft} days ({warranty.expiryDate.toLocaleDateString()})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2">
                        <Send size={16} />
                        Send Reminder
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2">
                <Send size={20} />
                Send All Reminders ({expiringSoon.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Warranty Details Modal
interface WarrantyDetailsModalProps {
  warranty: Warranty;
  onClose: () => void;
}

const WarrantyDetailsModal: React.FC<WarrantyDetailsModalProps> = ({ warranty, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Warranty Card</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warranty Header */}
          <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-6">
            <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
              <Shield className="text-green-600 dark:text-green-400" size={48} />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              WARRANTY CERTIFICATE
            </h3>
            <p className="text-lg font-mono font-semibold text-green-600 dark:text-green-400">
              {warranty.warrantyNo}
            </p>
          </div>

          {/* Warranty Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Customer Information</h4>
              <div className="space-y-2">
                <InfoRow label="Name" value={warranty.customerName} />
                <InfoRow label="Phone" value={warranty.customerPhone} />
                <InfoRow label="Email" value={warranty.customerEmail} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Item Details</h4>
              <div className="space-y-2">
                <InfoRow label="Item" value={warranty.itemName} />
                <InfoRow label="SKU" value={warranty.itemSKU} />
                <InfoRow label="Category" value={warranty.itemCategory} />
                <InfoRow label="Metal/Purity" value={`${warranty.metalType} ${warranty.purity}K`} />
                <InfoRow label="Weight" value={`${warranty.netWeight}g`} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Warranty Period</h4>
              <div className="space-y-2">
                <InfoRow label="Invoice No" value={warranty.invoiceNo} />
                <InfoRow label="Purchase Date" value={warranty.purchaseDate.toLocaleDateString()} />
                <InfoRow label="Warranty Period" value={`${warranty.warrantyPeriod} months`} />
                <InfoRow label="Expiry Date" value={warranty.expiryDate.toLocaleDateString()} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Status</h4>
              <div className="space-y-2">
                <InfoRow label="Status" value={warranty.status} />
                <InfoRow label="WhatsApp" value={warranty.whatsappSent ? '✅ Sent' : '❌ Not sent'} />
                <InfoRow label="Email" value={warranty.emailSent ? '✅ Sent' : '❌ Not sent'} />
              </div>
            </div>
          </div>

          {/* Coverage Details */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Coverage Details</h4>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 rounded p-3">
              {warranty.coverageDetails}
            </p>
          </div>

          {/* Terms & Conditions */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Terms & Conditions</h4>
            <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 rounded p-3 text-sm">
              {warranty.termsConditions}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
              <MessageSquare size={18} />
              Send WhatsApp
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
              <Mail size={18} />
              Send Email
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
              <Printer size={18} />
              Print
            </button>
            <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for Info Rows
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
  </div>
);
