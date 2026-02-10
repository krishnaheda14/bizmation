# API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.jewelryplatform.com/api
```

## Authentication

All API requests require authentication using JWT tokens (to be implemented).

```http
Authorization: Bearer <token>
```

---

## Common Headers

```http
Content-Type: application/json
x-shop-id: <shop-id>
Authorization: Bearer <token>
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

## Endpoints

## Metal Lots

### Create Metal Lot

```http
POST /inventory/metal-lots
```

**Request Body:**
```json
{
  "metalType": "GOLD",
  "purity": 22,
  "weightGrams": 100.5,
  "purchaseDate": "2024-02-10",
  "purchaseRate": 6000.00,
  "totalCost": 603000.00,
  "supplier": "ABC Gold Suppliers",
  "invoiceNumber": "INV-2024-001",
  "notes": "Premium quality gold"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ml-1707577200000-abc123",
    "shopId": "shop-001",
    "metalType": "GOLD",
    "purity": 22,
    "weightGrams": 100.5,
    "remainingWeightGrams": 100.5,
    "purchaseDate": "2024-02-10T00:00:00.000Z",
    "purchaseRate": 6000.00,
    "totalCost": 603000.00,
    "supplier": "ABC Gold Suppliers",
    "invoiceNumber": "INV-2024-001",
    "notes": "Premium quality gold",
    "createdAt": "2024-02-10T12:00:00.000Z",
    "updatedAt": "2024-02-10T12:00:00.000Z",
    "syncStatus": "SYNCED",
    "version": 1
  }
}
```

### Get Metal Lots

```http
GET /inventory/metal-lots?metalType=GOLD&purity=22&hasRemainingWeight=true
```

**Query Parameters:**
- `metalType` (optional): GOLD, SILVER, PLATINUM
- `purity` (optional): 18, 22, 24, etc.
- `hasRemainingWeight` (optional): true/false

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### Get Metal Lot by ID

```http
GET /inventory/metal-lots/:id
```

**Response:** Single metal lot object

---

## Products

### Create Product

```http
POST /inventory/products
```

**Request Body:**
```json
{
  "metalLotId": "ml-1707577200000-abc123",
  "sku": "RING-001",
  "name": "22K Gold Ring with Diamond",
  "category": "RING",
  "metalType": "GOLD",
  "purity": 22,
  "grossWeightGrams": 5.5,
  "netWeightGrams": 5.0,
  "stoneWeightCarats": 0.25,
  "makingCharges": 2000.00,
  "wastagePercentage": 5.0,
  "customDesign": false,
  "hsnCode": "71131910",
  "isHallmarked": true,
  "hallmarkNumber": "HM-2024-001",
  "images": [
    "https://example.com/ring1.jpg",
    "https://example.com/ring2.jpg"
  ],
  "tags": ["gold", "ring", "diamond"],
  "description": "Elegant 22K gold ring with brilliant diamond",
  "sellingPrice": 35000.00,
  "location": "Shelf-A-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod-1707577200000-xyz789",
    "shopId": "shop-001",
    "metalLotId": "ml-1707577200000-abc123",
    "sku": "RING-001",
    "name": "22K Gold Ring with Diamond",
    "category": "RING",
    "costPrice": 32450.00,
    "sellingPrice": 35000.00,
    "isAvailable": true,
    ...
  }
}
```

### Search Products

```http
GET /inventory/products?category=RING&metalType=GOLD&purity=22&isAvailable=true&search=diamond&page=1&pageSize=20
```

**Query Parameters:**
- `category` (optional): NECKLACE, RING, EARRING, etc.
- `metalType` (optional): GOLD, SILVER, PLATINUM
- `purity` (optional): 18, 22, 24
- `isAvailable` (optional): true/false
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

### Get Product by ID

```http
GET /inventory/products/:id
```

### Get Product by SKU

```http
GET /inventory/products/sku/:sku
```

### Update Product

```http
PUT /inventory/products/:id
```

**Request Body:** Partial product object

### Delete Product

```http
DELETE /inventory/products/:id
```

**Note:** Soft delete - sets `deleted_at` timestamp

---

## Gold Rate

### Get Current Gold Rate

```http
GET /inventory/gold-rate?metalType=GOLD&purity=22
```

**Query Parameters:**
- `metalType`: GOLD, SILVER, PLATINUM (default: GOLD)
- `purity`: 18, 22, 24 (default: 22)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gr-1707577200000-abc123",
    "metalType": "GOLD",
    "purity": 22,
    "ratePerGram": 6250.00,
    "source": "API",
    "effectiveDate": "2024-02-10T00:00:00.000Z",
    "isActive": true
  }
}
```

### Update Product Prices

```http
POST /inventory/update-prices
```

Updates all product prices based on latest gold rates.

**Response:**
```json
{
  "success": true,
  "message": "Updated 150 products",
  "data": {
    "updatedCount": 150
  }
}
```

---

## Valuation

### Calculate Product Valuation

```http
POST /inventory/products/calculate-valuation
```

**Request Body:**
```json
{
  "metalType": "GOLD",
  "purity": 22,
  "grossWeightGrams": 5.5,
  "netWeightGrams": 5.0,
  "makingCharges": 2000.00,
  "wastagePercentage": 5.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metalValue": 31562.50,
    "makingCharges": 2000.00,
    "stoneValue": 0,
    "gstAmount": 1006.88,
    "totalValue": 34569.38,
    "currentGoldRate": 6250.00
  }
}
```

---

## Reports

### Stock Valuation Report

```http
GET /inventory/reports/stock-valuation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 500,
    "availableProducts": 350,
    "soldProducts": 150,
    "totalStockValue": 5000000.00,
    "metalWiseValue": {
      "GOLD": 4500000.00,
      "SILVER": 500000.00
    },
    "categoryWiseCount": {
      "RING": 150,
      "NECKLACE": 100,
      "EARRING": 120
    },
    "deadStock": [...]
  }
}
```

---

## AI Services

Base URL: `http://localhost:8000`

### Process Image

```http
POST /process-image
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file
- `remove_background`: true/false
- `auto_tag`: true/false
- `generate_description`: true/false

**Response:**
```json
{
  "success": true,
  "original_filename": "ring.jpg",
  "operations": ["background_removal", "auto_tagging"],
  "tags": ["gold", "ring", "elegant"],
  "description": "Exquisite gold ring...",
  "processed_image_id": "abc123",
  "confidence": 0.85
}
```

### Remove Background

```http
POST /remove-background
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file

**Response:** PNG image with transparent background

### Auto Tag

```http
POST /auto-tag
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file

**Response:**
```json
{
  "success": true,
  "filename": "necklace.jpg",
  "tags": ["gold", "necklace", "handcrafted", "premium"],
  "confidence": 0.85
}
```

### Analyze Quality

```http
POST /analyze-quality
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Image file

**Response:**
```json
{
  "success": true,
  "filename": "product.jpg",
  "quality_score": 85.5,
  "metrics": {
    "sharpness": 120.5,
    "brightness": 180.2,
    "contrast": 65.8
  },
  "recommendations": [
    "Image quality is good!"
  ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `CONFLICT` | Resource conflict |
| `INTERNAL_ERROR` | Server error |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_API_ERROR` | External service error |

---

## Rate Limiting

API rate limits (to be implemented):
- 1000 requests per hour per IP
- 10,000 requests per day per shop

---

## Pagination

All list endpoints support pagination:

```
?page=1&pageSize=20
```

Maximum `pageSize`: 100

---

## Filtering & Sorting

List endpoints support filtering:

```
?category=RING&metalType=GOLD&sort=createdAt&order=desc
```

---

## Testing with cURL

### Create Product
```bash
curl -X POST http://localhost:3000/api/inventory/products \
  -H "Content-Type: application/json" \
  -H "x-shop-id: shop-001" \
  -d '{
    "sku": "TEST-001",
    "name": "Test Ring",
    "category": "RING",
    "metalType": "GOLD",
    "purity": 22,
    "grossWeightGrams": 5.0,
    "netWeightGrams": 5.0,
    "makingCharges": 1000,
    "wastagePercentage": 5,
    "hsnCode": "71131910",
    "isHallmarked": true
  }'
```

### Search Products
```bash
curl -X GET "http://localhost:3000/api/inventory/products?category=RING&page=1" \
  -H "x-shop-id: shop-001"
```

### Get Gold Rate
```bash
curl -X GET "http://localhost:3000/api/inventory/gold-rate?metalType=GOLD&purity=22"
```

---

## WebSocket Events (Future)

Real-time updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('product:created', (product) => {
  console.log('New product:', product);
});

ws.on('gold-rate:updated', (rate) => {
  console.log('Gold rate updated:', rate);
});
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'x-shop-id': 'shop-001'
  }
});

// Get products
const products = await client.get('/inventory/products');

// Create product
const product = await client.post('/inventory/products', {
  sku: 'RING-001',
  name: 'Gold Ring',
  // ...
});
```

---

## Postman Collection

Import the Postman collection for easy testing:

```bash
# Download collection
curl -o postman-collection.json https://api.jewelryplatform.com/postman/collection.json

# Import in Postman
# File > Import > Upload Files > postman-collection.json
```

---

## API Changelog

### v1.0.0 (Current)
- Initial release
- Inventory management
- Gold rate integration
- AI image processing
- Basic reporting

---

For more information, visit the [main documentation](../README.md).
