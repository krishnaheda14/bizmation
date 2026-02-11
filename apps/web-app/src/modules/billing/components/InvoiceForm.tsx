/**
 * Invoice Form Component
 * 
 * Handles GST-compliant billing with real-time gold rate fetching
 * and automatic price calculation
 */

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Product,
  Customer,
  TransactionItem,
  GoldRate,
  PaymentMethod,
  MetalType,
} from '@jewelry-platform/shared-types';
import { formatCurrency } from '@/utils/format';
import { Plus, Trash2, Search } from 'lucide-react';

interface CustomerDetails {
  id?: string;
  name: string;
  businessName?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  trn?: string;
  loyaltyNumber?: string;
  loyaltyPoints?: number;
}

interface InvoiceFormData {
  customerId?: string;
  customerDetails?: CustomerDetails;
  items: TransactionItem[];
  discount: number;
  notes?: string;
}

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onCancel: () => void;
  partyType?: 'customer' | 'wholesaler'; // To differentiate B2C vs B2B
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  onSubmit, 
  onCancel, 
  partyType = 'customer' 
}) => {
  const [goldRates, setGoldRates] = useState<Record<string, GoldRate>>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingProduct, setSearchingProduct] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    phone: '',
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      items: [
        {
          description: '',
          quantity: 1,
          weightGrams: 0,
          rate: 0,
          makingCharges: 0,
          amount: 0,
          gstRate: 3, // 3% GST for gold jewelry in India
          gstAmount: 0,
          hsnCode: '71131910', // Default HSN for gold jewelry
        },
      ],
      discount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const discount = watch('discount') || 0;

  // Fetch gold rates on mount
  useEffect(() => {
    fetchGoldRates();
    fetchCustomers();
  }, []);

  const fetchGoldRates = async () => {
    try {
      setFetchingRate(true);
      // Fetch rates for common purities
      const purities = [24, 22, 18];
      const metalTypes: MetalType[] = [MetalType.GOLD, MetalType.SILVER];
      const rates: Record<string, GoldRate> = {};

      for (const metalType of metalTypes) {
        for (const purity of purities) {
          const response = await fetch(
            `/api/gold-rates/current?metalType=${metalType}&purity=${purity}`
          );
          const data = await response.json();
          if (data.success) {
            rates[`${metalType}-${purity}`] = data.data;
          }
        }
      }

      setGoldRates(rates);
    } catch (error) {
      console.error('Failed to fetch gold rates:', error);
      alert('Failed to fetch gold rates. Please check your connection.');
    } finally {
      setFetchingRate(false);
    }
  };

  const fetchLiveGoldRate = async () => {
    try {
      setFetchingRate(true);
      // Fetch live rate from GoldAPI.io
      const purities = [24, 22, 18];
      const metalTypes: MetalType[] = [MetalType.GOLD, MetalType.SILVER];
      const rates: Record<string, GoldRate> = {};

      for (const metalType of metalTypes) {
        for (const purity of purities) {
          const response = await fetch(
            `/api/gold-rates/fetch-live?metalType=${metalType}&purity=${purity}`
          );
          const data = await response.json();
          if (data.success) {
            rates[`${metalType}-${purity}`] = data.data;
          }
        }
      }

      setGoldRates(rates);
      alert('Live gold rates fetched successfully!');
    } catch (error) {
      console.error('Failed to fetch live gold rates:', error);
      alert('Failed to fetch live gold rates. Please check your GOLD_API_KEY in .env');
    } finally {
      setFetchingRate(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const searchProduct = async (sku: string, index: number) => {
    if (!sku) return;
    
    setSearchingProduct(index);
    try {
      const response = await fetch(`/api/inventory/products/sku/${sku}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const product: Product = data.data;
        
        // Auto-fill item details from product
        setValue(`items.${index}.description`, product.name);
        setValue(`items.${index}.weightGrams`, product.netWeightGrams);
        setValue(`items.${index}.rate`, product.sellingPrice / product.netWeightGrams);
        setValue(`items.${index}.makingCharges`, product.makingCharges);
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.productId`, product.id);
        
        // Calculate amount
        calculateItemAmount(index);
      }
    } catch (error) {
      console.error('Failed to search product:', error);
    } finally {
      setSearchingProduct(null);
    }
  };

  const calculateItemAmount = (index: number) => {
    const item = items[index];
    if (!item) return;

    const quantity = item.quantity || 1;
    const weightGrams = item.weightGrams || 0;
    const rate = item.rate || 0;
    const makingCharges = item.makingCharges || 0;

    // Calculate base amount: (weight * rate * quantity) + making charges
    const baseAmount = (weightGrams * rate * quantity) + makingCharges;
    
    // Calculate GST
    const gstRate = item.gstRate || 3;
    const gstAmount = baseAmount * (gstRate / 100);
    
    // Total amount including GST
    const amount = baseAmount + gstAmount;

    setValue(`items.${index}.gstAmount`, parseFloat(gstAmount.toFixed(2)));
    setValue(`items.${index}.amount`, parseFloat(amount.toFixed(2)));
  };

  const getGoldRate = (metalType: MetalType, purity: number): number => {
    const rate = goldRates[`${metalType}-${purity}`];
    return rate ? rate.ratePerGram : 0;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const baseAmount = (item.amount || 0) - (item.gstAmount || 0);
      return sum + baseAmount;
    }, 0);

    const totalGst = items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
    const discountAmount = discount;
    const grandTotal = subtotal + totalGst - discountAmount;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = Math.round(grandTotal);

    return {
      subtotal,
      cgst: totalGst / 2, // Assume intra-state, split GST into CGST/SGST
      sgst: totalGst / 2,
      igst: 0, // For inter-state transactions
      totalGst,
      discount: discountAmount,
      roundOff,
      grandTotal: finalTotal,
    };
  };

  const totals = calculateTotals();

  const handleFormSubmit = async (data: InvoiceFormData) => {
    // Validate customer details
    if (!customerDetails.name || !customerDetails.phone) {
      alert('Please provide customer name and phone number');
      return;
    }

    // For wholesalers, GSTIN is mandatory for B2B invoicing
    if (partyType === 'wholesaler' && !customerDetails.gstin) {
      const confirmProceed = confirm(
        'GSTIN is recommended for B2B transactions. Continue without GSTIN?'
      );
      if (!confirmProceed) return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        customerId: selectedCustomerId || undefined,
        customerDetails: customerDetails,
      });
    } catch (error) {
      console.error('Failed to submit invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    
    if (customerId === 'new') {
      // New customer - show form
      setShowCustomerForm(true);
      setCustomerDetails({
        name: '',
        phone: '',
      });
    } else if (customerId === '') {
      // Walk-in customer - show minimal form
      setShowCustomerForm(true);
      setCustomerDetails({
        name: 'Walk-in Customer',
        phone: '',
      });
    } else {
      // Existing customer - load their details
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setShowCustomerForm(true);
        setCustomerDetails({
          id: customer.id,
          name: customer.name,
          businessName: undefined,
          phone: customer.phone,
          email: customer.email,
          address: customer.address ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.pincode}` : undefined,
          city: customer.address?.city,
          state: customer.address?.state,
          pincode: customer.address?.pincode,
          gstin: customer.gstNumber,
          trn: undefined,
          loyaltyNumber: undefined,
          loyaltyPoints: customer.loyaltyPoints,
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">New Invoice</h2>
        
        {/* Customer Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select {partyType === 'customer' ? 'Customer' : 'Wholesaler/Supplier'} *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Walk-in {partyType === 'customer' ? 'Customer' : 'Party'}</option>
              <option value="new">➕ Add New {partyType === 'customer' ? 'Customer' : 'Wholesaler'}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Gold Rate Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Today's Gold Rate (22K)
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-lg font-semibold text-yellow-900 dark:text-yellow-200">
                  {fetchingRate ? 'Loading...' : `₹${getGoldRate(MetalType.GOLD, 22).toFixed(2)}/gram`}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchLiveGoldRate}
                disabled={fetchingRate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                title="Fetch live gold rate from GoldAPI.io (paid API)"
              >
                {fetchingRate ? '⏳' : '🔄 Fetch Price'}
              </button>
            </div>
          </div>
        </div>

        {/* Customer Details Form */}
        {showCustomerForm && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {partyType === 'customer' ? 'Customer' : 'Wholesaler/Supplier'} Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {partyType === 'customer' ? 'Customer Name' : 'Contact Person'} *
                </label>
                <input
                  type="text"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Full name"
                />
              </div>

              {/* Business Name */}
              {partyType === 'wholesaler' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business/Company Name *
                  </label>
                  <input
                    type="text"
                    value={customerDetails.businessName || ''}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, businessName: e.target.value })}
                    required={partyType === 'wholesaler'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Business name"
                  />
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+91-XXXXXXXXXX"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerDetails.email || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="email@example.com"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GSTIN {partyType === 'wholesaler' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerDetails.gstin || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              {/* TRN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TRN (Tax Registration No.)
                </label>
                <input
                  type="text"
                  value={customerDetails.trn || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, trn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="TRN number"
                />
              </div>

              {/* Loyalty Details - Only for customers */}
              {partyType === 'customer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Loyalty Card Number
                    </label>
                    <input
                      type="text"
                      value={customerDetails.loyaltyNumber || ''}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, loyaltyNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="LOYAL-XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Loyalty Points
                    </label>
                    <input
                      type="number"
                      value={customerDetails.loyaltyPoints || 0}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, loyaltyPoints: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                      readOnly={!!selectedCustomerId && selectedCustomerId !== 'new'}
                    />
                  </div>
                </>
              )}

              {/* Address */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={customerDetails.address || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Street address"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={customerDetails.city || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="City"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State
                </label>
                <select
                  value={customerDetails.state || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pincode
                </label>
                <input
                  type="text"
                  value={customerDetails.pincode || ''}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, pincode: e.target.value })}
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="XXXXXX"
                />
              </div>
            </div>

            {/* Info box */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Analytics Tip:</strong> Collecting complete customer details helps with sales analytics, 
                customer segmentation, regional insights, and personalized marketing. 
                {partyType === 'wholesaler' && ' GSTIN is mandatory for GST-compliant B2B invoicing.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Invoice Items</h3>
          <button
            type="button"
            onClick={() => append({
              description: '',
              quantity: 1,
              weightGrams: 0,
              rate: 0,
              makingCharges: 0,
              amount: 0,
              gstRate: 3,
              gstAmount: 0,
              hsnCode: '71131910',
            })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={20} /> Add Item
          </button>
        </div>

        <div className="space-y-4 overflow-x-auto">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/30">
              <div className="grid grid-cols-12 gap-4">
                {/* SKU Search */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU/Barcode
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Scan or type"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      onBlur={(e) => searchProduct(e.target.value, index)}
                    />
                    {searchingProduct === index && (
                      <div className="absolute right-2 top-2">
                        <Search size={16} className="animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <input
                    {...register(`items.${index}.description`, { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Product name"
                  />
                </div>

                {/* Weight */}
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    {...register(`items.${index}.weightGrams`, { valueAsNumber: true })}
                    onChange={() => calculateItemAmount(index)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Rate */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rate/gram (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.rate`, { valueAsNumber: true })}
                    onChange={() => calculateItemAmount(index)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Making Charges */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Making (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.makingCharges`, { valueAsNumber: true })}
                    onChange={() => calculateItemAmount(index)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Amount */}
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    {...register(`items.${index}.amount`)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-sm text-gray-900 dark:text-white"
                  />
                </div>

                {/* Delete Button */}
                <div className="col-span-1 flex items-end">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          {/* Right: Totals */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CGST (1.5%):</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.cgst)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">SGST (1.5%):</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.sgst)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <label className="text-gray-600 dark:text-gray-400">Discount:</label>
              <input
                type="number"
                step="0.01"
                {...register('discount', { valueAsNumber: true })}
                className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Round Off:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totals.roundOff)}</span>
            </div>

            <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-800 dark:text-white">Grand Total:</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Processing...' : 'Generate Invoice'}
        </button>
      </div>
    </form>
  );
};
