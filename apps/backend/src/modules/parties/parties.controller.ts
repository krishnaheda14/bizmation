/**
 * Parties Controller
 * 
 * Handles customer and wholesaler CRUD operations
 */

import { Router, Request, Response } from 'express';

// Sample data for demonstration
const sampleParties = [
  // Customers
  {
    id: 'CUST001',
    type: 'customer',
    name: 'Priya Sharma',
    phone: '+91-9876543210',
    email: 'priya.sharma@example.com',
    address: '123, MG Road, Jayanagar',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560041',
    gstin: '29AAAAA0000A1Z5',
    trn: 'TRN-CUST001',
    loyaltyNumber: 'LOY-001',
    loyaltyPoints: 2850,
    balance: 0,
    totalPurchases: 285000,
    lastPurchaseDate: '2024-01-15',
  },
  {
    id: 'CUST002',
    type: 'customer',
    name: 'Rajesh Kumar',
    phone: '+91-9876543211',
    email: 'rajesh.kumar@example.com',
    address: '45, Brigade Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560025',
    gstin: '29BBBBB0000B1Z5',
    trn: 'TRN-CUST002',
    loyaltyNumber: 'LOY-002',
    loyaltyPoints: 1560,
    balance: 15000,
    totalPurchases: 156000,
    lastPurchaseDate: '2024-01-10',
  },
  {
    id: 'CUST003',
    type: 'customer',
    name: 'Sunita Patel',
    phone: '+91-9876543212',
    email: 'sunita.patel@example.com',
    address: '78, Residency Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560025',
    trn: 'TRN-CUST003',
    loyaltyNumber: 'LOY-003',
    loyaltyPoints: 4200,
    balance: 0,
    totalPurchases: 420000,
    lastPurchaseDate: '2024-01-18',
  },
  
  // Wholesalers
  {
    id: 'WHOLE001',
    type: 'wholesaler',
    name: 'Ramesh Gupta',
    businessName: 'Mumbai Bullion Traders',
    phone: '+91-22-12345678',
    email: 'ramesh@mumbaibullion.com',
    address: 'Shop 12, Zaveri Bazaar',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400003',
    gstin: '27CCCCC0000C1Z5',
    balance: 125000,
    totalPurchases: 2850000,
    lastPurchaseDate: '2024-01-20',
  },
  {
    id: 'WHOLE002',
    type: 'wholesaler',
    name: 'Venkatesh Iyer',
    businessName: 'Chennai Gold Mart',
    phone: '+91-44-87654321',
    email: 'venkat@chennaigold.com',
    address: '23, T Nagar Main Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600017',
    gstin: '33DDDDD0000D1Z5',
    balance: 85000,
    totalPurchases: 1950000,
    lastPurchaseDate: '2024-01-12',
  },
];

export function partiesRouter(): Router {
  const router = Router();

  /**
   * GET /api/parties
   * Get all parties (customers and wholesalers)
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: sampleParties,
        count: sampleParties.length,
      });
    } catch (error: any) {
      console.error('[Parties API] Error fetching parties:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/parties
   * Add a new party
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const newParty = {
        id: `${req.body.type === 'customer' ? 'CUST' : 'WHOLE'}${String(sampleParties.length + 1).padStart(3, '0')}`,
        ...req.body,
        balance: 0,
        totalPurchases: 0,
        loyaltyPoints: req.body.type === 'customer' ? 0 : undefined,
        loyaltyNumber: req.body.type === 'customer' ? `LOY-${String(sampleParties.length + 1).padStart(3, '0')}` : undefined,
      };
      
      sampleParties.push(newParty);

      res.status(201).json({
        success: true,
        data: newParty,
      });
    } catch (error: any) {
      console.error('[Parties API] Error adding party:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
