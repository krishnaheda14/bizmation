import re

with open('apps/backend/src/modules/payments/payments.controller.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add Telegram helper at the top before paymentsRouter
telegram_helper = r'''
async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const url = https://api.telegram.org/bot/sendMessage;
    await axios.post(url, { chat_id: chatId, text, parse_mode: 'HTML' });
  } catch (e: any) {
    console.error('[Telegram Alert Error]', e?.message);
  }
}

export function paymentsRouter(): Router {'''

text = text.replace('export function paymentsRouter(): Router {', telegram_helper)

# Add logic to handleVerifyBuyPayment
verify_payment_repl = r'''      const lockData = lockSnap.data();

      await lockRef.update({
        status: 'PAID',
        verifiedAt: new Date(),
        razorpayOrderId,
        razorpayPaymentId,
        updatedAt: new Date(),
      });

      // FIRE TELEGRAM ALERT
      if (lockData) {
        const weight = lockData.grams;
        const metal = lockData.metal || 'GOLD';
        const phone = lockData.customerPhone || 'Unknown';
        const name = lockData.customerName || 'Customer';
        const amount = lockData.amountPaise ? (lockData.amountPaise / 100).toFixed(2) : 'N/A';
        const msg = 🚨 <b>NEW SUCCESSFUL ORDER!</b> 🚨\n\n +
                    👤 <b>Name:</b>  ()\n +
                    📦 <b>Metal:</b> \n +
                    ⚖️ <b>Quantity:</b> g\n +
                    💵 <b>Amount Paid:</b> ₹\n\n +
                    🔥 <i>Book exactly g of  on the trading terminal immediately!</i>;
        sendTelegramAlert(msg).catch(console.error);
      }'''

text = re.sub(
    r'await lockRef\.update\(\{\s*status: \'PAID\',\s*verifiedAt: new Date\(\),\s*razorpayOrderId,\s*razorpayPaymentId,\s*updatedAt: new Date\(\),\s*\}\);',
    verify_payment_repl,
    text,
    flags=re.DOTALL
)

# Add logic to verify-subscription
verify_sub_repl = r'''      // Here you could update the DB to mark the subscription as active for the user
      
      const msg = 🔄 <b>NEW AUTO-PAY (SIP) ACTIVATED!</b> 🔄\n\n +
                  🎫 <b>Subscription ID:</b> \n +
                  💳 <b>Payment ID:</b> \n\n +
                  ⏳ <i>Check the dashboard for details.</i>;
      sendTelegramAlert(msg).catch(console.error);

      return res.json({'''

text = text.replace(
    '// Here you could update the DB to mark the subscription as active for the user\n      return res.json({',
    verify_sub_repl
)

with open('apps/backend/src/modules/payments/payments.controller.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated payments.controller.ts successfully with telegram logic')