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
    { id: 'home', label: 'Home', icon: <Home size={20} />, path: '/' },
    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={20} />, path: '/dashboard' },
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
    <div className="min-h-screen bg-amber-50 dark:bg-gray-900">
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
          fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-amber-900 via-yellow-900 to-amber-950 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-amber-700/50 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">💎</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-amber-100 dark:text-white">Jewelry POS</h1>
                <p className="text-xs text-amber-400 dark:text-gray-400">Gold & Silver Online</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-amber-400 hover:text-amber-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const currentHash = typeof window !== 'undefined' ? (window.location.hash.slice(1) || '/') : '/';
              const isActive = currentHash === item.path;
              return (
                <a
                  key={item.id}
                  href={`#${item.path}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? 'bg-amber-500 dark:bg-yellow-500/20 text-black dark:text-yellow-300 shadow-md'
                      : 'text-amber-200 dark:text-gray-300 hover:bg-amber-800/60 dark:hover:bg-gray-700 hover:text-amber-100 dark:hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Dark Mode Toggle */}
          <div className="p-3 border-t border-amber-700/50 dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-amber-800/40 dark:bg-gray-700 hover:bg-amber-800/60 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm font-medium text-amber-200 dark:text-gray-300">
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              {isDarkMode ? (
                <Moon size={20} className="text-blue-400" />
              ) : (
                <Sun size={20} className="text-yellow-400" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-700/50 dark:border-gray-700">
            <div className="text-xs text-amber-500 dark:text-gray-500 text-center">
              <p>© 2026 Jewelry Platform</p>
              <p className="mt-1">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden bg-gradient-to-r from-amber-900 to-yellow-800 dark:bg-gray-900 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-amber-200 dark:text-gray-300"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-black text-amber-100 dark:text-white">
              <span className="text-yellow-400">💎</span> Jewelry POS
            </h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen bg-amber-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};
