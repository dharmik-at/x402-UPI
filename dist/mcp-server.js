"use strict";
// 🚀 REVOLUTIONARY x402-MCP-UPI Server
// This enables AI agents to autonomously make UPI payments for tool calls!
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402MCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const nanoid_1 = require("nanoid");
const qrcode_1 = __importDefault(require("qrcode"));
const jwt_1 = require("./utils/jwt");
const db_1 = __importDefault(require("./db"));
class X402MCPServer {
    constructor() {
        this.paidTools = new Map();
        this.server = new index_js_1.Server({ name: 'x402-upi-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });
        this.setupRequestHandlers();
        this.registerPaidTools();
    }
    setupRequestHandlers() {
        // 📋 List available paid tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const tools = Array.from(this.paidTools.values()).map(tool => ({
                name: tool.name,
                description: `${tool.description} (₹${tool.price} via UPI)`,
                inputSchema: {
                    ...tool.inputSchema,
                    properties: {
                        ...tool.inputSchema.properties,
                        payment_proof: {
                            type: 'string',
                            description: 'JWT payment receipt (obtained after UPI payment)',
                            optional: true
                        },
                        agent_id: {
                            type: 'string',
                            description: 'Agent identifier for payment tracking',
                            optional: true
                        }
                    }
                }
            }));
            return { tools };
        });
        // 🔧 Handle tool calls with payment verification
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const tool = this.paidTools.get(name);
            if (!tool) {
                throw new Error(`Tool "${name}" not found`);
            }
            const { payment_proof, agent_id, ...toolArgs } = args;
            // 💳 Check if payment proof provided
            if (!payment_proof) {
                return await this.createPaymentChallenge(tool, toolArgs, agent_id);
            }
            // ✅ Verify payment and execute tool
            try {
                const context = await this.verifyPaymentAndCreateContext(payment_proof, tool.name, tool.price, agent_id);
                const result = await tool.handler(toolArgs, context);
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                tool: tool.name,
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
        });
    }
    async createPaymentChallenge(tool, args, agentId) {
        const payReqId = `mcp_${tool.name}_${(0, nanoid_1.nanoid)(8)}`;
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes for agents
        // 💾 Store payment challenge
        const metadata = {
            tool: tool.name,
            args,
            agent_id: agentId,
            service: 'mcp-tool-call',
            mcp_integration: true
        };
        db_1.default.prepare(`
      INSERT INTO payment_challenges 
      (id, amount, currency, metadata, expires_at, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(payReqId, tool.price, 'INR', JSON.stringify(metadata), expiresAt, 'PENDING', Date.now());
        // 📱 Create UPI payment options
        const upiDeeplink = `upi://pay?pa=mcptools@paytm&pn=MCPToolPayments&am=${tool.price}&tn=${payReqId}&mc=5411&tr=${payReqId}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(upiDeeplink);
        const pspCheckout = `http://localhost:4001/mock/pay?order_id=${payReqId}&amount=${tool.price}`;
        const error = {
            code: 402,
            message: 'PaymentRequired',
            data: {
                payment_challenge: {
                    id: payReqId,
                    amount: tool.price,
                    currency: 'INR',
                    payment_methods: ['UPI_DEEPLINK', 'UPI_QR', 'PSP_CHECKOUT'],
                    upi_deeplink: upiDeeplink,
                    qr_png_url: qrDataUrl,
                    psp_checkout_url: pspCheckout,
                    expires_at: new Date(expiresAt).toISOString(),
                    metadata: {
                        tool: tool.name,
                        args,
                        agent_id: agentId
                    }
                }
            }
        };
        console.log(`🔔 Payment challenge created for agent ${agentId}: ${payReqId} - ₹${tool.price}`);
        throw error;
    }
    async verifyPaymentAndCreateContext(paymentProof, toolName, expectedAmount, agentId) {
        // 🔐 Verify JWT receipt
        const receipt = (0, jwt_1.verifyReceipt)(paymentProof);
        const payreqId = receipt.sub;
        // 📋 Check payment record
        const paymentRecord = db_1.default.prepare(`
      SELECT * FROM payment_challenges 
      WHERE id = ? AND status = 'PAID'
    `).get(payreqId);
        if (!paymentRecord) {
            throw new Error('Payment not found or not completed');
        }
        const metadata = JSON.parse(paymentRecord.metadata);
        // ✅ Verify payment is for this tool
        if (metadata.tool !== toolName) {
            throw new Error(`Payment was for tool "${metadata.tool}", not "${toolName}"`);
        }
        // ✅ Verify amount
        if (paymentRecord.amount !== expectedAmount) {
            throw new Error(`Payment amount ₹${paymentRecord.amount} doesn't match tool price ₹${expectedAmount}`);
        }
        // 🚫 Check if receipt already consumed
        const consumed = db_1.default.prepare(`
      SELECT * FROM consumed_receipts 
      WHERE receipt = ?
    `).get(paymentProof);
        if (consumed) {
            throw new Error('Payment receipt already used');
        }
        // ✅ Mark receipt as consumed
        db_1.default.prepare(`
      INSERT INTO consumed_receipts (receipt, payreq_id, consumed_at) 
      VALUES (?, ?, ?)
    `).run(paymentProof, payreqId, Date.now());
        console.log(`✅ Payment verified for agent ${agentId}: ${toolName} - ₹${expectedAmount}`);
        return {
            payment_receipt: paymentProof,
            payreq_id: payreqId,
            agent_id: agentId,
            paid_amount: paymentRecord.amount
        };
    }
    registerPaidTools() {
        // 🤖 AI Text Generation Tools
        this.paidTools.set('generate_summary', {
            name: 'generate_summary',
            description: 'Generate AI-powered summary of text',
            price: 5.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to summarize' },
                    max_length: { type: 'number', description: 'Maximum summary length', default: 100 }
                },
                required: ['text']
            },
            handler: this.handleSummaryGeneration.bind(this)
        });
        this.paidTools.set('translate_text', {
            name: 'translate_text',
            description: 'Translate text to any language',
            price: 3.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to translate' },
                    target_language: { type: 'string', description: 'Target language code' },
                    source_language: { type: 'string', description: 'Source language (auto-detect if not provided)' }
                },
                required: ['text', 'target_language']
            },
            handler: this.handleTranslation.bind(this)
        });
        this.paidTools.set('analyze_sentiment', {
            name: 'analyze_sentiment',
            description: 'Analyze sentiment and emotion in text',
            price: 2.0,
            inputSchema: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to analyze' },
                    detailed: { type: 'boolean', description: 'Include detailed emotion breakdown', default: false }
                },
                required: ['text']
            },
            handler: this.handleSentimentAnalysis.bind(this)
        });
        this.paidTools.set('generate_code', {
            name: 'generate_code',
            description: 'Generate code in any programming language',
            price: 10.0,
            inputSchema: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Code generation prompt' },
                    language: { type: 'string', description: 'Programming language' },
                    complexity: { type: 'string', enum: ['simple', 'medium', 'complex'], default: 'medium' }
                },
                required: ['prompt', 'language']
            },
            handler: this.handleCodeGeneration.bind(this)
        });
        this.paidTools.set('research_web', {
            name: 'research_web',
            description: 'Perform web research and data extraction',
            price: 15.0,
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Research query' },
                    depth: { type: 'string', enum: ['quick', 'detailed', 'comprehensive'], default: 'detailed' },
                    sources: { type: 'number', description: 'Number of sources to check', default: 5 }
                },
                required: ['query']
            },
            handler: this.handleWebResearch.bind(this)
        });
        console.log(`🔧 Registered ${this.paidTools.size} paid MCP tools`);
    }
    // 🔧 Tool Implementations
    async handleSummaryGeneration(args, context) {
        const { text, max_length = 100 } = args;
        // Simulate AI processing
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const summary = sentences.slice(0, Math.min(3, sentences.length))
            .join('. ') + (sentences.length > 3 ? '...' : '.');
        return {
            original_length: text.length,
            summary_length: summary.length,
            summary: summary.substring(0, max_length),
            compression_ratio: (summary.length / text.length * 100).toFixed(1) + '%',
            processing_time: '0.3s',
            ai_model: 'GPT-4-Turbo-UPI'
        };
    }
    async handleTranslation(args, context) {
        const { text, target_language, source_language = 'auto' } = args;
        // Mock translation (in production, use real translation API)
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
            confidence_score: 0.95,
            character_count: text.length,
            translation_time: '0.2s'
        };
    }
    async handleSentimentAnalysis(args, context) {
        const { text, detailed = false } = args;
        // Simple sentiment analysis
        const positive = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy'];
        const negative = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'disappointed'];
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
            word_count: words.length,
            processing_time: '0.1s'
        };
        if (detailed) {
            result.detailed_analysis = {
                positive_indicators: positiveScore,
                negative_indicators: negativeScore,
                neutral_indicators: words.length - positiveScore - negativeScore,
                emotion_breakdown: {
                    joy: positiveScore * 0.4,
                    trust: positiveScore * 0.2,
                    fear: negativeScore * 0.3,
                    anger: negativeScore * 0.4,
                    sadness: negativeScore * 0.3
                }
            };
        }
        return result;
    }
    async handleCodeGeneration(args, context) {
        const { prompt, language, complexity = 'medium' } = args;
        // Mock code generation
        const templates = {
            'javascript': `// AI Generated JavaScript Code
function ${prompt.replace(/\s+/g, '')}() {
  console.log("Generated for: ${prompt}");
  // Implementation would go here
  return "Hello from AI-generated code!";
}`,
            'python': `# AI Generated Python Code
def ${prompt.replace(/\s+/g, '_').toLowerCase()}():
    """Generated for: ${prompt}"""
    print("Hello from AI-generated Python!")
    return True`,
            'typescript': `// AI Generated TypeScript Code
interface Generated {
  prompt: string;
  complexity: '${complexity}';
}

function ${prompt.replace(/\s+/g, '')}(): Generated {
  return { prompt: "${prompt}", complexity: "${complexity}" };
}`
        };
        return {
            language,
            complexity,
            prompt,
            generated_code: templates[language] || `// Generated ${language} code for: ${prompt}\n// Implementation here`,
            lines_of_code: 8,
            estimated_functionality: `${complexity} level implementation`,
            generation_time: '1.2s',
            ai_model: 'CodeLlama-UPI'
        };
    }
    async handleWebResearch(args, context) {
        const { query, depth = 'detailed', sources = 5 } = args;
        // Mock research results
        const mockSources = [
            { title: 'Primary Research Source', url: 'https://example.com/research1', relevance: 0.95 },
            { title: 'Secondary Analysis', url: 'https://example.com/analysis2', relevance: 0.88 },
            { title: 'Expert Opinion', url: 'https://example.com/expert3', relevance: 0.82 },
            { title: 'Statistical Data', url: 'https://example.com/stats4', relevance: 0.79 },
            { title: 'Recent Developments', url: 'https://example.com/news5', relevance: 0.75 }
        ].slice(0, sources);
        return {
            query,
            search_depth: depth,
            sources_checked: sources,
            research_summary: `Comprehensive research findings for "${query}" based on ${sources} high-quality sources.`,
            key_findings: [
                `Primary insight about ${query}`,
                'Supporting evidence and data points',
                'Expert consensus and opinions',
                'Recent trends and developments'
            ],
            sources: mockSources,
            confidence_level: 0.89,
            research_time: depth === 'quick' ? '2.3s' : depth === 'detailed' ? '5.7s' : '12.4s',
            last_updated: new Date().toISOString()
        };
    }
    async start() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.log('🚀 x402-MCP-UPI Server started! AI agents can now make UPI payments for tools! 💳🤖');
    }
}
exports.X402MCPServer = X402MCPServer;
// 🎯 Start the MCP server
async function main() {
    const server = new X402MCPServer();
    await server.start();
}
if (require.main === module) {
    main().catch(console.error);
}
