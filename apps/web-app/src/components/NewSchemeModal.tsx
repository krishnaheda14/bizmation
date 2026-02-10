import React, { useState } from 'react';
import { Scheme, SchemeType } from '../types/schemes';

interface NewSchemeModalProps {
  onClose: () => void;
  onSuccess: (scheme: Scheme) => void;
}

interface NewSchemeFormData {
  customerName: string;
  customerPhone: string;
  schemeType: SchemeType;
  monthlyInstallment: number;
  totalMonths: number;
  startDate: string;
  bonusPercentage: number;
}

const NewSchemeModal: React.FC<NewSchemeModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<NewSchemeFormData>({
    customerName: '',
    customerPhone: '',
    schemeType: 'Gold Savings',
    monthlyInstallment: 5000,
    totalMonths: 11,
    startDate: new Date().toISOString().split('T')[0],
    bonusPercentage: 10,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startDate = new Date(formData.startDate);
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + formData.totalMonths);

    const newScheme: Scheme = {
      id: String(Date.now()),
      schemeNo: `SCH${String(Date.now()).slice(-4)}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      schemeType: formData.schemeType,
      monthlyInstallment: formData.monthlyInstallment,
      totalMonths: formData.totalMonths,
      paidMonths: 0,
      startDate: startDate,
      maturityDate: maturityDate,
      totalPaid: 0,
      bonusPercentage: formData.bonusPercentage,
      status: 'Active',
    };

    onSuccess(newScheme);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">New Scheme Enrollment</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+91-9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheme Type *
              </label>
              <select
                required
                value={formData.schemeType}
                onChange={(e) => setFormData({ ...formData, schemeType: e.target.value as SchemeType })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Gold Savings">Gold Savings</option>
                <option value="Diamond Scheme">Diamond Scheme</option>
                <option value="Platinum Scheme">Platinum Scheme</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monthly Installment (₹) *
              </label>
              <input
                type="number"
                required
                min="1000"
                step="100"
                value={formData.monthlyInstallment}
                onChange={(e) => setFormData({ ...formData, monthlyInstallment: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Months *
              </label>
              <select
                required
                value={formData.totalMonths}
                onChange={(e) => setFormData({ ...formData, totalMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="11">11 Months (Standard)</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="24">24 Months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bonus Percentage *
              </label>
              <select
                required
                value={formData.bonusPercentage}
                onChange={(e) => setFormData({ ...formData, bonusPercentage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="5">5%</option>
                <option value="10">10% (Standard)</option>
                <option value="15">15%</option>
                <option value="20">20%</option>
              </select>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                Expected Maturity Value
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                ₹{((formData.monthlyInstallment * formData.totalMonths) * (1 + formData.bonusPercentage / 100)).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                Base: ₹{(formData.monthlyInstallment * formData.totalMonths).toLocaleString('en-IN')} + 
                Bonus: ₹{((formData.monthlyInstallment * formData.totalMonths) * (formData.bonusPercentage / 100)).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
            >
              Enroll Scheme
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSchemeModal;
