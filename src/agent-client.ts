// 🤖 REVOLUTIONARY AI Agent Client for x402-MCP-UPI
// This allows AI agents to autonomously pay for and use tools via UPI!

import axios from 'axios';
import { nanoid } from 'nanoid';

interface PaymentChallenge {
  id: string;
  amount: number;
  currency: string;
  payment_methods: string[];
  upi_deeplink: string;
  qr_png_url: string;
  psp_checkout_url: string;
  expires_at: string;
  metadata: {
    tool: string;
    args: any;
    agent_id?: string;
  };
}

interface AgentConfig {
  id: string;
  name: string;
  budget: number;
  auto_pay_limit: number;
  payment_strategy: 'human_approval' | 'auto_pay' | 'pre_funded' | 'corporate';
  webhook_url?: string;
}

interface ToolResult {
  success: boolean;
  tool: string;
  result: any;
  payment?: {
    receipt_id: string;
    amount_paid: number;
    agent_id: string;
  };
  timestamp: string;
}

class X402Agent {
  private config: AgentConfig;
  private spentBudget: number = 0;
  private paymentHistory: any[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    console.log(`🤖 Agent "${config.name}" initialized with ₹${config.budget} budget`);
  }

  // 🔧 Main method to call paid tools
  async callTool(toolName: string, args: any): Promise<ToolResult> {
    console.log(`🔧 Agent ${this.config.name} calling tool: ${toolName}`);
    
    try {
      // First attempt - without payment
      return await this.attemptToolCall(toolName, args);
    } catch (error: any) {
      if (error.response?.status === 402) {
        // Payment required!
        const paymentChallenge = error.response.data.error.data.payment_challenge as PaymentChallenge;
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
  async callToolsBatch(toolCalls: Array<{name: string, args: any}>): Promise<ToolResult[]> {
    console.log(`🚀 Agent ${this.config.name} executing ${toolCalls.length} tool batch`);
    
    const results: ToolResult[] = [];
    const pendingPayments: Array<{toolCall: any, challenge: PaymentChallenge}> = [];

    // First pass - identify all payment requirements
    for (const toolCall of toolCalls) {
      try {
        const result = await this.attemptToolCall(toolCall.name, toolCall.args);
        results.push(result);
      } catch (error: any) {
        if (error.response?.status === 402) {
          pendingPayments.push({
            toolCall,
            challenge: error.response.data.error.data.payment_challenge
          });
        } else {
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
        
        const result = await this.attemptToolCall(
          toolCall.name, 
          { ...toolCall.args, payment_proof: receipt }
        );
        results.push(result);
      }
    }

    return results;
  }

  private async attemptToolCall(toolName: string, args: any): Promise<ToolResult> {
    const response = await axios.post('http://localhost:3000/mcp/tools/call', {
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

    // Check if we got a payment challenge
    if (response.data.error?.code === 402) {
      const error = new Error('Payment Required');
      (error as any).response = { 
        status: 402, 
        data: response.data 
      };
      throw error;
    }

    const content = response.data.content?.[0]?.text;
    if (content) {
      return JSON.parse(content);
    }
    
    throw new Error('Unexpected response format');
  }

  // 💳 Smart payment handling based on strategy
  private async handlePayment(challenge: PaymentChallenge): Promise<string> {
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

  private async handleAutoPay(challenge: PaymentChallenge): Promise<string> {
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

  private async handleHumanApproval(challenge: PaymentChallenge): Promise<string> {
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

  private async handlePreFunded(challenge: PaymentChallenge): Promise<string> {
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

  private async handleCorporatePayment(challenge: PaymentChallenge): Promise<string> {
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

  private async handleBatchPayments(challenges: PaymentChallenge[]): Promise<string[]> {
    const totalAmount = challenges.reduce((sum, c) => sum + c.amount, 0);
    console.log(`💰 Processing batch payment: ₹${totalAmount} for ${challenges.length} tools`);
    
    // Check total budget
    if (this.spentBudget + totalAmount > this.config.budget) {
      throw new Error(`Batch payment ₹${totalAmount} exceeds remaining budget`);
    }

    const receipts: string[] = [];
    
    // Process payments based on strategy
    for (const challenge of challenges) {
      const receipt = await this.handlePayment(challenge);
      receipts.push(receipt);
    }

    return receipts;
  }

  // 🔄 Helper methods for payment simulation
  private async simulatePayment(challenge: PaymentChallenge): Promise<string> {
    // Call mock PSP payment endpoint
    const response = await axios.get(challenge.psp_checkout_url);
    
    // Wait for webhook processing (simulated)
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Get receipt from server
    const receiptResponse = await axios.get(
      `http://localhost:3000/payment/receipt?payreq=${challenge.id}`
    );
    
    return receiptResponse.data.receipt;
  }

  private async waitForPayment(challenge: PaymentChallenge): Promise<string> {
    // Poll payment status until completed
    const maxWaits = 30; // 5 minutes max
    for (let i = 0; i < maxWaits; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      try {
        const statusResponse = await axios.get(
          `http://localhost:3000/payment/status?payreq=${challenge.id}`
        );
        
        if (statusResponse.data.status === 'PAID') {
          const receiptResponse = await axios.get(
            `http://localhost:3000/payment/receipt?payreq=${challenge.id}`
          );
          return receiptResponse.data.receipt;
        }
      } catch (error) {
        // Continue waiting
      }
    }
    
    throw new Error('Payment timeout - human did not complete payment in time');
  }

  private async getWalletBalance(): Promise<number> {
    // Mock wallet balance
    return this.config.budget - this.spentBudget;
  }

  private async deductFromWallet(challenge: PaymentChallenge): Promise<string> {
    // In production: call wallet API to deduct funds
    return await this.simulatePayment(challenge);
  }

  private recordPayment(challenge: PaymentChallenge, receipt: string, method: string) {
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

// 🚀 Demo usage
async function demoAgentUsage() {
  console.log('🎯 Starting Revolutionary x402-MCP-UPI Agent Demo! 🤖💳');
  
  // Create an AI agent with auto-pay capability
  const agent = new X402Agent({
    id: `agent_${nanoid(8)}`,
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
      console.log(`  ${i+1}. ${result.tool}: ${result.success ? '✅' : '❌'}`);
    });

    // Show spending report
    console.log('\n💰 Agent Spending Report:');
    const report = agent.getSpendingReport();
    console.log(JSON.stringify(report, null, 2));

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run demo if called directly
if (require.main === module) {
  demoAgentUsage().catch(console.error);
}

export { X402Agent, AgentConfig, PaymentChallenge, ToolResult };
