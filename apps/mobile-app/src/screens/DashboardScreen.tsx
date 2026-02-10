/**
 * Dashboard Screen
 * 
 * Owner dashboard showing real-time sales, stock value, and pending dues
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { DailySalesReport, StockReport, GoldRate } from '@jewelry-platform/shared-types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  stockValue: number;
  pendingDues: number;
  goldRate: number;
  salesReport?: DailySalesReport;
  stockReport?: StockReport;
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData>({
    todaySales: 0,
    todayTransactions: 0,
    stockValue: 0,
    pendingDues: 0,
    goldRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch multiple endpoints in parallel
      const [salesResponse, stockResponse, goldRateResponse] = await Promise.all([
        axios.get(`${API_URL}/reports/daily-sales`, {
          headers: { 'x-shop-id': 'demo-shop-id' }, // Replace with actual shop ID
        }),
        axios.get(`${API_URL}/inventory/reports/stock-valuation`, {
          headers: { 'x-shop-id': 'demo-shop-id' },
        }),
        axios.get(`${API_URL}/inventory/gold-rate?metalType=GOLD&purity=22`),
      ]);

      const salesData = salesResponse.data.data as DailySalesReport;
      const stockData = stockResponse.data.data as StockReport;
      const goldRateData = goldRateResponse.data.data as GoldRate;

      setData({
        todaySales: salesData?.totalSales || 0,
        todayTransactions: salesData?.totalTransactions || 0,
        stockValue: stockData?.totalStockValue || 0,
        pendingDues: 0, // TODO: Fetch from pending payments API
        goldRate: goldRateData?.ratePerGram || 0,
        salesReport: salesData,
        stockReport: stockData,
      });
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Owner Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Gold Rate Banner */}
      <View style={styles.goldRateBanner}>
        <Text style={styles.goldRateLabel}>Today's Gold Rate (22K)</Text>
        <Text style={styles.goldRateValue}>₹{data.goldRate.toFixed(2)}/gram</Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(data.todaySales)}
          subtitle={`${data.todayTransactions} transactions`}
          color="#10b981"
          icon="💰"
        />
        
        <MetricCard
          title="Stock Value"
          value={formatCurrency(data.stockValue)}
          subtitle={`${data.stockReport?.availableProducts || 0} available items`}
          color="#3b82f6"
          icon="📦"
        />
        
        <MetricCard
          title="Pending Dues"
          value={formatCurrency(data.pendingDues)}
          subtitle="From customers"
          color="#f59e0b"
          icon="⏰"
        />
        
        <MetricCard
          title="Today's Purchases"
          value={formatCurrency(data.salesReport?.totalPurchases || 0)}
          subtitle="Inventory purchases"
          color="#8b5cf6"
          icon="🛍️"
        />
      </View>

      {/* Sales Breakdown */}
      {data.salesReport && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Methods</Text>
          <View style={styles.breakdownContainer}>
            <BreakdownItem
              label="Cash"
              value={formatCurrency(data.salesReport.cashSales)}
              percentage={calculatePercentage(data.salesReport.cashSales, data.todaySales)}
            />
            <BreakdownItem
              label="Card"
              value={formatCurrency(data.salesReport.cardSales)}
              percentage={calculatePercentage(data.salesReport.cardSales, data.todaySales)}
            />
            <BreakdownItem
              label="UPI"
              value={formatCurrency(data.salesReport.upiSales)}
              percentage={calculatePercentage(data.salesReport.upiSales, data.todaySales)}
            />
          </View>
        </View>
      )}

      {/* Stock Summary */}
      {data.stockReport && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory Summary</Text>
          <View style={styles.stockSummary}>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Total Products:</Text>
              <Text style={styles.stockValue}>{data.stockReport.totalProducts}</Text>
            </View>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Available:</Text>
              <Text style={[styles.stockValue, { color: '#10b981' }]}>
                {data.stockReport.availableProducts}
              </Text>
            </View>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Sold:</Text>
              <Text style={[styles.stockValue, { color: '#6b7280' }]}>
                {data.stockReport.soldProducts}
              </Text>
            </View>
            <View style={styles.stockRow}>
              <Text style={styles.stockLabel}>Dead Stock:</Text>
              <Text style={[styles.stockValue, { color: '#ef4444' }]}>
                {data.stockReport.deadStock.length}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionButton icon="📊" label="View Reports" />
          <ActionButton icon="📋" label="Inventory" />
          <ActionButton icon="👥" label="Customers" />
          <ActionButton icon="⚙️" label="Settings" />
        </View>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, color, icon }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

interface BreakdownItemProps {
  label: string;
  value: string;
  percentage: number;
}

const BreakdownItem: React.FC<BreakdownItemProps> = ({ label, value, percentage }) => (
  <View style={styles.breakdownItem}>
    <View style={styles.breakdownHeader}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${percentage}%` }]} />
    </View>
    <Text style={styles.breakdownPercentage}>{percentage.toFixed(1)}%</Text>
  </View>
);

interface ActionButtonProps {
  icon: string;
  label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label }) => (
  <TouchableOpacity style={styles.actionButton}>
    <Text style={styles.actionIcon}>{icon}</Text>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

// Helper Functions

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const calculatePercentage = (value: number, total: number): number => {
  return total > 0 ? (value / total) * 100 : 0;
};

// Styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#0284c7',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
  },
  goldRateBanner: {
    backgroundColor: '#fef3c7',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
  },
  goldRateLabel: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '600',
  },
  goldRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#b45309',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  metricCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  breakdownContainer: {
    gap: 16,
  },
  breakdownItem: {
    marginBottom: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  stockSummary: {
    gap: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stockLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (Dimensions.get('window').width - 72) / 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  footer: {
    height: 40,
  },
});
