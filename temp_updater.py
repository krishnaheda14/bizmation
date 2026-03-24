import re

with open('apps/web-app/src/lib/razorpay.ts', 'r', encoding='utf-8') as f:
    text = f.read()

new_autopay = r'''export interface AutoPayOptions {
  planAmount: number;
  /** GOLD SIP can be configured for both gold and silver */
  metal: 'GOLD' | 'SILVER';
  /** SIP frequency */
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onDebug?: (message: string) => void;
  onSuccess: (subscriptionId: string) => void;
  onFailure: (error: any) => void;
}

export async function setupGoldAutoPay(options: AutoPayOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    options.onFailure(new Error('Failed to load Razorpay SDK'));
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    options.onFailure(new Error('Razorpay Key ID not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.'));
    return;
  }

  const amountInPaise = Math.round(options.planAmount * 100);

  const freqLabelMap: Record<AutoPayOptions['frequency'], string> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  };

  const metalLabel = options.metal === 'GOLD' ? 'Gold' : 'Silver';
  const freqLabel = freqLabelMap[options.frequency] ?? 'monthly';

  try {
    options.onDebug?.('Creating subscription on backend...');
    const createSubRes = await fetchWithFallback('/payments/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freq: freqLabel,
        amountPaise: amountInPaise,
        name: \\ SIP\
      })
    }, options.onDebug);

    const { json: createSubData } = await readApiResponse(createSubRes.res);

    if (!createSubData?.success || !createSubData.data?.subscriptionId) {
      options.onDebug?.('Subscription creation failed: ' + JSON.stringify(createSubData));
      throw new Error(createSubData?.error || 'Failed to create subscription on backend');
    }

    const { subscriptionId } = createSubData.data;
    options.onDebug?.('Backend returned subscriptionId: ' + subscriptionId);

    const razorpayOptions = {
      key: RAZORPAY_KEY_ID,
      subscription_id: subscriptionId,
      name: 'GOLD SIP',
      description: \\ SIP - ₹\ / \\,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      theme: {
        color: '#D97706',
      },
      handler: async (response: any) => {
        options.onDebug?.('Payment successful, verifying subscription...');
        try {
          const verifyRes = await fetchWithFallback('/payments/verify-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
            })
          }, options.onDebug);

          const { json: verifyData } = await readApiResponse(verifyRes.res);
          if (!verifyData?.success) {
            options.onDebug?.('Verification failed: ' + JSON.stringify(verifyData));
            options.onFailure(new Error(verifyData?.error || 'Subscription verification failed'));
            return;
          }

          options.onDebug?.('Subscription verified successfully!');
          options.onSuccess(verifyData.data.subscriptionId);
        } catch (err: any) {
          options.onDebug?.('Error in verification: ' + err.message);
          options.onFailure(err);
        }
      },
      modal: {
        ondismiss: () => {
          options.onDebug?.('User closed the Razorpay modal');
          options.onFailure(new Error('AutoPay setup cancelled'));
        },
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.open();
  } catch (backendError: any) {
    options.onFailure(backendError);
  }
}
'''

new_text = re.sub(
    r'export interface AutoPayOptions \{.*?(?=\n$|\Z)',
    new_autopay,
    text,
    flags=re.DOTALL
)

with open('apps/web-app/src/lib/razorpay.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)

print('Updated razorpay.ts successfully')