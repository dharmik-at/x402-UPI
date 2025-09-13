# 🚀 x402-MCP-UPI: Revolutionary AI Agent Payment System

## 🌟 THE WORLD'S FIRST AI AGENT PAYMENT SYSTEM USING UPI

A groundbreaking implementation combining **x402 Payment Required** + **Model Context Protocol (MCP)** + **India's UPI** to enable **AI agents to autonomously pay for services**! 

**THIS WILL CHANGE EVERYTHING!** 🔥

## 🎯 REVOLUTIONARY BREAKTHROUGH

### What We've Built:
🤖 **AI agents that can autonomously pay for services using India's UPI system**  
💳 **Seamless integration of x402 Protocol + MCP + UPI payments**  
🌍 **Bridge between AI capabilities and real-world financial transactions**  
⚡ **Instant micropayments for AI tool usage**  
🔐 **Cryptographically secured payment receipts**

### Why This Will Blow The Internet:

#### 🚀 **AI Agent Economy**
- **Autonomous AI Operations**: Agents can now operate independently with real money
- **Pay-Per-Use AI Tools**: No subscriptions - pay exactly for what you use
- **Global AI Marketplace**: Any AI agent worldwide can access UPI-powered services
- **Micropayment Revolution**: Enable ₹2-₹15 payments that were impossible before

#### 🇮🇳 **UPI + AI = Global Game Changer**
- **300M+ UPI Users**: Instant access to AI services for India's digital population
- **Real-Time Settlements**: Payments settle in seconds, not days
- **Zero Infrastructure**: No credit cards, banks, or complex setup needed
- **Mobile-First**: Works perfectly with India's smartphone-centric economy

#### 🔧 **Technical Innovation**
- **HTTP 402 Protocol**: First real-world implementation of payment-required HTTP status
- **MCP Integration**: Standard protocol for AI tool discovery and execution
- **Cryptographic Receipts**: JWT-based proof of payment prevents fraud
- **Multi-Agent Support**: Multiple AI agents can share the same payment infrastructure

#### 🌐 **Global Implications**
1. **AI Democratization**: Small AI agents can now monetize services globally
2. **Creator Economy 2.0**: AI-generated content with built-in payment collection
3. **Automated Commerce**: Agents trading with other agents autonomously
4. **Real-Time AI Markets**: Supply and demand driven pricing for AI capabilities

## 📋 Overview

This system enables **AI agents to autonomously pay for and consume services** using India's UPI payment infrastructure. When an agent requests a protected resource, the server responds with `402 Payment Required` and provides UPI payment options that the agent can handle programmatically.

### Key Features

#### 🤖 **AI Agent Features** (NEW!)
- 🔧 **MCP Tool Integration** - Standard protocol for AI tool discovery
- 💰 **Autonomous Payments** - Agents can pay for services automatically  
- 🎯 **Batch Tool Execution** - Multiple tool calls with optimized payments
- 📊 **Agent Analytics** - Spending tracking and budget management
- 🔄 **Payment Strategies** - Auto-pay, human approval, pre-funded wallets

#### 💳 **Payment System** 
- 🔐 **JWT Receipt System** - Cryptographically signed payment receipts
- 📱 **UPI Integration** - QR codes, deeplinks, instant settlements
- 🏦 **Mock PSP Service** - Simulates real payment service providers
- ⚡ **Real-time Processing** - Webhook handling and status polling
- 🚫 **Replay Protection** - Prevents receipt reuse and fraud

#### 🌐 **Human & AI Interfaces**
- 📱 **Interactive Demo Client** - Beautiful web interface for humans
- 🤖 **Agent API Endpoints** - RESTful APIs for AI agent integration  
- 🗄️ **SQLite Database** - Comprehensive payment and usage tracking
- 📋 **Tool Registry** - Discoverable AI services with pricing

## 🏗️ Revolutionary Architecture

### 🤖 AI Agent Flow (THE GAME CHANGER!)
```
┌──────────────┐   MCP Tool Call    ┌──────────────┐   402 Payment   ┌─────────────┐
│  AI Agent    │ ──────────────────→ │ MCP Server   │ ──────────────→ │ UPI Gateway │
│              │                     │              │                 │             │
│ ┌──────────┐ │   Payment Proof    │ ┌──────────┐ │   Tool Result   │ ┌─────────┐ │
│ │Auto-Pay  │ │ ←────────────────── │ │x402 Core │ │ ←────────────── │ │Webhook  │ │
│ │Engine    │ │                     │ └──────────┘ │                 │ │Handler  │ │
│ └──────────┘ │                     └──────────────┘                 │ └─────────┘ │
└──────────────┘                                                      └─────────────┘
       ▲                                     │                                │
       │ Budget & Spending                   ▼ JWT Receipt                     ▼
┌──────────────┐                    ┌──────────────┐                  ┌─────────────┐
│Agent Analytics│                   │  Tool Registry│                  │  Database   │
│& Wallet      │                   │  - Summary ₹5 │                  │  (SQLite)   │
└──────────────┘                   │  - Translate ₹3│                  └─────────────┘
                                   │  - Code Gen ₹10│
                                   └──────────────┘
```

### 👥 Human Flow (Traditional)
```
┌─────────────┐    402 Payment Required    ┌─────────────┐
│   Human     │ ──────────────────────────→ │   Server    │
│   Client    │                             │             │
│ ┌─────────┐ │    UPI QR / Deeplink       │ ┌─────────┐ │
│ │Web UI   │ │ ←────────────────────────── │ │Express  │ │
│ └─────────┘ │                             │ │API      │ │
└─────────────┘                             └─────────────┘
       │                                           │
       │ User scans QR/clicks payment             │
       ▼                                           ▼
┌─────────────┐         Webhook               ┌─────────────┐
│   Mock PSP  │ ──────────────────────────────→ │  Database   │
│   Service   │    (Payment Success)           │  (SQLite)   │  
└─────────────┘                                └─────────────┘
```

## 🚦 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   cd x402-UPI
   npm install
   ```

2. **Generate development keys**
   ```bash
   npm run setup-keys
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

4. **Test the system**
   
   **For Humans:**
   Navigate to http://localhost:3000/client/index.html
   
   **For AI Agents:**
   ```bash
   # Test AI agent demo
   npm run demo-agent
   
   # Or list available tools
   curl http://localhost:3000/mcp/tools/list | jq
   ```

## 🎯 How It Works

### Step 1: Request Protected Resource
```bash
curl -X POST http://localhost:3000/generate-summary \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your article text here..."}'
```

**Response: 402 Payment Required**
```json
{
  "error": "PaymentRequired",
  "payment_challenge": {
    "id": "payreq_abc123",
    "amount": 5.0,
    "currency": "INR",
    "expires_at": "2024-01-01T12:00:00.000Z",
    "payment_methods": ["UPI_DEEPLINK", "PSP_CHECKOUT"],
    "upi_deeplink": "upi://pay?pa=merchant@bank&pn=Demo&am=5.0&tn=payreq_abc123",
    "qr_png_url": "data:image/png;base64,...",
    "psp_checkout_url": "http://localhost:4001/mock/pay?order_id=payreq_abc123&amount=5.0"
  }
}
```

### Step 2: Complete Payment
- **Option A**: Scan QR code with UPI app
- **Option B**: Click mock checkout link (simulates PSP)

### Step 3: Receive Payment Confirmation
Mock PSP sends webhook → Server issues JWT receipt → Client polls status

### Step 4: Access Protected Resource
```bash
curl -X POST http://localhost:3000/generate-summary \\
  -H "Content-Type: application/json" \\
  -H "Authorization: UPI-Receipt eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -d '{"text": "Your article text here..."}'
```

**Response: 200 OK**
```json
{
  "success": true,
  "payreq_id": "payreq_abc123", 
  "summary": "SUMMARY for payreq payreq_abc123: Your article text here...",
  "timestamp": "2024-01-01T12:05:00.000Z"
}
```

## 📚 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/generate-summary` | Protected endpoint requiring payment |
| `GET`  | `/payment/status?payreq=XXX` | Check payment status |
| `GET`  | `/payment/receipt?payreq=XXX` | Get payment receipt |
| `POST` | `/webhook/psp` | PSP webhook handler |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/payreqs` | List all payment requests |
| `GET` | `/health` | Health check |
| `GET` | `/` | Service information |

## 🗂️ Project Structure

```
x402-UPI/
├── src/
│   ├── server.ts           # Main Express application
│   ├── db.ts              # SQLite database wrapper  
│   ├── mock_psp.ts        # Mock payment service provider
│   ├── utils/
│   │   └── jwt.ts         # JWT receipt signing/verification
│   ├── keys/
│   │   └── gen_keys.js    # RSA keypair generation
│   └── client/
│       └── index.html     # Demo web interface
├── migrations/
│   └── init.sql           # Database schema
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

```bash
PORT=3000                    # Server port (default: 3000)
DB_PATH=./data/x402-upi.db  # SQLite database path
```

### JWT Configuration

- **Algorithm**: RS256 (RSA with SHA-256)
- **Key Size**: 2048 bits
- **Receipt Expiry**: 10 minutes
- **Keys Location**: `./keys/facilitator_*.pem`

## 🧪 Testing the Demo

1. **Start the server**: `npm run dev`
2. **Open demo client**: http://localhost:3000/client/index.html
3. **Enter text** to summarize
4. **Click "Request Summary"** - receives 402 Payment Required
5. **Click "Open Mock Checkout"** - simulates payment
6. **Wait 3 seconds** - webhook processes payment
7. **View result** - summary appears after payment verification

## 🏦 Mock PSP Behavior

The mock PSP simulates a real payment service provider:

- **Checkout URL**: Creates a payment page
- **3-second delay**: Simulates user payment process  
- **Automatic webhook**: Calls merchant on success
- **Transaction ID**: Generates mock transaction reference

## 🔐 Security Notes

> **⚠️ DEVELOPMENT ONLY**
> 
> This implementation is for demonstration purposes only. For production use:
> 
> - ✅ Use secure key management (HSM, KMS)
> - ✅ Implement real PSP integration
> - ✅ Add webhook signature verification  
> - ✅ Use HTTPS everywhere
> - ✅ Add rate limiting and validation
> - ✅ Rotate keys regularly
> - ✅ Add comprehensive logging

## 📊 Database Schema

```sql
-- Payment requests from clients
CREATE TABLE payment_challenges (
  id TEXT PRIMARY KEY,           -- payreq_xxx
  amount REAL,                   -- Payment amount
  currency TEXT,                 -- INR
  status TEXT,                   -- PENDING, PAID, EXPIRED
  expires_at INTEGER,            -- Unix timestamp
  created_at INTEGER             -- Unix timestamp
);

-- Successful payments from PSP
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  payreq_id TEXT,               -- Links to payment_challenges
  psp_txn_id TEXT,              -- PSP transaction ID
  amount REAL,                  -- Paid amount
  payer_vpa TEXT,               -- User's UPI ID
  created_at INTEGER            -- Unix timestamp
);

-- JWT receipts issued to clients  
CREATE TABLE issued_receipts (
  payreq_id TEXT,               -- Links to payment_challenges
  receipt TEXT,                 -- JWT token
  issued_at INTEGER             -- Unix timestamp
);

-- Consumed receipts (prevent replay)
CREATE TABLE consumed_receipts (
  receipt TEXT,                 -- JWT token (for dedup)
  payreq_id TEXT,               -- Links to payment_challenges  
  consumed_at INTEGER           -- Unix timestamp
);
```

## 🚀 Deployment

### Production Checklist

- [ ] Replace mock PSP with real integration (Razorpay, Stripe, etc.)
- [ ] Implement proper key management  
- [ ] Add HTTPS termination
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Add input validation and sanitization
- [ ] Implement rate limiting
- [ ] Add webhook signature verification

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 References

- [HTTP 402 Payment Required](https://tools.ietf.org/html/rfc7231#section-6.5.2)
- [UPI Deep Linking](https://www.npci.org.in/what-we-do/upi/product-overview)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [Express.js Documentation](https://expressjs.com/)

---

Built with ❤️ for demonstrating payment-required API patterns
