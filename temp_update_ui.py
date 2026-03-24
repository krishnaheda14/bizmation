import re

with open('apps/web-app/src/pages/HomeLanding.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. ensure Sparkles is imported
if ' Sparkles,' not in text and 'Sparkles ' not in text:
    text = re.sub(r'(import \{.*?)(Loader2)(.*?} from \'lucide-react\';)', r'\1Loader2, Sparkles\3', text, flags=re.DOTALL)

# 2. Add onDebug in handleAutoPay
new_autopay = r'''const handleAutoPay = () => {
    if (!autoPayForm.amount) return;
    const planAmount   = parseFloat(autoPayForm.amount);
    const custName     = userProfile?.name  ?? currentUser?.displayName ?? '';
    const custEmail    = userProfile?.email ?? currentUser?.email ?? '';
    const custPhone    = userProfile?.phone ?? '';
    setPaying(true);
    setupGoldAutoPay({
      planAmount,
      metal:        autoPayForm.metal,
      frequency:    autoPayForm.frequency,
      customerName:  custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      onDebug: (msg) => console.log('[AutoPay Debug]:', msg),
      onSuccess: async (id) => {'''
      
text = re.sub(r'const handleAutoPay = \(\) => \{.+?onSuccess: async \(id\) => \{', new_autopay, text, flags=re.DOTALL)

# 3. Add aesthetic loader to BottomSheet
loader_overlay = r'''
        <BottomSheet title="Setup GOLD SIP" onClose={() => { if(!paying) setModal({ type: null }) }}>
          <div className="space-y-4 relative">
            {paying && (
              <div className="absolute inset-x-0 -top-4 bottom-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl">
                <div className="relative mb-4">
                  <div className="w-16 h-16 border-4 border-amber-200 dark:border-amber-900 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={24} className="text-amber-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-amber-700 dark:text-amber-400 font-bold animate-pulse text-lg tracking-wider mb-2">Setting up your SIP...</div>
                <div className="flex gap-1.5 justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
'''
text = re.sub(r'<BottomSheet title="Setup GOLD SIP" onClose=\{.+? \}\}>\s*<div className="space-y-4">', loader_overlay, text, flags=re.DOTALL)

with open('apps/web-app/src/pages/HomeLanding.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated HomeLanding.tsx successfully')