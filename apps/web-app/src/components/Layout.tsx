/**
 * Main Navigation Layout
 * 
 * Professional sidebar navigation with modular routing
 */

import React, { useState } from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Camera,
  Menu,
  X,
  TrendingUp,
  Brain,
  Users,
  Sun,
  Moon,
  Wrench,
  Coins,
  Building2,
  ClipboardList,
  PackageCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { id: 'billing', label: 'Billing', icon: <ShoppingCart size={20} />, path: '/billing' },
    { id: 'inventory', label: 'Inventory', icon: <Package size={20} />, path: '/inventory' },
    { id: 'catalog', label: 'Catalog', icon: <Camera size={20} />, path: '/catalog' },
    { id: 'repairs', label: 'Repairs', icon: <Wrench size={20} />, path: '/repairs' },
    { id: 'schemes', label: 'Schemes', icon: <Coins size={20} />, path: '/schemes' },
    { id: 'parties', label: 'Customers', icon: <Users size={20} />, path: '/parties' },
    { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={20} />, path: '/suppliers' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: <ClipboardList size={20} />, path: '/purchase-orders' },
    { id: 'stock-on-hand', label: 'Stock on Hand', icon: <PackageCheck size={20} />, path: '/stock-on-hand' },
    { id: 'stock-movement', label: 'Stock Movement', icon: <ArrowRightLeft size={20} />, path: '/stock-movement' },
    { id: 'insights', label: 'AI Insights', icon: <Brain size={20} />, path: '/insights' },
    { id: 'rates', label: 'Gold Rates', icon: <TrendingUp size={20} />, path: '/rates' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">💎</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Jewelry POS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Professional Edition</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.path}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Dark Mode Toggle */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              {isDarkMode ? (
                <Moon size={20} className="text-blue-500" />
              ) : (
                <Sun size={20} className="text-yellow-500" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <p>© 2026 Jewelry Platform</p>
              <p className="mt-1">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Jewelry POS</h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
