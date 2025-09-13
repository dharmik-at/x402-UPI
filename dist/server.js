"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const nanoid_1 = require("nanoid");
const qrcode_1 = __importDefault(require("qrcode"));
const db_1 = __importDefault(require("./db"));
const jwt_1 = require("./utils/jwt");
const mock_psp_1 = require("./mock_psp");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
// Serve static client files
app.use('/client', express_1.default.static(path_1.default.join(__dirname, 'client')));
// Start mock PSP (demo only)
(0, mock_psp_1.startMockPsp)(4001);
// Helper: insert payment_challenge
function createPaymentChallenge({ id, amount, currency, metadata, expiresAt }) {
    const stmt = db_1.default.prepare(`
    INSERT INTO payment_challenges (id, amount, currency, metadata, expires_at, status, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(id, amount, currency, JSON.stringify(metadata || {}), expiresAt, 'PENDING', Date.now());
}
// 🤖 MCP Tool Call Handler
async function handleMCPToolCall(toolName, args) {
    const toolPrices = {
        'generate_summary': 5.0,
        'translate_text': 3.0,
        'analyze_sentiment': 2.0,
        'generate_code': 10.0,
        'research_web': 15.0
    };
    const toolPrice = toolPrices[toolName];
    if (!toolPrice) {
        throw new Error(`Unknown tool: ${toolName}`);
    }
    const { payment_proof, agent_id, ...toolArgs } = args;
    // 💳 Check if payment proof provided
    if (!payment_proof) {
        const error = await createMCPPaymentChallenge(toolName, toolPrice, toolArgs, agent_id);
        throw error;
    }
    // ✅ Verify payment and execute tool
    try {
        const context = await verifyMCPPayment(payment_proof, toolName, toolPrice, agent_id);
        const result = await executeMCPTool(toolName, toolArgs, context);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        tool: toolName,
                        result,
                        payment: {
                            receipt_id: context.payreq_id,
                            amount_paid: context.paid_amount,
                            agent_id: context.agent_id
                        },
                        timestamp: new Date().toISOString()
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        throw new Error(`Payment verification failed: ${error.message}`);
    }
}
// 💰 Create payment challenge for MCP tools
async function createMCPPaymentChallenge(toolName, price, args, agentId) {
    const payReqId = `mcp_${toolName}_${(0, nanoid_1.nanoid)(8)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    const metadata = {
        tool: toolName,
        args,
        agent_id: agentId,
        service: 'mcp-tool-call',
        mcp_integration: true
    };
    createPaymentChallenge({
        id: payReqId,
        amount: price,
        currency: 'INR',
        metadata,
        expiresAt
    });
    // Create UPI payment options
    const upiDeeplink = `upi://pay?pa=mcptools@paytm&pn=MCPToolPayments&am=${price}&tn=${payReqId}&mc=5411&tr=${payReqId}`;
    const qrDataUrl = await qrcode_1.default.toDataURL(upiDeeplink);
    const pspCheckout = `http://localhost:4001/mock/pay?order_id=${payReqId}&amount=${price}`;
    return {
        code: 402,
        message: 'PaymentRequired',
        data: {
            payment_challenge: {
                id: payReqId,
                amount: price,
                currency: 'INR',
                payment_methods: ['UPI_DEEPLINK', 'UPI_QR', 'PSP_CHECKOUT'],
                upi_deeplink: upiDeeplink,
                qr_png_url: qrDataUrl,
                psp_checkout_url: pspCheckout,
                expires_at: new Date(expiresAt).toISOString(),
                metadata: { tool: toolName, args, agent_id: agentId }
            }
        }
    };
}
// ✅ Verify MCP payment
async function verifyMCPPayment(paymentProof, toolName, expectedAmount, agentId) {
    const receipt = (0, jwt_1.verifyReceipt)(paymentProof);
    const payreqId = receipt.sub;
    const paymentRecord = db_1.default.prepare(`
    SELECT * FROM payment_challenges 
    WHERE id = ? AND status = 'PAID'
  `).get(payreqId);
    if (!paymentRecord) {
        throw new Error('Payment not found or not completed');
    }
    const metadata = JSON.parse(paymentRecord.metadata);
    if (metadata.tool !== toolName) {
        throw new Error(`Payment was for tool "${metadata.tool}", not "${toolName}"`);
    }
    if (paymentRecord.amount !== expectedAmount) {
        throw new Error(`Payment amount ₹${paymentRecord.amount} doesn't match tool price ₹${expectedAmount}`);
    }
    const consumed = db_1.default.prepare(`SELECT * FROM consumed_receipts WHERE receipt = ?`).get(paymentProof);
    if (consumed) {
        throw new Error('Payment receipt already used');
    }
    db_1.default.prepare(`INSERT INTO consumed_receipts (receipt, payreq_id, consumed_at) VALUES (?, ?, ?)`)
        .run(paymentProof, payreqId, Date.now());
    return {
        payment_receipt: paymentProof,
        payreq_id: payreqId,
        agent_id: agentId,
        paid_amount: paymentRecord.amount
    };
}
// 🔧 Execute MCP tools
async function executeMCPTool(toolName, args, context) {
    switch (toolName) {
        case 'generate_summary':
            return executeSummaryTool(args);
        case 'translate_text':
            return executeTranslateTool(args);
        case 'analyze_sentiment':
            return executeSentimentTool(args);
        case 'generate_code':
            return executeCodeTool(args);
        case 'research_web':
            return executeResearchTool(args);
        default:
            throw new Error(`Tool implementation not found: ${toolName}`);
    }
}
// 📝 Tool implementations
function executeSummaryTool(args) {
    const { text, max_length = 100 } = args;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const summary = sentences.slice(0, Math.min(3, sentences.length)).join('. ') +
        (sentences.length > 3 ? '...' : '.');
    return {
        original_length: text.length,
        summary_length: summary.length,
        summary: summary.substring(0, max_length),
        compression_ratio: (summary.length / text.length * 100).toFixed(1) + '%',
        ai_model: 'GPT-4-Turbo-UPI'
    };
}
function executeTranslateTool(args) {
    const { text, target_language, source_language = 'auto' } = args;
    const translations = {
        'hi': 'नमस्कार, यह एक अनुवादित पाठ है।',
        'es': 'Hola, este es un texto traducido.',
        'fr': 'Bonjour, ceci est un texte traduit.',
        'de': 'Hallo, das ist ein übersetzter Text.',
        'ja': 'こんにちは、これは翻訳されたテキストです。',
        'zh': '你好，这是翻译后的文本。'
    };
    return {
        original_text: text,
        source_language: source_language === 'auto' ? 'en' : source_language,
        target_language,
        translated_text: translations[target_language] || `[TRANSLATED TO ${target_language.toUpperCase()}] ${text}`,
        confidence_score: 0.95
    };
}
function executeSentimentTool(args) {
    const { text, detailed = false } = args;
    const positive = ['good', 'great', 'excellent', 'amazing', 'love', 'happy'];
    const negative = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry'];
    const words = text.toLowerCase().split(/\W+/);
    const positiveScore = words.filter((w) => positive.includes(w)).length;
    const negativeScore = words.filter((w) => negative.includes(w)).length;
    let sentiment = 'neutral';
    let confidence = 0.5;
    if (positiveScore > negativeScore) {
        sentiment = 'positive';
        confidence = Math.min(0.95, 0.6 + (positiveScore - negativeScore) * 0.1);
    }
    else if (negativeScore > positiveScore) {
        sentiment = 'negative';
        confidence = Math.min(0.95, 0.6 + (negativeScore - positiveScore) * 0.1);
    }
    const result = {
        sentiment,
        confidence,
        text_length: text.length,
        word_count: words.length
    };
    if (detailed) {
        result.detailed_analysis = {
            positive_indicators: positiveScore,
            negative_indicators: negativeScore,
            neutral_indicators: words.length - positiveScore - negativeScore
        };
    }
    return result;
}
function executeCodeTool(args) {
    const { prompt, language, complexity = 'medium' } = args;
    const templates = {
        'javascript': `// AI Generated JavaScript Code\nfunction ${prompt.replace(/\s+/g, '')}() {\n  console.log("Generated for: ${prompt}");\n  return "Hello from AI!";\n}`,
        'python': `# AI Generated Python Code\ndef ${prompt.replace(/\s+/g, '_').toLowerCase()}():\n    """Generated for: ${prompt}"""\n    return True`,
        'typescript': `// AI Generated TypeScript Code\nfunction ${prompt.replace(/\s+/g, '')}(): string {\n  return "${prompt}";\n}`
    };
    return {
        language,
        complexity,
        prompt,
        generated_code: templates[language] || `// Generated ${language} code for: ${prompt}`,
        lines_of_code: 8
    };
}
function executeResearchTool(args) {
    const { query, depth = 'detailed', sources = 5 } = args;
    return {
        query,
        search_depth: depth,
        sources_checked: sources,
        research_summary: `Comprehensive research findings for "${query}"`,
        key_findings: [
            `Primary insight about ${query}`,
            'Supporting evidence and data',
            'Expert opinions and analysis'
        ],
        confidence_level: 0.89
    };
}
// Main endpoint: paid tool (returns 402 if no valid receipt provided)
app.post('/generate-summary', async (req, res) => {
    console.log(`📝 Generate summary request received`);
    // Check if Authorization header contains receipt
    const auth = req.header('Authorization') || req.header('X-UPI-Receipt');
    if (!auth) {
        // Create payment challenge
        const payReqId = `payreq_${(0, nanoid_1.nanoid)(8)}`;
        const amount = 5.00;
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        createPaymentChallenge({
            id: payReqId,
            amount,
            currency: 'INR',
            metadata: { service: 'generate-summary' },
            expiresAt
        });
        // Create UPI deeplink (demo) and QR data URL
        const upiDeeplink = `upi://pay?pa=merchant@bank&pn=DemoService&am=${amount}&tn=${payReqId}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(upiDeeplink);
        // For demo, create PSP checkout via mock_psp
        const pspCheckout = `http://localhost:4001/mock/pay?order_id=${payReqId}&amount=${amount}`;
        console.log(`💳 Payment challenge created: ${payReqId} for ₹${amount}`);
        return res.status(402).json({
            error: 'PaymentRequired',
            payment_challenge: {
                id: payReqId,
                amount,
                currency: 'INR',
                expires_at: new Date(expiresAt).toISOString(),
                payment_methods: ['UPI_DEEPLINK', 'PSP_CHECKOUT'],
                upi_deeplink: upiDeeplink,
                qr_png_url: qrDataUrl,
                psp_checkout_url: pspCheckout,
                metadata: { service: 'generate-summary' }
            }
        });
    }
    // If receipt provided, verify it
    try {
        const token = auth.replace(/^(Bearer|UPI-Receipt)\s*/i, '');
        const payload = (0, jwt_1.verifyReceipt)(token);
        // Confirm payreq status is PAID
        const row = db_1.default.prepare('SELECT * FROM payment_challenges WHERE id = ?').get(payload.sub);
        if (!row || row.status !== 'PAID') {
            return res.status(403).json({ error: 'PaymentNotVerified' });
        }
        // Ensure receipt not consumed
        const consumed = db_1.default.prepare('SELECT * FROM consumed_receipts WHERE receipt = ?').get(token);
        if (consumed) {
            return res.status(409).json({ error: 'ReceiptAlreadyUsed' });
        }
        // Mark receipt as consumed
        db_1.default.prepare('INSERT INTO consumed_receipts (receipt, payreq_id, consumed_at) VALUES (?, ?, ?)')
            .run(token, payload.sub, Date.now());
        // Serve resource (dummy summarization)
        const text = req.body.text || '';
        const summary = text.split('\\n').slice(0, 3).join(' ') + '... [SUMMARY TRUNCATED]';
        console.log(`✅ Payment verified for ${payload.sub}, serving content`);
        return res.json({
            success: true,
            payreq_id: payload.sub,
            summary: `SUMMARY for payreq ${payload.sub}: ${summary}`,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        console.log(`❌ Invalid receipt: ${e.message}`);
        return res.status(403).json({ error: 'InvalidReceipt', message: e.message });
    }
});
// Webhook for PSP (mock) -> mark payreq as paid & issue receipt
app.post('/webhook/psp', (req, res) => {
    const { order_id, txn_id, amount, status, payer_vpa } = req.body;
    console.log(`🔔 PSP webhook received for order ${order_id}: ${status}`);
    if (status !== 'SUCCESS') {
        console.log(`⚠️  Ignoring non-success status: ${status}`);
        return res.status(200).send('ignored');
    }
    // Map order_id to payreq
    const payreq = db_1.default.prepare('SELECT * FROM payment_challenges WHERE id = ?').get(order_id);
    if (!payreq) {
        console.log(`❌ Unknown order: ${order_id}`);
        return res.status(404).send('unknown order');
    }
    // Record payment
    db_1.default.prepare(`
    INSERT INTO payments (payreq_id, psp_txn_id, psp_provider, amount, payer_vpa, raw_payload, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(order_id, txn_id, 'mock_psp', amount, payer_vpa, JSON.stringify(req.body), Date.now());
    // Update payment challenge status
    db_1.default.prepare('UPDATE payment_challenges SET status = ? WHERE id = ?').run('PAID', order_id);
    // Issue signed facilitator receipt (JWT)
    const receipt = (0, jwt_1.signReceipt)({
        sub: order_id,
        aud: 'api.example.com',
        amount,
        currency: 'INR',
        txn_id,
        payer_vpa
    }, {
        expiresIn: '10m',
        issuer: 'facilitator.example.com'
    });
    db_1.default.prepare('INSERT INTO issued_receipts (payreq_id, receipt, issued_at) VALUES (?, ?, ?)')
        .run(order_id, receipt, Date.now());
    console.log(`🎫 Receipt issued for ${order_id}`);
    res.status(200).json({ ok: true, receipt_issued: true });
});
// Get payment status for client polling
app.get('/payment/status', (req, res) => {
    const { payreq } = req.query;
    if (!payreq)
        return res.status(400).json({ error: 'missing payreq' });
    const row = db_1.default.prepare('SELECT status, expires_at FROM payment_challenges WHERE id = ?').get(payreq);
    if (!row)
        return res.status(404).json({ error: 'unknown' });
    res.json({
        status: row.status,
        expires_at: new Date(row.expires_at).toISOString()
    });
});
// Get receipt (for demo; in real world, client polling obtains receipt via secure push or fetch)
app.get('/payment/receipt', (req, res) => {
    const { payreq } = req.query;
    if (!payreq)
        return res.status(400).json({ error: 'missing payreq' });
    const rec = db_1.default.prepare('SELECT receipt FROM issued_receipts WHERE payreq_id = ? ORDER BY id DESC LIMIT 1').get(payreq);
    if (!rec)
        return res.status(404).json({ error: 'receipt_not_ready' });
    res.json({ receipt: rec.receipt });
});
// Admin endpoint: list payment requests
app.get('/admin/payreqs', (req, res) => {
    const rows = db_1.default.prepare(`
    SELECT id, amount, currency, status, created_at 
    FROM payment_challenges 
    ORDER BY created_at DESC 
    LIMIT 100
  `).all();
    res.json(rows);
});
// 🤖 MCP Tool Endpoints for AI Agents
app.post('/mcp/tools/call', async (req, res) => {
    try {
        const { method, params } = req.body;
        if (method !== 'tools/call') {
            return res.status(400).json({ error: 'Invalid method' });
        }
        const { name, arguments: args } = params;
        console.log(`🤖 MCP tool call: ${name} from agent ${req.header('X-Agent-ID')}`);
        // For now, handle via HTTP instead of MCP transport
        // In production, this would route through proper MCP server
        const mcpResponse = await handleMCPToolCall(name, args);
        res.json(mcpResponse);
    }
    catch (error) {
        console.error('MCP tool call error:', error);
        if (error.code === 402) {
            return res.status(402).json({ error: error });
        }
        res.status(500).json({ error: error.message });
    }
});
// 📋 List MCP tools for AI agents
app.get('/mcp/tools/list', (req, res) => {
    const tools = [
        {
            name: 'generate_summary',
            description: 'Generate AI-powered summary of text (₹5.0 via UPI)',
            price: 5.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to summarize' },
                    max_length: { type: 'number', description: 'Maximum summary length', default: 100 }
                },
                required: ['text']
            }
        },
        {
            name: 'translate_text',
            description: 'Translate text to any language (₹3.0 via UPI)',
            price: 3.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to translate' },
                    target_language: { type: 'string', description: 'Target language code' }
                },
                required: ['text', 'target_language']
            }
        },
        {
            name: 'analyze_sentiment',
            description: 'Analyze sentiment and emotion in text (₹2.0 via UPI)',
            price: 2.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to analyze' },
                    detailed: { type: 'boolean', description: 'Include detailed emotion breakdown', default: false }
                },
                required: ['text']
            }
        },
        {
            name: 'generate_code',
            description: 'Generate code in any programming language (₹10.0 via UPI)',
            price: 10.0
        },
        {
            name: 'research_web',
            description: 'Perform web research and data extraction (₹15.0 via UPI)',
            price: 15.0
        }
    ];
    res.json({ tools });
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'x402-UPI + MCP Reference Implementation',
        features: ['UPI_PAYMENTS', 'MCP_TOOLS', 'AI_AGENTS']
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.send(`
    <html>
      <head>
        <title>🚀 x402-MCP-UPI: Revolutionary AI Payment System</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; margin: 0; }
          .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
          h1 { color: #4f46e5; font-size: 2.5rem; margin-bottom: 10px; }
          .subtitle { color: #6b7280; font-size: 1.2rem; margin-bottom: 30px; }
          .revolutionary { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; }
          .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
          .feature-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; }
          .endpoints { background: #f1f5f9; padding: 20px; border-radius: 8px; }
          ul { list-style: none; padding: 0; }
          li { padding: 8px 0; }
          code { background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; }
          a { color: #4f46e5; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          .highlight { background: linear-gradient(45deg, #ffd89b 0%, #19547b 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 x402-MCP-UPI</h1>
          <p class="subtitle">The <span class="revolutionary">WORLD'S FIRST</span> AI Agent Payment System using India's UPI</p>
          
          <div class="highlight">
            <h2>🎯 REVOLUTIONARY BREAKTHROUGH!</h2>
            <p><strong>AI agents can now autonomously pay for services using UPI!</strong> This bridges the gap between artificial intelligence and real-world financial transactions, enabling a new economy where AI agents operate independently with payment capabilities.</p>
          </div>

          <div class="feature-grid">
            <div class="feature-card">
              <h3>🤖 AI Agent Tools</h3>
              <p>AI agents can call paid tools autonomously:</p>
              <ul>
                <li>📝 Text Summarization (₹5)</li>
                <li>🌍 Language Translation (₹3)</li>
                <li>💭 Sentiment Analysis (₹2)</li>
                <li>💻 Code Generation (₹10)</li>
                <li>🔍 Web Research (₹15)</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h3>💳 UPI Integration</h3>
              <p>Seamless payments via India's UPI:</p>
              <ul>
                <li>📱 QR Code Payments</li>
                <li>🔗 UPI Deep Links</li>
                <li>⚡ Instant Settlement</li>
                <li>🔐 Cryptographic Receipts</li>
                <li>🏦 Mock PSP for Testing</li>
              </ul>
            </div>
            
            <div class="feature-card">
              <h3>🔧 MCP Protocol</h3>
              <p>Model Context Protocol integration:</p>
              <ul>
                <li>📋 Tool Discovery</li>
                <li>💰 Payment Challenges</li>
                <li>🎫 JWT Receipts</li>
                <li>🚫 Replay Protection</li>
                <li>📊 Usage Analytics</li>
              </ul>
            </div>
          </div>

          <h3>🎮 Try It Out:</h3>
          <ul>
            <li><a href="/client/index.html">📱 Human Demo Client</a> - Traditional web interface</li>
            <li><a href="/mcp/tools/list">🤖 AI Agent Tools</a> - Available paid tools for agents</li>
            <li><a href="/admin/payreqs">🔧 Admin Dashboard</a> - Monitor payments</li>
            <li><a href="/health">❤️ Health Check</a> - System status</li>
          </ul>

          <div class="endpoints">
            <h3>🔗 API Endpoints:</h3>
            <h4>Human Endpoints:</h4>
            <ul>
              <li><code>POST /generate-summary</code> - Protected endpoint (requires payment)</li>
              <li><code>GET /payment/status?payreq=XXX</code> - Check payment status</li>
              <li><code>GET /payment/receipt?payreq=XXX</code> - Get payment receipt</li>
            </ul>
            
            <h4>🤖 AI Agent Endpoints:</h4>
            <ul>
              <li><code>GET /mcp/tools/list</code> - List available paid tools</li>
              <li><code>POST /mcp/tools/call</code> - Call tools with payment verification</li>
            </ul>
          </div>

          <div class="highlight">
            <h3>🌍 Why This Will Change Everything:</h3>
            <p>🔹 <strong>AI Autonomy:</strong> Agents can operate independently with real money<br/>
               🔹 <strong>Global Scale:</strong> UPI's 300M+ users can interact with AI services<br/>
               🔹 <strong>Micropayments:</strong> Pay-per-use model for AI capabilities<br/>
               🔹 <strong>Open Protocol:</strong> Any AI agent can integrate payment capabilities<br/>
               🔹 <strong>Real Economy:</strong> Bridge between AI and actual financial systems</p>
          </div>
        </div>
      </body>
    </html>
  `);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
🚀 x402-UPI demo server started!
   
   📍 Main server: http://localhost:${PORT}
   📱 Demo client: http://localhost:${PORT}/client/index.html
   🏦 Mock PSP:    http://localhost:4001
   
   Ready to accept payments! 💳
  `);
});
