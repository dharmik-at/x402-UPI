"use strict";
// 🤖 REVOLUTIONARY AI Agent Client for x402-MCP-UPI
// This allows AI agents to autonomously pay for and use tools via UPI!
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.X402Agent = void 0;
const axios_1 = __importDefault(require("axios"));
const nanoid_1 = require("nanoid");
class X402Agent {
    constructor(config) {
        this.spentBudget = 0;
        this.paymentHistory = [];
        this.config = config;
        console.log(`🤖 Agent "${config.name}" initialized with ₹${config.budget} budget`);
    }
    // 🔧 Main method to call paid tools
    async callTool(toolName, args) {
        console.log(`🔧 Agent ${this.config.name} calling tool: ${toolName}`);
        try {
            // First attempt - without payment
            return await this.attemptToolCall(toolName, args);
        }
        catch (error) {
            if (error.response?.status === 402) {
                // Payment required!
                const paymentChallenge = error.response.data.data.payment_challenge;
                console.log(`💳 Payment required: ₹${paymentChallenge.amount} for ${toolName}`);
                // Handle payment based on strategy
                const receipt = await this.handlePayment(paymentChallenge);
                // Retry with payment proof
                return await this.attemptToolCall(toolName, { ...args, payment_proof: receipt });
            }
            throw error;
        }
    }
    // 🎯 Batch tool calls with intelligent payment bundling
    async callToolsBatch(toolCalls) {
        console.log(`🚀 Agent ${this.config.name} executing ${toolCalls.length} tool batch`);
        const results = [];
        const pendingPayments = [];
        // First pass - identify all payment requirements
        for (const toolCall of toolCalls) {
            try {
                const result = await this.attemptToolCall(toolCall.name, toolCall.args);
                results.push(result);
            }
            catch (error) {
                if (error.response?.status === 402) {
                    pendingPayments.push({
                        toolCall,
                        challenge: error.response.data.data.payment_challenge
                    });
                }
                else {
                    throw error;
                }
            }
        }
        // Second pass - handle batch payments
        if (pendingPayments.length > 0) {
            console.log(`💰 Processing ${pendingPayments.length} payments in batch`);
            const receipts = await this.handleBatchPayments(pendingPayments.map(p => p.challenge));
            // Execute paid tools
            for (let i = 0; i < pendingPayments.length; i++) {
                const { toolCall } = pendingPayments[i];
                const receipt = receipts[i];
                const result = await this.attemptToolCall(toolCall.name, { ...toolCall.args, payment_proof: receipt });
                results.push(result);
            }
        }
        return results;
    }
    async attemptToolCall(toolName, args) {
        const response = await axios_1.default.post('http://localhost:3000/mcp/tools/call', {
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: { ...args, agent_id: this.config.id }
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-ID': this.config.id,
                'X-Agent-Name': this.config.name
            }
        });
        const content = response.data.content?.[0]?.text;
        if (content) {
            return JSON.parse(content);
        }
        throw new Error('Unexpected response format');
    }
    // 💳 Smart payment handling based on strategy
    async handlePayment(challenge) {
        console.log(`💰 Processing payment: ₹${challenge.amount} via ${this.config.payment_strategy}`);
        // Check budget
        if (this.spentBudget + challenge.amount > this.config.budget) {
            throw new Error(`Payment ₹${challenge.amount} exceeds remaining budget ₹${this.config.budget - this.spentBudget}`);
        }
        switch (this.config.payment_strategy) {
            case 'auto_pay':
                return await this.handleAutoPay(challenge);
            case 'human_approval':
                return await this.handleHumanApproval(challenge);
            case 'pre_funded':
                return await this.handlePreFunded(challenge);
            case 'corporate':
                return await this.handleCorporatePayment(challenge);
            default:
                throw new Error(`Unknown payment strategy: ${this.config.payment_strategy}`);
        }
    }
    async handleAutoPay(challenge) {
        if (challenge.amount > this.config.auto_pay_limit) {
            console.log(`⚠️  Amount ₹${challenge.amount} exceeds auto-pay limit ₹${this.config.auto_pay_limit}, requesting approval`);
            return await this.handleHumanApproval(challenge);
        }
        console.log(`🔄 Auto-paying ₹${challenge.amount}...`);
        // Simulate automatic payment via mock PSP
        const receipt = await this.simulatePayment(challenge);
        this.spentBudget += challenge.amount;
        this.recordPayment(challenge, receipt, 'auto_pay');
        return receipt;
    }
    async handleHumanApproval(challenge) {
        console.log(`👤 Requesting human approval for ₹${challenge.amount} payment...`);
        // In a real implementation, this would:
        // 1. Send notification to human operator
        // 2. Display QR code for UPI payment
        // 3. Wait for payment confirmation
        console.log(`📱 UPI Payment Required:
    💰 Amount: ₹${challenge.amount}
    🔗 UPI Link: ${challenge.upi_deeplink}
    🌐 Web Payment: ${challenge.psp_checkout_url}
    ⏰ Expires: ${challenge.expires_at}
    
    Please complete payment and system will auto-detect...`);
        // For demo, simulate human completing payment
        console.log(`⏳ Waiting for human payment...`);
        const receipt = await this.waitForPayment(challenge);
        this.spentBudget += challenge.amount;
        this.recordPayment(challenge, receipt, 'human_approval');
        return receipt;
    }
    async handlePreFunded(challenge) {
        console.log(`🏦 Using pre-funded wallet for ₹${challenge.amount}...`);
        // Check virtual wallet balance
        const walletBalance = await this.getWalletBalance();
        if (walletBalance < challenge.amount) {
            throw new Error(`Insufficient wallet balance: ₹${walletBalance} < ₹${challenge.amount}`);
        }
        // Deduct from wallet and get receipt
        const receipt = await this.deductFromWallet(challenge);
        this.spentBudget += challenge.amount;
        this.recordPayment(challenge, receipt, 'pre_funded');
        return receipt;
    }
    async handleCorporatePayment(challenge) {
        console.log(`🏢 Processing corporate payment for ₹${challenge.amount}...`);
        // In production: integrate with corporate payment systems
        // - Approval workflows
        // - Department budget checks  
        // - Compliance verification
        const receipt = await this.simulatePayment(challenge);
        this.spentBudget += challenge.amount;
        this.recordPayment(challenge, receipt, 'corporate');
        return receipt;
    }
    async handleBatchPayments(challenges) {
        const totalAmount = challenges.reduce((sum, c) => sum + c.amount, 0);
        console.log(`💰 Processing batch payment: ₹${totalAmount} for ${challenges.length} tools`);
        // Check total budget
        if (this.spentBudget + totalAmount > this.config.budget) {
            throw new Error(`Batch payment ₹${totalAmount} exceeds remaining budget`);
        }
        const receipts = [];
        // Process payments based on strategy
        for (const challenge of challenges) {
            const receipt = await this.handlePayment(challenge);
            receipts.push(receipt);
        }
        return receipts;
    }
    // 🔄 Helper methods for payment simulation
    async simulatePayment(challenge) {
        // Call mock PSP payment endpoint
        const response = await axios_1.default.get(challenge.psp_checkout_url);
        // Wait for webhook processing (simulated)
        await new Promise(resolve => setTimeout(resolve, 4000));
        // Get receipt from server
        const receiptResponse = await axios_1.default.get(`http://localhost:3000/payment/receipt?payreq=${challenge.id}`);
        return receiptResponse.data.receipt;
    }
    async waitForPayment(challenge) {
        // Poll payment status until completed
        const maxWaits = 30; // 5 minutes max
        for (let i = 0; i < maxWaits; i++) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            try {
                const statusResponse = await axios_1.default.get(`http://localhost:3000/payment/status?payreq=${challenge.id}`);
                if (statusResponse.data.status === 'PAID') {
                    const receiptResponse = await axios_1.default.get(`http://localhost:3000/payment/receipt?payreq=${challenge.id}`);
                    return receiptResponse.data.receipt;
                }
            }
            catch (error) {
                // Continue waiting
            }
        }
        throw new Error('Payment timeout - human did not complete payment in time');
    }
    async getWalletBalance() {
        // Mock wallet balance
        return this.config.budget - this.spentBudget;
    }
    async deductFromWallet(challenge) {
        // In production: call wallet API to deduct funds
        return await this.simulatePayment(challenge);
    }
    recordPayment(challenge, receipt, method) {
        this.paymentHistory.push({
            payment_id: challenge.id,
            tool: challenge.metadata.tool,
            amount: challenge.amount,
            method,
            receipt,
            timestamp: new Date().toISOString(),
            agent_id: this.config.id
        });
        console.log(`✅ Payment recorded: ${challenge.metadata.tool} - ₹${challenge.amount} via ${method}`);
    }
    // 📊 Agent analytics
    getSpendingReport() {
        return {
            agent_id: this.config.id,
            agent_name: this.config.name,
            total_budget: this.config.budget,
            spent_budget: this.spentBudget,
            remaining_budget: this.config.budget - this.spentBudget,
            payment_count: this.paymentHistory.length,
            average_payment: this.paymentHistory.length > 0
                ? (this.spentBudget / this.paymentHistory.length).toFixed(2)
                : 0,
            payment_methods_used: [...new Set(this.paymentHistory.map(p => p.method))],
            tools_used: [...new Set(this.paymentHistory.map(p => p.tool))],
            payment_history: this.paymentHistory
        };
    }
}
exports.X402Agent = X402Agent;
// 🚀 Demo usage
async function demoAgentUsage() {
    console.log('🎯 Starting Revolutionary x402-MCP-UPI Agent Demo! 🤖💳');
    // Create an AI agent with auto-pay capability
    const agent = new X402Agent({
        id: `agent_${(0, nanoid_1.nanoid)(8)}`,
        name: 'ResearchBot-AI',
        budget: 100.0, // ₹100 budget
        auto_pay_limit: 10.0, // Auto-pay up to ₹10
        payment_strategy: 'auto_pay',
        webhook_url: 'https://my-ai-service.com/webhooks/payments'
    });
    try {
        // Single tool call
        console.log('\n🔧 Testing single tool call...');
        const summary = await agent.callTool('generate_summary', {
            text: 'This is a revolutionary payment system that allows AI agents to autonomously pay for services using UPI, India\'s instant payment system. This bridges the gap between AI capabilities and real-world financial transactions.',
            max_length: 100
        });
        console.log('📄 Summary Result:', JSON.stringify(summary, null, 2));
        // Batch tool calls
        console.log('\n🚀 Testing batch tool calls...');
        const batchResults = await agent.callToolsBatch([
            {
                name: 'analyze_sentiment',
                args: { text: 'I love this new AI payment system! It\'s absolutely revolutionary!', detailed: true }
            },
            {
                name: 'translate_text',
                args: { text: 'Hello, AI agents can now pay!', target_language: 'hi' }
            },
            {
                name: 'generate_code',
                args: { prompt: 'UPI payment integration', language: 'typescript', complexity: 'medium' }
            }
        ]);
        console.log('📊 Batch Results:');
        batchResults.forEach((result, i) => {
            console.log(`  ${i + 1}. ${result.tool}: ${result.success ? '✅' : '❌'}`);
        });
        // Show spending report
        console.log('\n💰 Agent Spending Report:');
        const report = agent.getSpendingReport();
        console.log(JSON.stringify(report, null, 2));
    }
    catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}
// Run demo if called directly
if (require.main === module) {
    demoAgentUsage().catch(console.error);
}
