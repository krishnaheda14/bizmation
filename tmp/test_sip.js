const axios = require('axios');
require('dotenv').config({ path: 'f:/Bizmation/apps/backend/.env' });

async function test() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    console.error("No keys available");
    return;
  }

  try {
    const planResp = await axios.post(
      'https://api.razorpay.com/v1/plans',
      {
        period: 'monthly',
        interval: 1,
        item: {
          name: `GOLD SIP MONTHLY - 500 INR`,
          amount: 50000,
          currency: 'INR',
          description: `Auto-invest 500 INR every monthly`
        }
      },
      { auth: { username: keyId, password: keySecret } }
    );
    console.log("Plan created:", planResp.data.id);
    
    // Create subscription
    const subResp = await axios.post(
      'https://api.razorpay.com/v1/subscriptions',
      {
        plan_id: planResp.data.id,
        total_count: 120,
        customer_notify: 0
      },
      { auth: { username: keyId, password: keySecret } }
    );
    console.log("Sub created:", subResp.data.id);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

test();
