import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import { Layout } from './components/Layout';
import { HomeLanding } from './pages/HomeLanding';
import { CustomerPortfolio } from './pages/CustomerPortfolio';
import { ShopCustomers } from './pages/ShopCustomers';
import { Dashboard } from './pages/Dashboard';
import { Billing } from './pages/BillingEnhanced';
import { Inventory } from './pages/Inventory';
import { Catalog } from './pages/Catalog';
import { GoldRates } from './pages/GoldRates';
import { Parties } from './pages/Parties';
import { Repairs } from './pages/Repairs';
import { Schemes } from './pages/Schemes';
import { Suppliers } from './pages/Suppliers';
import { Orders } from './pages/Orders';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { StockOnHand } from './pages/StockOnHand';
import { Profile } from './pages/Profile';
import { Analytics } from './pages/Analytics';
import { Referral } from './pages/Referral';
import { RedemptionPage } from './pages/RedemptionPage';
import { RedemptionRequests } from './pages/RedemptionRequests';
import { SuperAdmin } from './pages/SuperAdmin';

function App() {
  const [currentRoute, setCurrentRoute] = useState('/');
  const { currentUser, loadingAuth, userProfile } = useAuth();

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ── Loading spinner while Firebase resolves auth ──────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-amber-700 font-medium text-sm">Loading Bizmation Gold…</p>
        </div>
      </div>
    );
  }

  // ── Auth wall: not signed in ──────────────────────────────────────────────
  if (!currentUser) {
    return <ThemeProvider><AuthPage /></ThemeProvider>;
  }

  // ── Redirect signed-in user away from /auth pages ─────────────────────────
  if (currentRoute === '/auth' || currentRoute.startsWith('/auth/')) {
    window.location.hash = '#/';
    return null;
  }

  const isCustomer   = userProfile?.role === 'CUSTOMER';
  const isSuperAdmin = userProfile?.role === 'SUPER_ADMIN';

  // ── Super Admin: full-platform console ────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <ThemeProvider>
        {currentRoute === '/super-admin'
          ? <SuperAdmin />
          : (() => { window.location.hash = '#/super-admin'; return null; })()}
      </ThemeProvider>
    );
  }

  // Render component based on route
  const renderPage = () => {
    // Customer-only routes
    if (currentRoute === '/portfolio')  return <CustomerPortfolio />;
    if (currentRoute === '/orders')     return <Orders />;
    if (currentRoute === '/profile')    return <Profile />;
    if (currentRoute === '/redemption') return <RedemptionPage />;
    if (currentRoute === '/referral')   return <Referral />;

    // For customer accounts, only home, portfolio and profile are allowed
    if (isCustomer) {
      return <HomeLanding />;
    }

    // Shop / staff / owner routes
    switch (currentRoute) {
      case '/':
        return <HomeLanding />;
      case '/dashboard':
        return <Dashboard />;
      case '/dashboard':
        return <Dashboard />;
      case '/parties':
        return <Parties />;
      case '/analytics':
        return <Analytics />;
      case '/redemption-requests':
        return <RedemptionRequests />;
      case '/rates':
        return <GoldRates />;
      // Legacy routes — keep for backward compat but hidden from nav
      case '/billing':         return <Billing />;
      case '/inventory':       return <Inventory />;
      case '/catalog':         return <Catalog />;
      case '/repairs':         return <Repairs />;
      case '/schemes':         return <Schemes />;
      case '/shop-customers':  return <ShopCustomers />;
      case '/suppliers':       return <Suppliers />;
      case '/purchase-orders': return <PurchaseOrders />;
      case '/stock-on-hand':   return <StockOnHand />;
      default:
        return <Dashboard />;
    }
  };

  // Pages that manage their own full-width layout
  const fullWidthRoutes = new Set(['/', '/rates', '/portfolio', '/orders', '/profile', '/redemption', '/referral', '/analytics', '/redemption-requests', '/super-admin']);

  return (
    <ThemeProvider>
      <Layout>
        {fullWidthRoutes.has(currentRoute)
          ? renderPage()
          : <div className="p-4 lg:p-8 bg-stone-50 dark:bg-gray-900 min-h-screen">{renderPage()}</div>}
      </Layout>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
