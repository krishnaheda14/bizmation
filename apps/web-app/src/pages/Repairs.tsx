/**
 * Repair & Job Work Management
 * 
 * Track customer repair orders, customizations, and job work
 */

import React, { useState } from 'react';
import { Wrench, Plus, Search, Filter, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface RepairJob {
  id: string;
  jobNo: string;
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  repairType: 'Repair' | 'Customization' | 'Resizing' | 'Polishing' | 'Stone Setting' | 'Other';
  estimatedCost: number;
  advancePayment: number;
  receivedDate: Date;
  promisedDate: Date;
  status: 'Pending' | 'In Progress' | 'Ready' | 'Delivered' | 'Cancelled';
  notes: string;
  images: string[];
}

export const Repairs: React.FC = () => {
  const [jobs, setJobs] = useState<RepairJob[]>([
    {
      id: '1',
      jobNo: 'REP001',
      customerName: 'Ramesh Kumar',
      customerPhone: '+91-9876543210',
      itemDescription: 'Gold chain - broken link repair',
      repairType: 'Repair',
      estimatedCost: 800,
      advancePayment: 300,
      receivedDate: new Date('2026-02-08'),
      promisedDate: new Date('2026-02-12'),
      status: 'In Progress',
      notes: 'Handle with care - antique piece',
      images: [],
    },
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewJobModal, setShowNewJobModal] = useState(false);

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'Ready': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'Delivered': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusIcons = {
    'Pending': <Clock size={16} />,
    'In Progress': <AlertCircle size={16} />,
    'Ready': <CheckCircle size={16} />,
    'Delivered': <CheckCircle size={16} />,
    'Cancelled': <XCircle size={16} />,
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'Pending').length,
    inProgress: jobs.filter((j) => j.status === 'In Progress').length,
    ready: jobs.filter((j) => j.status === 'Ready').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <Wrench className="text-blue-600 dark:text-blue-400" />
            Repair & Job Work
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer repairs, customizations, and job orders
          </p>
        </div>
        <button
          onClick={() => setShowNewJobModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus size={20} />
          New Job
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Ready for Delivery</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ready}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by job number, customer name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Wrench size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No repair jobs found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {jobs.length === 0 ? 'Create your first job order' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{job.jobNo}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusColors[job.status]}`}>
                      {statusIcons[job.status]}
                      {job.status}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium">{job.customerName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{job.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Promised Date</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {job.promisedDate.toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Item & Repair Type</p>
                <p className="font-medium text-gray-800 dark:text-white">{job.itemDescription}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm">
                  {job.repairType}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Cost</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">₹{job.estimatedCost}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Advance Paid</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">₹{job.advancePayment}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    ₹{job.estimatedCost - job.advancePayment}
                  </p>
                </div>
              </div>

              {job.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Note:</strong> {job.notes}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Update Status
                </button>
                <button className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Print Receipt
                </button>
                <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
