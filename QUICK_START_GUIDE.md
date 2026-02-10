# 🎯 Quick Start Guide for Jewelry Retailers

## Welcome to Your New Jewelry Management Platform! 💎

This guide will help you get started with all the amazing features designed specifically for jewelry retailers.

---

## 🚀 Getting Started

### 1. Setup (One-Time)
1. Open the `.env` file
2. Add your DeepSeek API key: `DEEPSEEK_API_KEY=your_key_here`
3. Save the file
4. Restart the application

### 2. First Login
- Open your web browser
- Navigate to `http://localhost:5173` (or your server URL)
- You'll see the Dashboard

---

## 📚 Feature Guide

### 🏠 Dashboard
**What it shows:**
- Total sales overview
- Inventory count
- Recent activity
- Quick action buttons

**How to use:**
- Click any metric card to see details
- Use quick action buttons to jump to common tasks
- Toggle dark mode with the moon icon in sidebar

---

### 🛒 Billing (Invoice Generation)

**How to create an invoice:**
1. Click "Billing" in the sidebar
2. Select customer (or use Walk-in Customer)
3. Today's gold rate shows automatically
4. Click "Add Item" to add products
5. Enter product details or scan barcode
6. System calculates GST automatically (3% = 1.5% CGST + 1.5% SGST)
7. Add discount if needed
8. Click "Generate Invoice"

**Pro Tips:**
- ⚡ Use barcode scanner for fast entry
- 💰 Gold rate updates automatically
- 📄 Invoices are GST-compliant
- 🖨️ Print or send digital copy

---

### 📦 Inventory Management

**Adding new items:**
1. Go to "Inventory"
2. Click "Add Item"
3. Fill in details:
   - SKU/Barcode
   - Product name
   - Category (Ring, Necklace, etc.)
   - Metal type & purity
   - Weight
   - Making charges
   - Price
4. Save

**Managing inventory:**
- 🔍 Search by name or SKU
- 🏷️ Filter by category
- ✏️ Edit items inline
- 📊 See total value at a glance

**Pro Tip:** Use clear, consistent SKU patterns like `RG-001`, `NK-002` for easy tracking

---

### 📸 Catalog (AI-Powered)

**TWO WAYS TO ADD ITEMS:**

#### Option 1: Take Photo with Camera
1. Go to "Catalog" → "Upload Item"
2. Click "Take Photo"
3. Allow camera access
4. Point camera at jewelry
5. Click "📸 Capture Photo"
6. AI will recognize metal type automatically!
7. Fill remaining details
8. Click "Add to Catalog"

#### Option 2: Upload Existing Image
1. Click "Upload Image"
2. Select image from computer
3. AI recognizes the item
4. Fill in details
5. Add to catalog

**What the AI detects:**
- 🤖 Jewelry type (ring, necklace, etc.)
- ✨ Metal type (gold, silver, platinum)
- 💎 Approximate purity

**View Catalog:**
- Switch to "View Catalog" tab
- See all items with images
- Filter by metal type, purity
- Click AR icon for preview (coming soon!)

---

### 🔧 Repairs & Job Work (NEW!)

**When to use:**
- Customer brings item for repair
- Customization orders
- Resizing requests
- Polishing jobs
- Stone setting work

**Creating a repair job:**
1. Go to "Repairs"
2. Click "New Job"
3. Enter:
   - Customer details
   - Item description
   - Repair type
   - Estimated cost
   - Advance payment received
   - Promised delivery date
   - Special notes
4. Save

**Tracking jobs:**
- 📊 Dashboard shows: Total, Pending, In Progress, Ready
- 🔍 Search by job number or customer
- 🎨 Color-coded status badges
- 📝 Update status as work progresses
- 💰 Balance calculation automatic

**Status Flow:**
1. **Pending** → Item received, not started
2. **In Progress** → Work in progress
3. **Ready** → Ready for customer pickup
4. **Delivered** → Item returned to customer
5. **Cancelled** → Job cancelled

**Pro Tips:**
- 📸 Take photos of item when received
- 📝 Note any existing damage
- ⏰ Set realistic delivery dates
- 💵 Always take advance payment

---

### 💰 Schemes Management (NEW!)

**What are schemes?**
Popular in India - customers pay monthly installments to buy gold at maturity with bonus.

**Example:**
- Customer pays ₹5,000/month
- Duration: 11 months
- Total paid: ₹55,000
- Bonus: 10% = ₹5,500
- **Final value: ₹60,500 in gold!**

**Creating a scheme:**
1. Go to "Schemes"
2. Click "New Scheme"
3. Enter:
   - Customer details
   - Scheme type (Gold/Diamond/Platinum)
   - Monthly installment amount
   - Number of months (usually 11)
   - Bonus percentage (usually 10%)
   - Start date
4. Save

**Managing schemes:**
- 📊 Dashboard shows: Total, Active, Matured
- 📈 Progress bar for each scheme
- 💵 Record monthly payments
- 🔔 Maturity alerts
- 🎁 Bonus calculation automatic

**Recording payments:**
1. Find customer's scheme
2. Click "Record Payment"
3. Enter payment date and amount
4. System updates progress automatically

**At Maturity:**
1. Scheme shows "Matured" status
2. Total value displayed (including bonus)
3. Customer can:
   - Buy gold of equivalent value
   - Buy specific jewelry
   - Get cash (if policy allows)

**Pro Tips:**
- 🎯 Offer 10-12% bonus to stay competitive
- 📱 Send payment reminders via WhatsApp
- 🎁 Special offers at maturity increase redemption
- 📊 Track defaulters early

---

### 👥 Parties (Customers)

**Adding customers:**
1. Go to "Parties"
2. Click "Add Customer"
3. Fill details:
   - Name
   - Phone (required)
   - Email
   - Address
   - GST number (for business customers)
4. Save

**Why add customers?**
- 📜 Purchase history tracking
- 🎁 Loyalty programs
- 📧 Marketing campaigns
- 💳 Credit management
- 📊 Customer analytics

---

### 🤖 AI Insights

**What it shows:**
- 📈 Sales trends
- 💰 Revenue analysis
- 📦 Inventory insights
- 🎯 Popular products
- 📊 Pattern recognition

**How to use:**
1. Go to "AI Insights"
2. Select date range
3. View recommendations
4. Act on insights for business growth

**Pro Tips:**
- Check weekly for trends
- Plan inventory based on predictions
- Identify slow-moving items
- Optimize pricing strategies

---

### 📈 Gold Rates

**Fetching live rates:**
1. Go to "Gold Rates"
2. Click "Fetch Live Rate"
3. Current rates display instantly
4. Updates saved to database

**Features:**
- 🌍 Real-time international rates
- 💱 Automatic USD to INR conversion
- 🏆 Purity-wise rates (24K, 22K, 18K, 14K)
- 📊 Historical tracking

**Manual entry:**
- Use when offline
- Override system rates
- Set custom rates for promotions

---

## 🌙 Dark Mode

**Benefits:**
- Reduces eye strain
- Works great in different lighting
- Looks professional
- Battery saving on OLED screens

**How to toggle:**
- Click moon/sun icon in sidebar
- Switches entire application
- Preference saved automatically

---

## 💡 Best Practices

### Daily Routine:
1. ✅ Check repair jobs due today
2. ✅ Review scheme payments pending
3. ✅ Update gold rates
4. ✅ Process invoices
5. ✅ Check inventory levels

### Weekly Routine:
1. 📊 Review AI insights
2. 📈 Analyze sales trends
3. 🔄 Update slow-moving inventory
4. 📱 Follow up with scheme customers
5. ✉️ Send marketing campaigns

### Monthly Routine:
1. 💼 Generate reports
2. 📊 Stock valuation
3. 💰 Scheme maturities
4. 🎁 Loyalty program rewards
5. 📈 Business planning

---

## 🆘 Troubleshooting

### Camera not working?
- ✅ Grant camera permissions
- ✅ Use HTTPS or localhost
- ✅ Check browser compatibility
- ✅ Ensure good lighting

### Gold rates not updating?
- ✅ Check internet connection
- ✅ Try manual fetch
- ✅ Verify API is accessible
- ✅ Enter manually if needed

### Dark mode text not visible?
- ✅ This is fixed! All text should be visible
- ✅ If issues persist, refresh page
- ✅ Clear browser cache

### Invoice not generating?
- ✅ Ensure all required fields filled
- ✅ Check item quantities > 0
- ✅ Verify calculations correct
- ✅ Check printer connection

---

## 📞 Support

### Need Help?
- 📖 Read documentation files
- 💬 Contact technical support
- 🎓 Watch video tutorials (coming soon)
- 📧 Email: support@jewelryplatform.com

---

## 🎯 Success Tips

### Maximize Sales:
1. **Use Schemes**
   - Great for customer retention
   - Recurring revenue
   - Builds loyalty

2. **Professional Invoices**
   - GST-compliant
   - Clear pricing
   - Company branding

3. **Repair Services**
   - Additional revenue stream
   - Customer touchpoints
   - Cross-selling opportunities

4. **AI Catalog**
   - Faster product entry
   - Professional presentation
   - Better customer experience

### Grow Your Business:
1. **Track Everything**
   - Every sale, every item
   - Customer preferences
   - Seasonal trends

2. **Use Analytics**
   - AI insights guide decisions
   - Optimize inventory
   - Plan promotions

3. **Customer Engagement**
   - Scheme reminders
   - Repair updates
   - Special offers

4. **Stay Updated**
   - Regular gold rate updates
   - Follow market trends
   - Competitive pricing

---

## 🎉 You're Ready!

**You now have:**
- ✅ Modern POS system
- ✅ AI-powered catalog
- ✅ Repair management
- ✅ Scheme tracking
- ✅ Professional invoicing
- ✅ Live gold rates
- ✅ Customer management
- ✅ Business insights

**Start small:**
1. Create a few test invoices
2. Add some inventory items
3. Try the camera feature
4. Create a sample repair job
5. Set up a test scheme

**Then go live:**
- Train your staff
- Import existing data
- Start processing real transactions
- Watch your business grow!

---

**Remember:** This system is designed to make your  life easier and your business more profitable. Don't hesitate to explore all features!

**Happy Selling! 💎✨**

---

*Need training or have questions? We're here to help!*
*Last Updated: February 10, 2026*
