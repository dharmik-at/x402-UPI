// A tiny mock PSP to simulate user paying and firing a webhook after N seconds
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// This endpoint simulates opening a checkout and returns a "checkout_url" which in reality will redirect
app.post('/mock/create_order', (req, res) => {
  const { order_id, amount } = req.body;
  // return a pretend checkout URL
  res.json({ checkout_url: `http://localhost:4001/mock/pay?order_id=${order_id}&amount=${amount}` });
});

// Simulate the payment page: when visited it will "pay" and call the merchant webhook after a delay
app.get('/mock/pay', async (req, res) => {
  const { order_id, amount } = req.query;
  
  // simulate user completing payment in 3 seconds
  setTimeout(async () => {
    const payload = {
      order_id,
      txn_id: `MOCK_TXN_${Date.now()}`,
      amount: Number(amount),
      status: 'SUCCESS',
      payer_vpa: 'user@bank'
    };
    
    // Call merchant webhook using native fetch (Node 18+)
    try {
      await fetch('http://localhost:3000/webhook/psp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`✅ Webhook sent for order ${order_id}`);
    } catch (e) {
      console.error('❌ Webhook failed', e);
    }
  }, 3000);

  res.send(`
    <html>
      <head>
        <title>Mock PSP Payment</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
          .payment-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h2>🏦 Mock PSP Payment Gateway</h2>
        <div class="payment-info">
          <h3>Processing Payment</h3>
          <p><strong>Order ID:</strong> ${order_id}</p>
          <p><strong>Amount:</strong> ₹${amount}</p>
          <div class="spinner"></div>
          <p>Payment will complete in 3 seconds...</p>
        </div>
        <p><em>This is a demo payment system. You will be automatically redirected.</em></p>
      </body>
    </html>
  `);
});

export function startMockPsp(port = 4001) {
  app.listen(port, () => {
    console.log(`🚀 Mock PSP service running at http://localhost:${port}`);
    console.log('   This simulates a real payment service provider');
  });
}
