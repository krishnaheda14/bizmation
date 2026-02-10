import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Billing } from './pages/BillingEnhanced';
import { Inventory } from './pages/Inventory';
import { Catalog } from './pages/Catalog';
import { GoldRates } from './pages/GoldRates';
import { Parties } from './pages/Parties';
import { AIInsights } from './pages/AIInsights';
import { Repairs } from './pages/Repairs';
import { Schemes } from './pages/Schemes';
import { Suppliers } from './pages/Suppliers';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { StockOnHand } from './pages/StockOnHand';
import { StockMovement } from './pages/StockMovement';

function App() {
  const [currentRoute, setCurrentRoute] = useState('/');

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Render component based on route
  const renderPage = () => {
    switch (currentRoute) {
      case '/':
        return <Dashboard />;
      case '/billing':
        return <Billing />;
      case '/inventory':
        return <Inventory />;
      case '/catalog':
        return <Catalog />;
      case '/repairs':
        return <Repairs />;
      case '/schemes':
        return <Schemes />;
      case '/parties':
        return <Parties />;
      case '/suppliers':
        return <Suppliers />;
      case '/purchase-orders':
        return <PurchaseOrders />;
      case '/stock-on-hand':
        return <StockOnHand />;
      case '/stock-movement':
        return <StockMovement />;
      case '/insights':
        return <AIInsights />;
      case '/rates':
        return <GoldRates />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ThemeProvider>
      <Layout>
        {renderPage()}
      </Layout>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
