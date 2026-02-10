/**
 * Billing Page
 * 
 * Wrapper for invoice creation
 */

import React from 'react';
import { InvoiceForm } from '../modules/billing/components/InvoiceForm';

export const Billing: React.FC = () => {
  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Invoice created successfully!');
        // Optionally redirect or reset form
      } else {
        alert('Failed to create invoice');
      }
    } catch (error) {
      console.error('Invoice submission failed:', error);
      alert('Failed to submit invoice. Please try again.');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel?')) {
      window.location.hash = '/';
    }
  };

  return <InvoiceForm onSubmit={handleSubmit} onCancel={handleCancel} />;
};
