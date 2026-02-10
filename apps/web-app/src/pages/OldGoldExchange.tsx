/**
 * Old Gold Exchange Calculator
 * 
 * Professional calculator for old gold exchange transactions
 * Includes weight measurement, purity testing, melting loss deduction
 * Live gold rate integration and receipt printing
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Calculator,
  TrendingUp,
  Printer,
  Plus,
  Trash2,
  Info,
  CheckCircle,
  Save,
  FileText,
} from 'lucide-react';

interface OldGoldItem {
  id: string;
  description: string;
  grossWeight: number; // grams
  stoneWeight: number; // grams
  netWeight: number; // grams (calculated)
  purity: number; // karats (24, 22, 18, 14, etc.)
  touchstoneReading?: string;
  meltingLoss: number; // percentage
  currentRate: number; // per gram for that purity
  value: number; // calculated
}

interface ExchangeTransaction {
  id: string;
  transactionNo: string;
  date: Date;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OldGoldItem[];
  totalGrossWeight: number;
  totalNetWeight: number;
  totalValue: number;
  deductionAmount: number; // workshop charges, etc.
  finalValue: number;
  adjustedAgainst: string; // invoice number or 'Pending'
  status: 'Draft' | 'Completed' | 'Adjusted';
  notes: string;
}

interface GoldRateData {
  purity24k: number;
  purity22k: number;
  purity21k: number;
  purity20k: number;
  purity18k: number;
  purity16k: number;
  purity14k: number;
  lastUpdated: Date;
}

export const OldGoldExchange: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [goldRates, setGoldRates] = useState<GoldRateData | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch live gold rates
  useEffect(() => {
    fetchGoldRates();
  }, []);

  const fetchGoldRates = async () => {
    try {
      const response = await fetch('/api/gold-rates/current');
      const data = await response.json();
      
      if (data.success) {
        setGoldRates({
          purity24k: data.data.price_gram_24k,
          purity22k: data.data.price_gram_22k,
          purity21k: data.data.price_gram_21k,
          purity20k: data.data.price_gram_20k,
          purity18k: data.data.price_gram_18k,
          purity16k: data.data.price_gram_16k,
          purity14k: data.data.price_gram_14k,
          lastUpdated: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch gold rates:', error);
      // Use fallback rates
      setGoldRates({
        purity24k: 6500,
        purity22k: 5958,
        purity21k: 5687,
        purity20k: 5417,
        purity18k: 4875,
        purity16k: 4333,
        purity14k: 3792,
        lastUpdated: new Date(),
      });
    }
  };

  const getRateForPurity = (purity: number): number => {
    if (!goldRates) return 0;
    
    switch (purity) {
      case 24:
        return goldRates.purity24k;
      case 22:
        return goldRates.purity22k;
      case 21:
        return goldRates.purity21k;
      case 20:
        return goldRates.purity20k;
      case 18:
        return goldRates.purity18k;
      case 16:
        return goldRates.purity16k;
      case 14:
        return goldRates.purity14k;
      default:
        // Calculate proportionally for custom purity
        return (goldRates.purity24k * purity) / 24;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Scale className="text-yellow-500" />
            Old Gold Exchange
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Calculate exchange value with live gold rates
          </p>
        </div>

        {/* Live Gold Rate Display */}
        {goldRates && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-yellow-600 dark:text-yellow-400" size={20} />
              <span className="font-semibold text-gray-800 dark:text-white">Live Gold Rate (22K)</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              ₹{goldRates.purity22k.toFixed(2)}/gram
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Updated: {goldRates.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'calculator'
              ? 'bg-yellow-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Calculator size={20} />
          Exchange Calculator
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-yellow-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <FileText size={20} />
          Exchange History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'calculator' ? (
        <ExchangeCalculator
          goldRates={goldRates}
          getRateForPurity={getRateForPurity}
          onSave={(transaction) => {
            setTransactions([transaction, ...transactions]);
          }}
        />
      ) : (
        <ExchangeHistory transactions={transactions} />
      )}
    </div>
  );
};

// Exchange Calculator Component
interface ExchangeCalculatorProps {
  goldRates: GoldRateData | null;
  getRateForPurity: (purity: number) => number;
  onSave: (transaction: ExchangeTransaction) => void;
}

const ExchangeCalculator: React.FC<ExchangeCalculatorProps> = ({
  goldRates,
  getRateForPurity,
  onSave,
}) => {
  const [items, setItems] = useState<OldGoldItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [globalDeduction, setGlobalDeduction] = useState(0); // Additional deduction
  const [notes, setNotes] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const addNewItem = () => {
    const newItem: OldGoldItem = {
      id: String(Date.now()),
      description: '',
      grossWeight: 0,
      stoneWeight: 0,
      netWeight: 0,
      purity: 22,
      meltingLoss: 2, // Default 2% melting loss
      currentRate: getRateForPurity(22),
      value: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<OldGoldItem>) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, ...updates };

        // Auto-calculate net weight
        if ('grossWeight' in updates || 'stoneWeight' in updates) {
          updatedItem.netWeight = updatedItem.grossWeight - updatedItem.stoneWeight;
        }

        // Auto-update rate if purity changed
        if ('purity' in updates) {
          updatedItem.currentRate = getRateForPurity(updatedItem.purity);
        }

        // Calculate value: (netWeight * (100 - meltingLoss) / 100) * rate
        const effectiveWeight =
          (updatedItem.netWeight * (100 - updatedItem.meltingLoss)) / 100;
        updatedItem.value = effectiveWeight * updatedItem.currentRate;

        return updatedItem;
      })
    );
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    const totalGrossWeight = items.reduce((sum, item) => sum + item.grossWeight, 0);
    const totalNetWeight = items.reduce((sum, item) => sum + item.netWeight, 0);
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const finalValue = totalValue - globalDeduction;

    return { totalGrossWeight, totalNetWeight, totalValue, finalValue };
  };

  const totals = calculateTotals();

  const handleSave = () => {
    if (!customerInfo.name || items.length === 0) {
      alert('Please enter customer name and add at least one item');
      return;
    }

    const transaction: ExchangeTransaction = {
      id: String(Date.now()),
      transactionNo: `OGE${String(Date.now()).slice(-6)}`,
      date: new Date(),
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      items: items,
      totalGrossWeight: totals.totalGrossWeight,
      totalNetWeight: totals.totalNetWeight,
      totalValue: totals.totalValue,
      deductionAmount: globalDeduction,
      finalValue: totals.finalValue,
      adjustedAgainst: 'Pending',
      status: 'Completed',
      notes: notes,
    };

    onSave(transaction);
    alert('✅ Old gold exchange transaction saved successfully!');
    
    // Reset form
    setItems([]);
    setCustomerInfo({ name: '', phone: '', address: '' });
    setGlobalDeduction(0);
    setNotes('');
  };

  const handlePrint = () => {
    if (!customerInfo.name || items.length === 0) {
      alert('Please enter customer details and add items before printing');
      return;
    }

    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Customer Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerInfo.phone}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="+91-XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={customerInfo.address}
              onChange={(e) =>
                setCustomerInfo({ ...customerInfo, address: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Customer address"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Old Gold Items
            </h2>
            <button
              onClick={addNewItem}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Plus size={20} />
              Add Item
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Scale size={48} className="mx-auto mb-4 opacity-50" />
            <p>No items added yet</p>
            <p className="text-sm mt-2">Click "Add Item" to start calculating exchange value</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Gross Wt (g)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Stone Wt (g)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Net Wt (g)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Purity (K)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Melting Loss (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Rate/g
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Value (₹)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, { description: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., Bangles, Chain"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        step="0.001"
                        value={item.grossWeight}
                        onChange={(e) =>
                          updateItem(item.id, { grossWeight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        step="0.001"
                        value={item.stoneWeight}
                        onChange={(e) =>
                          updateItem(item.id, { stoneWeight: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.netWeight.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={item.purity}
                        onChange={(e) =>
                          updateItem(item.id, { purity: parseInt(e.target.value) })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="24">24K</option>
                        <option value="22">22K</option>
                        <option value="21">21K</option>
                        <option value="20">20K</option>
                        <option value="18">18K</option>
                        <option value="16">16K</option>
                        <option value="14">14K</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        step="0.1"
                        value={item.meltingLoss}
                        onChange={(e) =>
                          updateItem(item.id, { meltingLoss: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        ₹{item.currentRate.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        ₹{item.value.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculation Summary */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Exchange Value Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Total Gross Weight:</span>
              <span className="font-medium">{totals.totalGrossWeight.toFixed(3)} grams</span>
            </div>
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Total Net Weight:</span>
              <span className="font-medium">{totals.totalNetWeight.toFixed(3)} grams</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-gray-800 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3">
              <span>Calculated Value:</span>
              <span className="text-green-600 dark:text-green-400">
                ₹{totals.totalValue.toFixed(2)}
              </span>
            </div>

            {/* Additional Deduction */}
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">Additional Deduction:</span>
                <div className="relative group">
                  <Info size={16} className="text-gray-400 cursor-help" />
                  <div className="absolute bottom-6 left-0 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Workshop charges, testing fees, or other deductions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  step="1"
                  value={globalDeduction}
                  onChange={(e) => setGlobalDeduction(parseFloat(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Final Value */}
            <div className="flex justify-between text-2xl font-bold text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <span>Final Exchange Value:</span>
              <span className="text-yellow-600 dark:text-yellow-400">
                ₹{totals.finalValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Any additional notes or special conditions..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              <Save size={20} />
              Save Transaction
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              <Printer size={20} />
              Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* Print Template (Hidden) */}
      <div ref={printRef} className="hidden print:block">
        <PrintReceipt
          customerInfo={customerInfo}
          items={items}
          totals={totals}
          globalDeduction={globalDeduction}
          notes={notes}
          goldRates={goldRates}
        />
      </div>
    </div>
  );
};

// Exchange History Component
interface ExchangeHistoryProps {
  transactions: ExchangeTransaction[];
}

const ExchangeHistory: React.FC<ExchangeHistoryProps> = ({ transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.transactionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.customerPhone.includes(searchQuery);

    const matchesStatus = !filterStatus || txn.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by customer name, phone, or transaction no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Adjusted">Adjusted</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600 opacity-50" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {transactions.length === 0
              ? 'No exchange transactions yet'
              : 'No transactions match your search'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Transaction No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Net Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Value
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
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {txn.transactionNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {txn.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{txn.customerName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{txn.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {txn.items.length} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {txn.totalNetWeight.toFixed(3)}g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                      ₹{txn.finalValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          txn.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : txn.status === 'Adjusted'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3">
                        View
                      </button>
                      <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300">
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
              {transactions.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Weight Exchanged</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
              {transactions.reduce((sum, t) => sum + t.totalNetWeight, 0).toFixed(3)}g
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              ₹{transactions.reduce((sum, t) => sum + t.finalValue, 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Print Receipt Component
interface PrintReceiptProps {
  customerInfo: { name: string; phone: string; address: string };
  items: OldGoldItem[];
  totals: {
    totalGrossWeight: number;
    totalNetWeight: number;
    totalValue: number;
    finalValue: number;
  };
  globalDeduction: number;
  notes: string;
  goldRates: GoldRateData | null;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({
  customerInfo,
  items,
  totals,
  globalDeduction,
  notes,
  goldRates,
}) => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold">OLD GOLD EXCHANGE RECEIPT</h1>
        <p className="text-sm mt-2">Transaction No: OGE{String(Date.now()).slice(-6)}</p>
        <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Customer Details */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Customer Details:</h2>
        <p>Name: {customerInfo.name}</p>
        <p>Phone: {customerInfo.phone}</p>
        {customerInfo.address && <p>Address: {customerInfo.address}</p>}
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 px-2 py-2 text-left text-sm">Description</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Gross Wt</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Stone Wt</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Net Wt</th>
            <th className="border border-gray-400 px-2 py-2 text-center text-sm">Purity</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Loss %</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Rate/g</th>
            <th className="border border-gray-400 px-2 py-2 text-right text-sm">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-gray-400 px-2 py-2 text-sm">{item.description}</td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                {item.grossWeight.toFixed(3)}
              </td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                {item.stoneWeight.toFixed(3)}
              </td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                {item.netWeight.toFixed(3)}
              </td>
              <td className="border border-gray-400 px-2 py-2 text-center text-sm">
                {item.purity}K
              </td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                {item.meltingLoss}%
              </td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm">
                ₹{item.currentRate.toFixed(2)}
              </td>
              <td className="border border-gray-400 px-2 py-2 text-right text-sm font-semibold">
                ₹{item.value.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between">
          <span>Total Gross Weight:</span>
          <span className="font-semibold">{totals.totalGrossWeight.toFixed(3)} grams</span>
        </div>
        <div className="flex justify-between">
          <span>Total Net Weight:</span>
          <span className="font-semibold">{totals.totalNetWeight.toFixed(3)} grams</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>Calculated Value:</span>
          <span className="font-semibold">₹{totals.totalValue.toFixed(2)}</span>
        </div>
        {globalDeduction > 0 && (
          <div className="flex justify-between">
            <span>Deduction:</span>
            <span className="font-semibold">- ₹{globalDeduction.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-gray-800 pt-2 text-lg">
          <span className="font-bold">FINAL EXCHANGE VALUE:</span>
          <span className="font-bold">₹{totals.finalValue.toFixed(2)}</span>
        </div>
      </div>

      {/* Gold Rates */}
      {goldRates && (
        <div className="mb-6 text-xs text-gray-600">
          <p>Gold Rates (as of {goldRates.lastUpdated.toLocaleString()}):</p>
          <p>
            22K: ₹{goldRates.purity22k.toFixed(2)}/g | 18K: ₹{goldRates.purity18k.toFixed(2)}/g
          </p>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mb-6">
          <h3 className="font-semibold mb-1">Notes:</h3>
          <p className="text-sm">{notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-12 flex justify-between">
        <div className="text-center">
          <div className="border-t border-gray-800 w-48 pt-2">Customer Signature</div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-800 w-48 pt-2">Authorized Signature</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        <p>This is a computer-generated receipt.</p>
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};
