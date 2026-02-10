/**
 * Enhanced Billing Page
 * 
 * Invoice generation for both customers and wholesalers
 */

import React, { useState } from 'react';
import { InvoiceForm } from '../modules/billing/components/InvoiceForm';
import { Users, Store } from 'lucide-react';

export const BillingEnhanced: React.FC = () => {
  const [partyType, setPartyType] = useState<'customer' | 'wholesaler'>('customer');

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          partyType, // Include party type in transaction
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Invoice generated successfully for ${partyType}!`);
        window.location.hash = '/';
      } else {
        alert('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Failed to submit invoice:', error);
      alert('Failed to submit invoice. Please try again.');
    }
  };

  const handleCancel = () => {
    window.location.hash = '/';
  };

  return (
    <div className="space-y-6">
      {/* Header with Party Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Create Invoice</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Generate GST-compliant invoices with live gold rates
            </p>
          </div>
          
          {/* Party Type Selector */}
          <div className="flex gap-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setPartyType('customer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                partyType === 'customer'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Users size={18} />
              Customer
            </button>
            <button
              onClick={() => setPartyType('wholesaler')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                partyType === 'wholesaler'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Store size={18} />
              Wholesaler
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className={`mt-4 p-3 rounded-lg ${
          partyType === 'customer'
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        }`}>
          <p className={`text-sm ${
            partyType === 'customer'
              ? 'text-blue-800 dark:text-blue-200'
              : 'text-green-800 dark:text-green-200'
          }`}>
            {partyType === 'customer'
              ? '📝 Generating B2C invoice for retail customer'
              : '🏪 Generating B2B invoice for wholesaler/supplier (requires GSTIN)'}
          </p>
        </div>
      </div>

      {/* Invoice Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <InvoiceForm 
          onSubmit={handleSubmit} 
          onCancel={handleCancel} 
          partyType={partyType}
        />
      </div>
    </div>
  );
};

// Export as Billing for compatibility
export const Billing = BillingEnhanced;
