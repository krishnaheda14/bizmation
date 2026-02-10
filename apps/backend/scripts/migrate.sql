-- Database Migration Script
-- Jewelry Retail Platform Schema

-- Create tables

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gst_number VARCHAR(15) NOT NULL,
    address JSONB NOT NULL,
    logo TEXT,
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(20) DEFAULT 'FREE',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Metal lots table
CREATE TABLE IF NOT EXISTS metal_lots (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    metal_type VARCHAR(20) NOT NULL,
    purity INTEGER NOT NULL,
    weight_grams DECIMAL(12, 3) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_rate DECIMAL(12, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100),
    remaining_weight_grams DECIMAL(12, 3) NOT NULL,
    notes TEXT,
    sync_status VARCHAR(20) DEFAULT 'SYNCED',
    version INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    metal_lot_id VARCHAR(100) REFERENCES metal_lots(id) ON DELETE SET NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    metal_type VARCHAR(20) NOT NULL,
    purity INTEGER NOT NULL,
    gross_weight_grams DECIMAL(12, 3) NOT NULL,
    net_weight_grams DECIMAL(12, 3) NOT NULL,
    stone_weight_carats DECIMAL(12, 3),
    making_charges DECIMAL(12, 2) NOT NULL,
    wastage_percentage DECIMAL(5, 2) NOT NULL,
    custom_design BOOLEAN DEFAULT false,
    hsn_code VARCHAR(20) NOT NULL,
    is_hallmarked BOOLEAN DEFAULT false,
    hallmark_number VARCHAR(100),
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    description TEXT,
    cost_price DECIMAL(12, 2) NOT NULL,
    selling_price DECIMAL(12, 2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    location VARCHAR(100),
    sync_status VARCHAR(20) DEFAULT 'SYNCED',
    version INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address JSONB,
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    date_of_birth DATE,
    anniversary DATE,
    notes TEXT,
    total_purchases DECIMAL(12, 2) DEFAULT 0,
    last_purchase_date DATE,
    loyalty_points INTEGER DEFAULT 0,
    sync_status VARCHAR(20) DEFAULT 'SYNCED',
    version INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL,
    bill_to_address JSONB,
    ship_to_address JSONB,
    subtotal DECIMAL(12, 2) NOT NULL,
    cgst DECIMAL(12, 2) NOT NULL,
    sgst DECIMAL(12, 2) NOT NULL,
    igst DECIMAL(12, 2) NOT NULL,
    total_gst DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    round_off DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    balance_amount DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    e_invoice_number VARCHAR(100),
    qr_code TEXT,
    notes TEXT,
    terms_and_conditions TEXT,
    sync_status VARCHAR(20) DEFAULT 'SYNCED',
    version INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id VARCHAR(100) REFERENCES customers(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    cgst DECIMAL(12, 2) NOT NULL,
    sgst DECIMAL(12, 2) NOT NULL,
    igst DECIMAL(12, 2) NOT NULL,
    total_gst DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    round_off DECIMAL(12, 2) DEFAULT 0,
    grand_total DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    balance_amount DECIMAL(12, 2) NOT NULL,
    created_by VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    sync_status VARCHAR(20) DEFAULT 'SYNCED',
    version INTEGER DEFAULT 1,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Transaction items table
CREATE TABLE IF NOT EXISTS transaction_items (
    id VARCHAR(100) PRIMARY KEY,
    transaction_id VARCHAR(100) REFERENCES transactions(id) ON DELETE CASCADE,
    product_id VARCHAR(100) REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    weight_grams DECIMAL(12, 3),
    rate DECIMAL(12, 2) NOT NULL,
    making_charges DECIMAL(12, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL,
    gst_amount DECIMAL(12, 2) NOT NULL,
    hsn_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gold rates table
CREATE TABLE IF NOT EXISTS gold_rates (
    id VARCHAR(100) PRIMARY KEY,
    metal_type VARCHAR(20) NOT NULL,
    purity INTEGER NOT NULL,
    rate_per_gram DECIMAL(12, 2) NOT NULL,
    source VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync operations queue table
CREATE TABLE IF NOT EXISTS sync_queue (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    error TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(100) REFERENCES shops(id) ON DELETE CASCADE,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Catalog items table (for display catalog with AI recognition)
CREATE TABLE IF NOT EXISTS catalog_items (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    metal_type VARCHAR(20) NOT NULL,
    purity INTEGER NOT NULL,
    weight_grams DECIMAL(12, 3),
    making_charges DECIMAL(12, 2),
    hsn_code VARCHAR(20) NOT NULL,
    image_url TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_customers_shop_id ON customers(shop_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_gold_rates_metal_purity ON gold_rates(metal_type, purity, is_active);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_audit_logs_shop_id ON audit_logs(shop_id);
CREATE INDEX idx_catalog_items_category ON catalog_items(category);
CREATE INDEX idx_catalog_items_metal_type ON catalog_items(metal_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_metal_lots_updated_at BEFORE UPDATE ON metal_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gold_rates_updated_at BEFORE UPDATE ON gold_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
