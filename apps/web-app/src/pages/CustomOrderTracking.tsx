/**
 * Custom Order Tracking System
 * 
 * Manage custom jewelry orders from design to delivery
 * Design upload/approval workflow, cost estimation
 * Progress tracking, customer notifications
 */

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Send,
  Search,
  Plus,
  Eye,
  Edit,
  MessageSquare,
  Calendar,
  User,
  Ruler,
  Weight,
  FileText,
  X,
  AlertTriangle,
  Download,
  Printer,
} from 'lucide-react';

interface DesignImage {
  id: string;
  url: string;
  filename: string;
  uploadDate: Date;
  type: 'customer' | 'reference' | 'final';
}

interface CustomOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  category: string;
  metalType: 'GOLD' | 'SILVER' | 'PLATINUM' | 'MIXED';
  purity: number;
  estimatedWeight: number;
  stoneType?: string;
  stoneCarats?: number;
  designImages: DesignImage[];
  designDescription: string;
  specialInstructions: string;
  status:
    | 'Design Submitted'
    | 'Design Approved'
    | 'Quotation Sent'
    | 'Quotation Approved'
    | 'In Production'
    | 'Quality Check'
    | 'Ready for Delivery'
    | 'Delivered'
    | 'Cancelled';
  estimatedCost: number;
  finalCost?: number;
  advancePayment: number;
  balancePayment: number;
  materialCost: number;
  makingCharges: number;
  stoneCost: number;
  otherCharges: number;
  notes: string;
  timeline: TimelineEntry[];
}

interface TimelineEntry {
  id: string;
  date: Date;
  status: string;
  description: string;
  updatedBy: string;
}

export const CustomOrderTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'create' | 'progress'>('orders');
  const [orders, setOrders] = useState<CustomOrder[]>([
    {
      id: '1',
      orderNo: 'CO-2026-001',
      customerName: 'Priya Sharma',
      customerPhone: '+91-9876543210',
      customerEmail: 'priya.sharma@email.com',
      orderDate: new Date('2026-01-15'),
      expectedDeliveryDate: new Date('2026-02-28'),
      category: 'Necklace',
      metalType: 'GOLD',
      purity: 22,
      estimatedWeight: 50,
      stoneType: 'Ruby',
      stoneCarats: 2.5,
      designImages: [
        {
          id: 'img1',
          url: '/placeholder-design.jpg',
          filename: 'customer-design-1.jpg',
          uploadDate: new Date('2026-01-15'),
          type: 'customer',
        },
      ],
      designDescription: 'Traditional Kerala mango mala design with ruby stones',
      specialInstructions: 'Customer wants matte finish on gold',
      status: 'In Production',
      estimatedCost: 325000,
      advancePayment: 100000,
      balancePayment: 225000,
      materialCost: 250000,
      makingCharges: 50000,
      stoneCost: 20000,
      otherCharges: 5000,
      notes: '',
      timeline: [
        {
          id: 't1',
          date: new Date('2026-01-15'),
          status: 'Design Submitted',
          description: 'Customer submitted design with reference images',
          updatedBy: 'System',
        },
        {
          id: 't2',
          date: new Date('2026-01-16'),
          status: 'Design Approved',
          description: 'Design approved by customer',
          updatedBy: 'Admin',
        },
        {
          id: 't3',
          date: new Date('2026-01-17'),
          status: 'Quotation Sent',
          description: 'Cost estimation sent: ₹3,25,000',
          updatedBy: 'Admin',
        },
        {
          id: 't4',
          date: new Date('2026-01-18'),
          status: 'Quotation Approved',
          description: 'Customer approved quotation. Advance paid: ₹1,00,000',
          updatedBy: 'Admin',
        },
        {
          id: 't5',
          date: new Date('2026-01-20'),
          status: 'In Production',
          description: 'Order sent to production department',
          updatedBy: 'Admin',
        },
      ],
    },
    {
      id: '2',
      orderNo: 'CO-2026-002',
      customerName: 'Rajesh Patel',
      customerPhone: '+91-9876543211',
      customerEmail: 'rajesh.patel@email.com',
      orderDate: new Date('2026-02-01'),
      category: 'Ring',
      metalType: 'PLATINUM',
      purity: 95,
      estimatedWeight: 5,
      stoneType: 'Diamond',
      stoneCarats: 1.0,
      designImages: [],
      designDescription: 'Men\'s platinum ring with single diamond',
      specialInstructions: 'Size 9 US',
      status: 'Quotation Sent',
      estimatedCost: 85000,
      advancePayment: 0,
      balancePayment: 85000,
      materialCost: 50000,
      makingCharges: 15000,
      stoneCost: 18000,
      otherCharges: 2000,
      notes: '',
      timeline: [
        {
          id: 't1',
          date: new Date('2026-02-01'),
          status: 'Design Submitted',
          description: 'Customer inquiry for custom ring',
          updatedBy: 'System',
        },
        {
          id: 't2',
          date: new Date('2026-02-02'),
          status: 'Quotation Sent',
          description: 'Cost estimation sent: ₹85,000',
          updatedBy: 'Admin',
        },
      ],
    },
  ]);

  const getStatusStats = () => {
    const inProgress = orders.filter((o) =>
      ['Design Submitted', 'Design Approved', 'Quotation Sent', 'Quotation Approved', 'In Production', 'Quality Check'].includes(o.status)
    ).length;
    const readyForDelivery = orders.filter((o) => o.status === 'Ready for Delivery').length;
    const delivered = orders.filter((o) => o.status === 'Delivered').length;
    return { inProgress, readyForDelivery, delivered };
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            Custom Order Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage custom jewelry orders from design to delivery
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">In Progress</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.inProgress}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400">Ready</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {stats.readyForDelivery}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">Delivered</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{stats.delivered}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <FileText size={20} />
          All Orders
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'create'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Plus size={20} />
          New Order
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'progress'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Clock size={20} />
          Progress Board
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <OrdersList
          orders={orders}
          onUpdate={(updated) => setOrders(orders.map((o) => (o.id === updated.id ? updated : o)))}
        />
      )}
      {activeTab === 'create' && (
        <CreateOrder
          onSave={(order) => {
            setOrders([order, ...orders]);
            setActiveTab('orders');
          }}
        />
      )}
      {activeTab === 'progress' && <ProgressBoard orders={orders} />}
    </div>
  );
};

// Orders List Component
interface OrdersListProps {
  orders: CustomOrder[];
  onUpdate: (order: CustomOrder) => void;
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);

    const matchesStatus = !filterStatus || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Design Submitted':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Design Approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Quotation Sent':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Quotation Approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'In Production':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Quality Check':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'Ready for Delivery':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Delivered':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              placeholder="Search by order no, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="Design Submitted">Design Submitted</option>
            <option value="Design Approved">Design Approved</option>
            <option value="Quotation Sent">Quotation Sent</option>
            <option value="Quotation Approved">Quotation Approved</option>
            <option value="In Production">In Production</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Ready for Delivery">Ready for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
            <p>No custom orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Order No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Design
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNo}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                        {order.designDescription}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.metalType} {order.purity}K | ~{order.estimatedWeight}g
                        {order.stoneType && ` | ${order.stoneType}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {order.orderDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {order.expectedDeliveryDate ? (
                        order.expectedDeliveryDate.toLocaleDateString()
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{order.estimatedCost.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Advance: ₹{order.advancePayment.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                          title="Edit Order"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          title="Send Update"
                        >
                          <MessageSquare size={18} />
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={(updated) => {
            onUpdate(updated);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};

// Create Order Component
interface CreateOrderProps {
  onSave: (order: CustomOrder) => void;
}

const CreateOrder: React.FC<CreateOrderProps> = ({ onSave }) => {
  const [formData, setFormData] = useState<Partial<CustomOrder>>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderDate: new Date(),
    category: 'Ring',
    metalType: 'GOLD',
    purity: 22,
    estimatedWeight: 0,
    designImages: [],
    designDescription: '',
    specialInstructions: '',
    status: 'Design Submitted',
    estimatedCost: 0,
    advancePayment: 0,
    balancePayment: 0,
    materialCost: 0,
    makingCharges: 0,
    stoneCost: 0,
    otherCharges: 0,
    notes: '',
    timeline: [],
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return (
      (formData.materialCost || 0) +
      (formData.makingCharges || 0) +
      (formData.stoneCost || 0) +
      (formData.otherCharges || 0)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.designDescription) {
      alert('Please fill in customer name and design description');
      return;
    }

    const totalCost = calculateTotalCost();

    const order: CustomOrder = {
      id: String(Date.now()),
      orderNo: `CO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      customerName: formData.customerName!,
      customerPhone: formData.customerPhone!,
      customerEmail: formData.customerEmail!,
      orderDate: formData.orderDate!,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      category: formData.category!,
      metalType: formData.metalType!,
      purity: formData.purity!,
      estimatedWeight: formData.estimatedWeight!,
      stoneType: formData.stoneType,
      stoneCarats: formData.stoneCarats,
      designImages: selectedFiles.map((file, idx) => ({
        id: `img-${idx}`,
        url: URL.createObjectURL(file),
        filename: file.name,
        uploadDate: new Date(),
        type: 'customer' as const,
      })),
      designDescription: formData.designDescription!,
      specialInstructions: formData.specialInstructions!,
      status: formData.status!,
      estimatedCost: totalCost,
      finalCost: undefined,
      advancePayment: formData.advancePayment!,
      balancePayment: totalCost - formData.advancePayment!,
      materialCost: formData.materialCost!,
      makingCharges: formData.makingCharges!,
      stoneCost: formData.stoneCost!,
      otherCharges: formData.otherCharges!,
      notes: formData.notes!,
      timeline: [
        {
          id: 't1',
          date: new Date(),
          status: 'Design Submitted',
          description: 'Custom order created',
          updatedBy: 'Admin',
        },
      ],
    };

    onSave(order);
    alert('✅ Custom order created successfully!');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
        Create Custom Order
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+91-XXXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="customer@email.com"
              />
            </div>
          </div>
        </div>

        {/* Design Details */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Design Specifications
          </h3>

          {/* Design Images Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Design Images / Reference Photos
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors bg-gray-50 dark:bg-gray-900/30"
            >
              {selectedFiles.length > 0 ? (
                <div>
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-24 h-24 object-cover rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFiles.length} image(s) selected. Click to add more.
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">Click to upload design images</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    JPG, PNG up to 10MB each
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Ring">Ring</option>
                <option value="Necklace">Necklace</option>
                <option value="Earrings">Earrings</option>
                <option value="Bracelet">Bracelet</option>
                <option value="Bangles">Bangles</option>
                <option value="Pendant">Pendant</option>
                <option value="Chain">Chain</option>
                <option value="Anklet">Anklet</option>
                <option value="Mangalsutra">Mangalsutra</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metal Type *
              </label>
              <select
                value={formData.metalType}
                onChange={(e) =>
                  setFormData({ ...formData, metalType: e.target.value as 'GOLD' | 'SILVER' | 'PLATINUM' | 'MIXED' })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
                <option value="MIXED">Mixed Metals</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purity (Karat) *
              </label>
              <select
                value={formData.purity}
                onChange={(e) => setFormData({ ...formData, purity: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="24">24K (999)</option>
                <option value="22">22K (916)</option>
                <option value="20">20K (833)</option>
                <option value="18">18K (750)</option>
                <option value="14">14K (585)</option>
                <option value="95">95% (Platinum)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Weight (grams)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.estimatedWeight}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedWeight: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stone Type (if any)
              </label>
              <input
                type="text"
                value={formData.stoneType || ''}
                onChange={(e) => setFormData({ ...formData, stoneType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Diamond, Ruby, Emerald"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stone Carats
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.stoneCarats || ''}
                onChange={(e) =>
                  setFormData({ ...formData, stoneCarats: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Date
              </label>
              <input
                type="date"
                value={formData.orderDate?.toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, orderDate: new Date(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate?.toISOString().split('T')[0] || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedDeliveryDate: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Design Description *
              </label>
              <textarea
                value={formData.designDescription}
                onChange={(e) => setFormData({ ...formData, designDescription: e.target.value })}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the design in detail..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Special Instructions
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, specialInstructions: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Any special requests or customizations..."
              />
            </div>
          </div>
        </div>

        {/* Cost Estimation */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Cost Estimation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Material Cost (₹)
              </label>
              <input
                type="number"
                value={formData.materialCost}
                onChange={(e) =>
                  setFormData({ ...formData, materialCost: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Making Charges (₹)
              </label>
              <input
                type="number"
                value={formData.makingCharges}
                onChange={(e) =>
                  setFormData({ ...formData, makingCharges: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stone Cost (₹)
              </label>
              <input
                type="number"
                value={formData.stoneCost}
                onChange={(e) =>
                  setFormData({ ...formData, stoneCost: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Other Charges (₹)
              </label>
              <input
                type="number"
                value={formData.otherCharges}
                onChange={(e) =>
                  setFormData({ ...formData, otherCharges: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Advance Payment (₹)
              </label>
              <input
                type="number"
                value={formData.advancePayment}
                onChange={(e) =>
                  setFormData({ ...formData, advancePayment: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Estimated Cost</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                ₹{calculateTotalCost().toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Balance: ₹{(calculateTotalCost() - (formData.advancePayment || 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Create Custom Order
          </button>
        </div>
      </form>
    </div>
  );
};

// Progress Board Component
interface ProgressBoardProps {
  orders: CustomOrder[];
}

const ProgressBoard: React.FC<ProgressBoardProps> = ({ orders }) => {
  const stages = [
    'Design Submitted',
    'Design Approved',
    'Quotation Sent',
    'Quotation Approved',
    'In Production',
    'Quality Check',
    'Ready for Delivery',
  ];

  const ordersByStage = stages.map((stage) => ({
    stage,
    orders: orders.filter((o) => o.status === stage),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Production Progress Board
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Visual workflow of all custom orders in progress
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ordersByStage.map(({ stage, orders }) => (
          <div key={stage} className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-white">{stage}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{orders.length} order(s)</p>
            </div>
            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  No orders
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-medium text-sm text-gray-800 dark:text-white truncate">
                      {order.orderNo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {order.category} | {order.metalType} {order.purity}K
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        ₹{(order.estimatedCost / 1000).toFixed(0)}K
                      </span>
                      {order.expectedDeliveryDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {order.expectedDeliveryDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Order Details Modal
interface OrderDetailsModalProps {
  order: CustomOrder;
  onClose: () => void;
  onUpdate: (order: CustomOrder) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, onUpdate }) => {
  const [updatedStatus, setUpdatedStatus] = useState(order.status);
  const [statusNote, setStatusNote] = useState('');

  const updateStatus = () => {
    if (updatedStatus === order.status) {
      alert('Please select a different status to update');
      return;
    }

    const updated: CustomOrder = {
      ...order,
      status: updatedStatus,
      timeline: [
        ...order.timeline,
        {
          id: `t-${Date.now()}`,
          date: new Date(),
          status: updatedStatus,
          description: statusNote || `Status updated to ${updatedStatus}`,
          updatedBy: 'Admin',
        },
      ],
    };

    onUpdate(updated);
    alert('✅ Order status updated successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{order.orderNo}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{order.customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Design Images */}
          {order.designImages.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Design Images</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {order.designImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.filename}
                    className="h-32 w-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Order Information</h4>
              <div className="space-y-2">
                <InfoRow label="Order No" value={order.orderNo} />
                <InfoRow label="Order Date" value={order.orderDate.toLocaleDateString()} />
                <InfoRow
                  label="Expected Delivery"
                  value={order.expectedDeliveryDate?.toLocaleDateString() || 'Not set'}
                />
                <InfoRow label="Current Status" value={order.status} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Design Details</h4>
              <div className="space-y-2">
                <InfoRow label="Category" value={order.category} />
                <InfoRow label="Metal/Purity" value={`${order.metalType} ${order.purity}K`} />
                <InfoRow label="Estimated Weight" value={`${order.estimatedWeight}g`} />
                {order.stoneType && (
                  <InfoRow
                    label="Stone"
                    value={`${order.stoneType} ${order.stoneCarats ? `(${order.stoneCarats}ct)` : ''}`}
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Design Description</h4>
              <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 rounded p-3">
                {order.designDescription}
              </p>
            </div>

            {order.specialInstructions && (
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Special Instructions
                </h4>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 rounded p-3">
                  {order.specialInstructions}
                </p>
              </div>
            )}
          </div>

          {/* Cost Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Cost Breakdown</h4>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Material Cost:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  ₹{order.materialCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Making Charges:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  ₹{order.makingCharges.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Stone Cost:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  ₹{order.stoneCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  ₹{order.otherCharges.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
                <span className="text-gray-800 dark:text-white">Total Estimated Cost:</span>
                <span className="text-purple-600 dark:text-purple-400">
                  ₹{order.estimatedCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-600 dark:text-gray-400">Advance Received:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ₹{order.advancePayment.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-gray-800 dark:text-white">Balance Pending:</span>
                <span className="text-orange-600 dark:text-orange-400">
                  ₹{order.balancePayment.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Order Timeline</h4>
            <div className="space-y-3">
              {order.timeline.map((entry, idx) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <CheckCircle className="text-purple-600 dark:text-purple-400" size={16} />
                    </div>
                    {idx < order.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-800 dark:text-white">{entry.status}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.date.toLocaleDateString()} {entry.date.toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      By: {entry.updatedBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Update Status Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Update Order Status</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Status
                </label>
                <select
                  value={updatedStatus}
                  onChange={(e) => setUpdatedStatus(e.target.value as CustomOrder['status'])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Design Submitted">Design Submitted</option>
                  <option value="Design Approved">Design Approved</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Quotation Approved">Quotation Approved</option>
                  <option value="In Production">In Production</option>
                  <option value="Quality Check">Quality Check</option>
                  <option value="Ready for Delivery">Ready for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Note (Optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional note about this status update..."
                />
              </div>

              <button
                onClick={updateStatus}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Update Status & Notify Customer
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
              <MessageSquare size={18} />
              Send WhatsApp Update
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
              <Printer size={18} />
              Print Order Sheet
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
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
