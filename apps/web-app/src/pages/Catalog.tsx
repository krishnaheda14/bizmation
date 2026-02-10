/**
 * Catalog Page
 * 
 * Tabbed interface for catalog upload and viewing
 */

import React, { useState } from 'react';
import { CatalogUpload } from '../modules/catalog/components/CatalogUpload';
import { CatalogView } from '../modules/catalog/components/CatalogView';
import { Upload, Eye } from 'lucide-react';

export const Catalog: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'view' | 'upload'>('view');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 inline-flex">
        <button
          onClick={() => setActiveTab('view')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'view'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <Eye size={20} />
          View Catalog
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
          Upload Item
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'view' ? <CatalogView /> : <CatalogUpload />}
    </div>
  );
};
