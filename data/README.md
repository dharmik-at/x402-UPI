# 🗄️ Data Directory

## 📊 Database Storage

This directory contains the SQLite database files for the x402-MCP-UPI system.

### 📁 Files Created:
- `x402-upi.db` - Main SQLite database (auto-created on first run)

### 🔧 Database Schema:
The database contains the following tables:

#### `payment_challenges`
- Tracks payment requests from clients/agents
- Status: PENDING → PAID/EXPIRED

#### `payments` 
- Records successful payments from PSP webhooks
- Links to payment challenges

#### `issued_receipts`
- Stores JWT receipts issued after successful payments
- Cryptographically signed proof of payment

#### `consumed_receipts`
- Tracks used receipts to prevent replay attacks
- Ensures one-time use of payment receipts

### 🚀 Auto-Initialization:
Database and tables are created automatically when the server starts.

### 🔧 Database Operations:
```bash
# View database (requires sqlite3)
sqlite3 data/x402-upi.db

# Common queries:
.tables
SELECT * FROM payment_challenges;
SELECT * FROM payments;
SELECT * FROM issued_receipts;
```

### 🧹 Cleanup:
```bash
# Reset database (development only)
rm data/x402-upi.db
# Will be recreated on next server start
```

---

**📝 Note**: Database files are gitignored for security and size reasons.
