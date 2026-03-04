/**
 * Main Navigation Layout
 * 
 * Professional sidebar navigation with modular routing
 */

import React, { useState } from 'react';
import {
  Home,
  Menu,
  X,
  TrendingUp,
  Users,
  Sun,
  Moon,
  ClipboardList,
  LogOut,
  UserCircle,
  Briefcase,
  Settings,
  BarChart3,
  ArrowDownCircle,
  Gift,
  LayoutDashboard,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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
  const { currentUser, userProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.hash = '#/auth';
  };

  const isCustomer = userProfile?.role === 'CUSTOMER';

  // Customer nav: digital-gold focused
  const customerNav: NavItem[] = [
    { id: 'home',       label: 'Home',           icon: <Home size={20} />,            path: '/' },
    { id: 'portfolio',  label: 'My Portfolio',   icon: <Briefcase size={20} />,        path: '/portfolio' },
    { id: 'orders',     label: 'My Orders',      icon: <ClipboardList size={20} />,    path: '/orders' },
    { id: 'redemption', label: 'Sell / Redeem',  icon: <ArrowDownCircle size={20} />,  path: '/redemption' },
    { id: 'referral',   label: 'Refer & Earn',   icon: <Gift size={20} />,             path: '/referral' },
    { id: 'profile',    label: 'My Profile',     icon: <Settings size={20} />,         path: '/profile' },
  ];

  // Owner nav: management focused, no billing/repairs/inventory
  const ownerNav: NavItem[] = [
    { id: 'home',                label: 'Home',                icon: <Home size={20} />,            path: '/' },
    { id: 'dashboard',           label: 'Dashboard',           icon: <LayoutDashboard size={20} />,  path: '/dashboard' },
    { id: 'rates',               label: 'Gold Rates',          icon: <TrendingUp size={20} />,       path: '/rates' },
    { id: 'parties',             label: 'Customers',           icon: <Users size={20} />,            path: '/parties' },
    { id: 'analytics',           label: 'Analytics',           icon: <BarChart3 size={20} />,        path: '/analytics' },
    { id: 'redemption-requests', label: 'Redemption Requests', icon: <ArrowDownCircle size={20} />,  path: '/redemption-requests' },
    { id: 'profile',             label: 'My Profile',          icon: <Settings size={20} />,         path: '/profile' },
  ];

  const navItems = isCustomer ? customerNav : ownerNav;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-900">
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
          fixed top-0 left-0 z-50 h-full w-64
          bg-gradient-to-b from-amber-50 via-stone-50 to-amber-100
          dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
          border-r border-amber-200 dark:border-gray-700
          shadow-xl shadow-amber-100/60 dark:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-5 border-b border-amber-200/80 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Bizmation"
                className="w-9 h-9 object-contain rounded-xl"
              />
              <div>
                <h1 className="text-base font-black text-amber-900 dark:text-white leading-tight">Bizmation Gold</h1>
                <p className="text-xs text-amber-500 dark:text-gray-400 font-medium">Gold & Silver Online</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X size={22} />
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 shadow-md shadow-amber-200/60 dark:from-yellow-500/20 dark:to-amber-500/20 dark:text-yellow-300 dark:shadow-none'
                      : 'text-stone-600 dark:text-gray-400 hover:bg-amber-100/70 dark:hover:bg-gray-700/80 hover:text-amber-800 dark:hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-amber-800 dark:text-yellow-400' : 'text-amber-400 dark:text-gray-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* User Profile + Sign Out */}
          {currentUser && (
            <div className="px-3 py-2.5 border-t border-amber-200/80 dark:border-gray-700">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-gray-800 border border-amber-200/60 dark:border-gray-600 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                  <UserCircle size={18} className="text-white" />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-semibold text-amber-900 dark:text-white truncate">
                    {userProfile?.name ?? currentUser.displayName ?? 'User'}
                  </p>
                  {userProfile?.shopName && (
                    <p className="text-[10px] text-amber-700 dark:text-yellow-500 truncate font-medium">{userProfile.shopName}</p>
                  )}
                  <p className="text-[10px] text-amber-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                  text-xs font-semibold text-red-600 dark:text-red-400
                  bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                  hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <div className="p-3 border-t border-amber-200/80 dark:border-gray-700">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-100/60 dark:bg-gray-700 hover:bg-amber-200/60 dark:hover:bg-gray-600 border border-amber-200/60 dark:border-transparent transition-all"
            >
              <span className="text-sm font-semibold text-stone-600 dark:text-gray-300">
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              {isDarkMode ? (
                <Moon size={18} className="text-amber-400" />
              ) : (
                <Sun size={18} className="text-amber-500" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-200/80 dark:border-gray-700">
            <div className="text-xs text-amber-400 dark:text-gray-500 text-center font-medium">
              <p>© 2026 Jewelry Platform</p>
              <p className="mt-0.5">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden bg-gradient-to-r from-amber-50 to-stone-50 dark:bg-gray-900 border-b border-amber-200 dark:border-gray-700 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-amber-600 dark:text-gray-300"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-base font-black text-amber-900 dark:text-white">
              Bizmation Gold
            </h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-screen bg-stone-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};
