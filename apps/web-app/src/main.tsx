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
import { NomineePage } from './pages/Nominee';
import { LegalPoliciesPage } from './pages/LegalPoliciesPage';

const PUBLIC_ROUTES = new Set([
  '/terms-and-conditions',
  '/privacy-policy',
  '/refund-cancellation-policy',
  '/return-policy',
  '/shipping-policy',
]);

function getActiveRouteFromLocation(): string {
  const hashRoute = window.location.hash.slice(1);
  const route = (hashRoute || window.location.pathname || '/').trim();
  if (route.length > 1 && route.endsWith('/')) return route.slice(0, -1);
  return route || '/';
}

function renderPublicPage(route: string) {
  if (route === '/privacy-policy') return <LegalPoliciesPage section="privacy" />;
  if (route === '/refund-cancellation-policy') return <LegalPoliciesPage section="refund" />;
  if (route === '/return-policy') return <LegalPoliciesPage section="return" />;
  if (route === '/shipping-policy') return <LegalPoliciesPage section="shipping" />;
  return <LegalPoliciesPage section="terms" />;
}

function App() {
  const [currentRoute, setCurrentRoute] = useState('/');
  const { currentUser, loadingAuth, userProfile } = useAuth();

  // Simple hash-based routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getActiveRouteFromLocation());
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // ── Loading spinner while Firebase resolves auth ──────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950 to-black flex items-center justify-center overflow-hidden relative">
        {/* Animated Background Sparkles & Dust layer */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,1)] animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="absolute top-[60%] left-[80%] w-3 h-3 bg-gray-200 rounded-full shadow-[0_0_12px_rgba(229,231,235,1)] animate-pulse" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute top-[80%] left-[30%] w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,1)] animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
          <div className="absolute top-[30%] left-[70%] w-2.5 h-2.5 bg-yellow-100 rounded-full shadow-[0_0_10px_rgba(254,240,138,1)] animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
          <div className="absolute top-[10%] left-[50%] w-2 h-2 bg-stone-300 rounded-full shadow-[0_0_10px_rgba(214,211,209,1)] animate-ping" style={{ animationDuration: '4s', animationDelay: '2s' }}></div>
          <div className="absolute top-[75%] left-[55%] w-3 h-3 bg-amber-200 rounded-full shadow-[0_0_15px_rgba(253,230,138,1)] animate-pulse" style={{ animationDuration: '2s', animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Animated rings */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Outer large pulse ring */}
            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            {/* Middle gold spin ring */}
            <div className="absolute inset-2 border-[5px] border-amber-400 rounded-full border-t-transparent border-b-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
            {/* Inner silver-ish spin ring */}
            <div className="absolute inset-5 border-4 border-gray-300 rounded-full border-l-transparent border-r-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            
            {/* Core shining coin body */}
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-300 via-yellow-500 to-amber-700 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center animate-pulse">
              <span className="text-2xl drop-shadow-md">✨</span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 animate-pulse tracking-widest pb-1 drop-shadow-lg">
              BIZMATION GOLD
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce shadow-md" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce shadow-md" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-amber-600 rounded-full animate-bounce shadow-md" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-amber-500/80 font-medium text-xs tracking-wider uppercase mt-4 animate-pulse">
              Loading Secure Vault
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth wall: not signed in ──────────────────────────────────────────────
  if (!currentUser) {
    if (PUBLIC_ROUTES.has(currentRoute)) {
      return <ThemeProvider>{renderPublicPage(currentRoute)}</ThemeProvider>;
    }
    return <ThemeProvider><AuthPage /></ThemeProvider>;
  }

  // ── Redirect signed-in user away from /auth pages ─────────────────────────
  if (currentRoute === '/auth' || currentRoute.startsWith('/auth/')) {
    window.location.hash = '#/';
    return null;
  }

  const isCustomer = userProfile?.role === 'CUSTOMER';
  const isSuperAdmin = userProfile?.role === 'SUPER_ADMIN';
  const ownerStatus = ((userProfile as any)?.shopVerificationStatus ?? '').toUpperCase();
  const isOwnerOrStaff = userProfile?.role === 'OWNER' || userProfile?.role === 'STAFF';
  const isOwnerPendingVerification = isOwnerOrStaff && ownerStatus !== 'APPROVED';

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
    if (PUBLIC_ROUTES.has(currentRoute)) return renderPublicPage(currentRoute);

    // Customer-only routes
    if (currentRoute === '/portfolio') return <CustomerPortfolio />;
    if (currentRoute === '/orders') return <Orders />;
    if (currentRoute === '/nominee') return <NomineePage />;
    if (currentRoute === '/profile') return <Profile />;
    if (currentRoute === '/redemption') return <RedemptionPage />;
    if (currentRoute === '/referral') return <Referral />;

    // For customer accounts, only home, portfolio and profile are allowed
    if (isCustomer) {
      return <HomeLanding />;
    }

    if (isOwnerPendingVerification && currentRoute !== '/' && currentRoute !== '/profile') {
      window.location.hash = '#/';
      return null;
    }

    // Shop / staff / owner routes
    switch (currentRoute) {
      case '/':
        return <HomeLanding />;
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
      // Legacy routes - keep for backward compat but hidden from nav
      case '/billing': return <Billing />;
      case '/inventory': return <Inventory />;
      case '/catalog': return <Catalog />;
      case '/repairs': return <Repairs />;
      case '/schemes': return <Schemes />;
      case '/shop-customers': return <ShopCustomers />;
      case '/suppliers': return <Suppliers />;
      case '/purchase-orders': return <PurchaseOrders />;
      case '/stock-on-hand': return <StockOnHand />;
      default:
        return <Dashboard />;
    }
  };

  // Pages that manage their own full-width layout
  const fullWidthRoutes = new Set([
    '/',
    '/rates',
    '/portfolio',
    '/orders',
    '/nominee',
    '/profile',
    '/redemption',
    '/referral',
    '/analytics',
    '/redemption-requests',
    '/super-admin',
    '/terms-and-conditions',
    '/privacy-policy',
    '/refund-cancellation-policy',
    '/return-policy',
    '/shipping-policy',
  ]);

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
