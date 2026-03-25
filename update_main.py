import re

with open('src/main.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_loader = r'''  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-950 to-black flex items-center justify-center overflow-hidden relative">
        {/* Animated Background Sparkles & Dust layer */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,1)] animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="absolute top-[60%] left-[80%] w-3 h-3 bg-gray-200 rounded-full shadow-[0_0_12px_rgba(229,231,235,1)] animate-pulse" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute top-[80%] left-[30%] w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,1)] animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
          <div className="absolute top-[30%] left-[70%] w-2.5 h-2.5 bg-yellow-100 rounded-full shadow-[0_0_10px_rgba(254,240,138,1)] animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
          <div className="absolute top-[10%] left-[50%] w-2 h-2 bg-stone-300 rounded-full shadow-[0_0_10px_rgba(214,211,209,1)] animate-ping" style={{ animationDuration: '4s', animationDelay: '2s' }}></div>
          <div className="absolute top-[75%] left-[55%] w-3 h-3 bg-amber-200 rounded-full shadow-[0_0_15px_rgba(253,230,138,1)] animate-pulse" style={{ animationDuration: '2s', animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative flex flex-col items-center gap-6 z-10">
          {/* Animated rings */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Outer large pulse ring */}
            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            {/* Middle gold spin ring */}
            <div className="absolute inset-2 border-[5px] border-amber-400 rounded-full border-t-transparent border-b-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
            {/* Inner silver-ish spin ring */}
            <div className="absolute inset-5 border-4 border-gray-300 rounded-full border-l-transparent border-r-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            
            {/* Core shining coin body */}
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-300 via-yellow-500 to-amber-700 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center animate-pulse">
              <span className="text-2xl drop-shadow-md">✨</span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 animate-pulse tracking-widest pb-1 drop-shadow-lg">
              BIZMATION GOLD
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce shadow-md" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-gray-300 rounded-full animate-bounce shadow-md" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-amber-600 rounded-full animate-bounce shadow-md" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="text-amber-500/80 font-medium text-xs tracking-wider uppercase mt-4 animate-pulse">
              Loading Secure Vault
            </p>
          </div>
        </div>
      </div>
    );
  }'''

text = re.sub(
    r'  if \(loadingAuth\) \{.*?    \}',
    new_loader,
    text,
    flags=re.DOTALL
)

with open('src/main.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated loader in main.tsx successfully')