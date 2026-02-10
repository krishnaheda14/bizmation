/**
 * Catalog View Component
 * 
 * Displays jewelry catalog with filtering, search, and AR preview
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Grid, List, Sparkles } from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  metalType: string;
  purity: number;
  weightGrams: number;
  makingCharges: number;
  imageUrl: string;
  tags: string[];
  createdAt: string;
}

interface FilterState {
  category: string;
  metalType: string;
  purityMin: number;
  purityMax: number;
  searchQuery: string;
}

export const CatalogView: React.FC = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CatalogItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showARView, setShowARView] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    metalType: '',
    purityMin: 0,
    purityMax: 24,
    searchQuery: '',
  });

  // Fetch catalog items
  useEffect(() => {
    fetchCatalogItems();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  const fetchCatalogItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/catalog/items');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch catalog items:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Metal type filter
    if (filters.metalType) {
      filtered = filtered.filter(item => item.metalType === filters.metalType);
    }

    // Purity filter
    filtered = filtered.filter(
      item => item.purity >= filters.purityMin && item.purity <= filters.purityMax
    );

    setFilteredItems(filtered);
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      metalType: '',
      purityMin: 0,
      purityMax: 24,
      searchQuery: '',
    });
  };

  const openARView = (item: CatalogItem) => {
    setSelectedItem(item);
    setShowARView(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="text-yellow-500" />
          Jewelry Catalog
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jewelry..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Filter size={20} />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Categories</option>
                <option value="ring">Rings</option>
                <option value="necklace">Necklaces</option>
                <option value="earring">Earrings</option>
                <option value="bracelet">Bracelets</option>
                <option value="anklet">Anklets</option>
                <option value="mangalsutra">Mangalsutra</option>
                <option value="bangles">Bangles</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Metal Type</label>
              <select
                value={filters.metalType}
                onChange={(e) => setFilters({ ...filters, metalType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Metals</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Purity</label>
              <select
                value={filters.purityMin}
                onChange={(e) => setFilters({ ...filters, purityMin: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="0">Any</option>
                <option value="14">14K</option>
                <option value="18">18K</option>
                <option value="22">22K</option>
                <option value="24">24K</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 rounded-md text-gray-800 dark:text-white"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-gray-600 dark:text-gray-400">
        Showing {filteredItems.length} of {items.length} items
      </div>

      {/* Catalog Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No items found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative">
                <img
                  src={item.imageUrl || '/placeholder-jewelry.jpg'}
                  alt={item.name}
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={() => openARView(item)}
                  className="absolute top-2 right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  title="View in AR"
                >
                  <Eye size={20} />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.category}</p>
                
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">{item.metalType} {item.purity}K</span>
                  <span className="text-gray-600 dark:text-gray-400">{item.weightGrams}g</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex gap-4">
              <img
                src={item.imageUrl || '/placeholder-jewelry.jpg'}
                alt={item.name}
                className="w-32 h-32 object-cover rounded"
              />
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{item.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.category}</p>
                  </div>
                  <button
                    onClick={() => openARView(item)}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="View in AR"
                  >
                    <Eye size={20} />
                  </button>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-2 text-sm">{item.description}</p>

                <div className="flex gap-4 text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">{item.metalType} {item.purity}K</span>
                  <span className="text-gray-600 dark:text-gray-400">Weight: {item.weightGrams}g</span>
                  <span className="text-gray-600 dark:text-gray-400">Making: ₹{item.makingCharges}</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AR View Modal */}
      {showARView && selectedItem && (
        <ARViewModal
          item={selectedItem}
          onClose={() => setShowARView(false)}
        />
      )}
    </div>
  );
};

// AR View Modal Component
interface ARViewModalProps {
  item: CatalogItem;
  onClose: () => void;
}

const ARViewModal: React.FC<ARViewModalProps> = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            👁️ AR Preview: {item.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {/* AR Viewer Container */}
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 mb-4 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            {/* Placeholder for AR view - In production, integrate with AR.js, Model Viewer, or similar */}
            <img
              src={item.imageUrl || '/placeholder-jewelry.jpg'}
              alt={item.name}
              className="max-w-full max-h-[400px] mx-auto rounded-lg shadow-lg"
            />
            
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              📱 <strong>AR View Coming Soon!</strong>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Will support: Virtual try-on, 360° rotation, Size adjustment
            </p>
          </div>
        </div>

        {/* Item Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Category:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{item.category}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Metal:</span>
            <span className="ml-2 text-yellow-600 dark:text-yellow-400">{item.metalType} {item.purity}K</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Weight:</span>
            <span className="ml-2 text-gray-600">{item.weightGrams}g</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Making Charges:</span>
            <span className="ml-2 text-gray-600">₹{item.makingCharges}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-gray-700">{item.description}</p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
          >
            Close
          </button>
          <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Add to Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
