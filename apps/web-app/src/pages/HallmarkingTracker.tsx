/**
 * Hallmarking & Certification Tracker
 * 
 * BIS Hallmarking compliance tracking system
 * Upload certificates, link to inventory, QR code verification
 * Customer certificate generation
 */

import React, { useState, useRef } from 'react';
import {
  Award,
  Upload,
  Link as LinkIcon,
  QrCode,
  FileText,
  Search,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  Download,
  Printer,
  Eye,
  X,
} from 'lucide-react';

interface HallmarkCertificate {
  id: string;
  certificateNo: string;
  huid: string; // Hallmark Unique ID
  inventoryItemId?: string;
  inventoryItemName?: string;
  metalType: 'GOLD' | 'SILVER' | 'PLATINUM';
  purity: number;
  grossWeight: number;
  netWeight: number;
  hallmarkCenter: string;
  hallmarkCenterCode: string;
  jewelerIdentification: string;
  purityGrade: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateFile?: string; // File path or URL
  qrCode?: string; // QR code data
  status: 'Active' | 'Expired' | 'Revoked' | 'Pending';
  notes: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  metalType: string;
  purity: number;
}

export const HallmarkingTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'certificates' | 'upload' | 'verify'>('certificates');
  const [certificates, setCertificates] = useState<HallmarkCertificate[]>([
    {
      id: '1',
      certificateNo: 'BIS/2026/001234',
      huid: '23K-ABCD-1234-5678',
      inventoryItemId: 'INV001',
      inventoryItemName: '22K Gold Necklace Set',
      metalType: 'GOLD',
      purity: 22,
      grossWeight: 45.5,
      netWeight: 44.2,
      hallmarkCenter: 'Mumbai Assaying Center',
      hallmarkCenterCode: 'MAC-001',
      jewelerIdentification: 'JWL-2026-001',
      purityGrade: '916 (22K)',
      issueDate: new Date('2025-11-15'),
      expiryDate: new Date('2030-11-15'),
      status: 'Active',
      notes: 'BIS certified hallmark',
    },
    {
      id: '2',
      certificateNo: 'BIS/2026/001235',
      huid: '24K-EFGH-5678-9012',
      metalType: 'GOLD',
      purity: 24,
      grossWeight: 10.5,
      netWeight: 10.5,
      hallmarkCenter: 'Delhi Assaying Center',
      hallmarkCenterCode: 'DAC-002',
      jewelerIdentification: 'JWL-2026-001',
      purityGrade: '999 (24K)',
      issueDate: new Date('2025-12-01'),
      status: 'Active',
      notes: 'Gold coin hallmark',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Award className="text-blue-600" />
            Hallmarking & Certification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            BIS Hallmark compliance and certification management
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-600 dark:text-green-400">Active</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {certificates.filter((c) => c.status === 'Active').length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Expiring Soon</p>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {
                certificates.filter(
                  (c) =>
                    c.expiryDate &&
                    c.expiryDate.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000
                ).length
              }
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-600 dark:text-red-400">Expired</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {certificates.filter((c) => c.status === 'Expired').length}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex">
        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'certificates'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <FileText size={20} />
          Certificates
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Upload size={20} />
          Upload Certificate
        </button>
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'verify'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <QrCode size={20} />
          Verify HUID
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'certificates' && (
        <CertificatesList
          certificates={certificates}
          onUpdate={(updated) =>
            setCertificates(certificates.map((c) => (c.id === updated.id ? updated : c)))
          }
        />
      )}
      {activeTab === 'upload' && (
        <UploadCertificate
          onSave={(cert) => {
            setCertificates([cert, ...certificates]);
            setActiveTab('certificates');
          }}
        />
      )}
      {activeTab === 'verify' && <VerifyHUID certificates={certificates} />}
    </div>
  );
};

// Certificates List Component
interface CertificatesListProps {
  certificates: HallmarkCertificate[];
  onUpdate: (certificate: HallmarkCertificate) => void;
}

const CertificatesList: React.FC<CertificatesListProps> = ({ certificates, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedCert, setSelectedCert] = useState<HallmarkCertificate | null>(null);

  const filteredCerts = certificates.filter((cert) => {
    const matchesSearch =
      cert.certificateNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.huid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.inventoryItemName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filterStatus || cert.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Revoked':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
              placeholder="Search by certificate no, HUID, or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Expired">Expired</option>
            <option value="Revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredCerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Award size={48} className="mx-auto mb-4 opacity-50" />
            <p>No certificates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Certificate / HUID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Linked Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Metal / Purity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Weight (g)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Expiry
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
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {cert.certificateNo}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {cert.huid}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {cert.inventoryItemName || (
                          <span className="text-gray-400 dark:text-gray-500 italic">
                            Not linked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {cert.metalType} {cert.purity}K
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {cert.purityGrade}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {cert.netWeight.toFixed(3)}g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {cert.issueDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {cert.expiryDate ? (
                        <div>
                          <div className="text-gray-600 dark:text-gray-300">
                            {cert.expiryDate.toLocaleDateString()}
                          </div>
                          {cert.expiryDate.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000 && (
                            <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                              <AlertCircle size={12} />
                              Expiring soon
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cert.status)}`}>
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedCert(cert)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                          title="Generate QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                        <button
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                          title="Print Certificate"
                        >
                          <Printer size={18} />
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

      {/* Certificate Details Modal */}
      {selectedCert && (
        <CertificateDetailsModal certificate={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  );
};

// Upload Certificate Component
interface UploadCertificateProps {
  onSave: (certificate: HallmarkCertificate) => void;
}

const UploadCertificate: React.FC<UploadCertificateProps> = ({ onSave }) => {
  const [formData, setFormData] = useState<Partial<HallmarkCertificate>>({
    certificateNo: '',
    huid: '',
    metalType: 'GOLD',
    purity: 22,
    grossWeight: 0,
    netWeight: 0,
    hallmarkCenter: '',
    hallmarkCenterCode: '',
    jewelerIdentification: '',
    purityGrade: '916 (22K)',
    issueDate: new Date(),
    status: 'Active',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock inventory items (in real app, fetch from API)
  const inventoryItems: InventoryItem[] = [
    { id: 'INV001', sku: 'GN-001', name: '22K Gold Necklace Set', category: 'Necklace', metalType: 'GOLD', purity: 22 },
    { id: 'INV002', sku: 'GC-001', name: '24K Gold Coin 10g', category: 'Coin', metalType: 'GOLD', purity: 24 },
    { id: 'INV003', sku: 'GB-001', name: '22K Gold Bangles Pair', category: 'Bangles', metalType: 'GOLD', purity: 22 },
  ];

  const filteredInventory = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const linkInventoryItem = (item: InventoryItem) => {
    setFormData({
      ...formData,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      metalType: item.metalType as 'GOLD' | 'SILVER' | 'PLATINUM',
      purity: item.purity,
    });
    setInventorySearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.certificateNo || !formData.huid) {
      alert('Please fill in certificate number and HUID');
      return;
    }

    const certificate: HallmarkCertificate = {
      id: String(Date.now()),
      certificateNo: formData.certificateNo!,
      huid: formData.huid!,
      inventoryItemId: formData.inventoryItemId,
      inventoryItemName: formData.inventoryItemName,
      metalType: formData.metalType!,
      purity: formData.purity!,
      grossWeight: formData.grossWeight!,
      netWeight: formData.netWeight!,
      hallmarkCenter: formData.hallmarkCenter!,
      hallmarkCenterCode: formData.hallmarkCenterCode!,
      jewelerIdentification: formData.jewelerIdentification!,
      purityGrade: formData.purityGrade!,
      issueDate: formData.issueDate!,
      expiryDate: formData.expiryDate,
      certificateFile: selectedFile?.name,
      status: formData.status!,
      notes: formData.notes!,
    };

    onSave(certificate);
    alert('✅ Certificate uploaded successfully!');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
        Upload Hallmark Certificate
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Certificate File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Certificate Document (PDF/Image)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-900/30"
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="text-blue-600" size={32} />
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-600 dark:text-gray-400">Click to upload certificate</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">PDF, JPG, PNG up to 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Certificate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Certificate Number *
            </label>
            <input
              type="text"
              value={formData.certificateNo}
              onChange={(e) => setFormData({ ...formData, certificateNo: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="BIS/2026/001234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              HUID (Hallmark Unique ID) *
            </label>
            <input
              type="text"
              value={formData.huid}
              onChange={(e) => setFormData({ ...formData, huid: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="23K-ABCD-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metal Type *
            </label>
            <select
              value={formData.metalType}
              onChange={(e) =>
                setFormData({ ...formData, metalType: e.target.value as 'GOLD' | 'SILVER' | 'PLATINUM' })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="PLATINUM">Platinum</option>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="24">24K (999)</option>
              <option value="22">22K (916)</option>
              <option value="20">20K (833)</option>
              <option value="18">18K (750)</option>
              <option value="14">14K (585)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Purity Grade
            </label>
            <input
              type="text"
              value={formData.purityGrade}
              onChange={(e) => setFormData({ ...formData, purityGrade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., 916 (22K)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gross Weight (grams) *
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.grossWeight}
              onChange={(e) => setFormData({ ...formData, grossWeight: parseFloat(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Net Weight (grams) *
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.netWeight}
              onChange={(e) => setFormData({ ...formData, netWeight: parseFloat(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hallmark Center *
            </label>
            <input
              type="text"
              value={formData.hallmarkCenter}
              onChange={(e) => setFormData({ ...formData, hallmarkCenter: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Mumbai Assaying Center"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Center Code *
            </label>
            <input
              type="text"
              value={formData.hallmarkCenterCode}
              onChange={(e) => setFormData({ ...formData, hallmarkCenterCode: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., MAC-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jeweler ID
            </label>
            <input
              type="text"
              value={formData.jewelerIdentification}
              onChange={(e) => setFormData({ ...formData, jewelerIdentification: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="JWL-2026-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Issue Date *
            </label>
            <input
              type="date"
              value={formData.issueDate?.toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, issueDate: new Date(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expiryDate?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                setFormData({ ...formData, expiryDate: e.target.value ? new Date(e.target.value) : undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Link to Inventory Item */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Inventory Item (Optional)
          </label>
          {formData.inventoryItemName ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
              <span className="flex-1 text-gray-800 dark:text-white">{formData.inventoryItemName}</span>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, inventoryItemId: undefined, inventoryItemName: undefined })
                }
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory by name or SKU..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {inventorySearch && filteredInventory.length > 0 && (
                <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 max-h-48 overflow-y-auto">
                  {filteredInventory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => linkInventoryItem(item)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-800 dark:text-white">{item.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.sku} | {item.metalType} {item.purity}K
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes / Remarks
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Any additional information..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Save Certificate
          </button>
        </div>
      </form>
    </div>
  );
};

// Verify HUID Component
interface VerifyHUIDProps {
  certificates: HallmarkCertificate[];
}

const VerifyHUID: React.FC<VerifyHUIDProps> = ({ certificates }) => {
  const [huidInput, setHuidInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<HallmarkCertificate | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleVerify = () => {
    if (!huidInput.trim()) {
      alert('Please enter a HUID to verify');
      return;
    }

    const found = certificates.find(
      (cert) => cert.huid.toLowerCase() === huidInput.toLowerCase().trim()
    );

    if (found) {
      setVerificationResult(found);
      setNotFound(false);
    } else {
      setVerificationResult(null);
      setNotFound(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Verification Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <QrCode className="text-blue-600" />
          Verify Hallmark HUID
        </h2>

        <div className="flex gap-4">
          <input
            type="text"
            value={huidInput}
            onChange={(e) => {
              setHuidInput(e.target.value);
              setNotFound(false);
              setVerificationResult(null);
            }}
            placeholder="Enter HUID (e.g., 23K-ABCD-1234-5678)"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg"
          />
          <button
            onClick={handleVerify}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
          >
            <Search size={20} />
            Verify
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          💡 Scan QR code on jewelry or enter HUID manually to verify authenticity
        </p>
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">
                ✅ Verified Authentic
              </h3>
              <p className="text-green-600 dark:text-green-400">
                BIS Hallmark Certificate Found
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-lg p-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Certificate No</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {verificationResult.certificateNo}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">HUID</p>
              <p className="font-semibold text-gray-900 dark:text-white font-mono">
                {verificationResult.huid}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Metal & Purity</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {verificationResult.metalType} {verificationResult.purity}K ({verificationResult.purityGrade})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Weight</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {verificationResult.netWeight.toFixed(3)} grams
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hallmark Center</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {verificationResult.hallmarkCenter}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Issue Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {verificationResult.issueDate.toLocaleDateString()}
              </p>
            </div>
            {verificationResult.inventoryItemName && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Linked Item</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {verificationResult.inventoryItemName}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {notFound && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">
                ❌ Not Found
              </h3>
              <p className="text-red-600 dark:text-red-400">
                HUID not found in our database. Please verify the entered HUID or contact support.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Certificate Details Modal
interface CertificateDetailsModalProps {
  certificate: HallmarkCertificate;
  onClose: () => void;
}

const CertificateDetailsModal: React.FC<CertificateDetailsModalProps> = ({ certificate, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Certificate Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* HUID QR Code Placeholder */}
          <div className="text-center">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <QrCode size={128} className="text-gray-400 dark:text-gray-600" />
            </div>
            <p className="mt-2 font-mono text-lg font-semibold text-gray-800 dark:text-white">
              {certificate.huid}
            </p>
          </div>

          {/* Certificate Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Certificate No" value={certificate.certificateNo} />
            <InfoRow label="Status" value={certificate.status} />
            <InfoRow label="Metal Type" value={certificate.metalType} />
            <InfoRow label="Purity" value={`${certificate.purity}K (${certificate.purityGrade})`} />
            <InfoRow label="Gross Weight" value={`${certificate.grossWeight.toFixed(3)}g`} />
            <InfoRow label="Net Weight" value={`${certificate.netWeight.toFixed(3)}g`} />
            <InfoRow label="Hallmark Center" value={certificate.hallmarkCenter} />
            <InfoRow label="Center Code" value={certificate.hallmarkCenterCode} />
            <InfoRow label="Jeweler ID" value={certificate.jewelerIdentification} />
            <InfoRow label="Issue Date" value={certificate.issueDate.toLocaleDateString()} />
            {certificate.expiryDate && (
              <InfoRow label="Expiry Date" value={certificate.expiryDate.toLocaleDateString()} />
            )}
            {certificate.inventoryItemName && (
              <InfoRow label="Linked Item" value={certificate.inventoryItemName} />
            )}
          </div>

          {certificate.notes && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</p>
              <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded p-3">
                {certificate.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
              <QrCode size={18} />
              Generate QR Code
            </button>
            <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
              <Printer size={18} />
              Print Certificate
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
              <Download size={18} />
              Download
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
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
  </div>
);
