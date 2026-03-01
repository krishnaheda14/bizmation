/**
 * AuthPage - Sign In | Create Account
 *
 * Theme  : Cream / beige / golden  - matches the rest of the app
 * Font   : Cormorant Garamond for display headings
 *
 * Modes  :
 *   Sign In  -> Email + Password  OR  Magic Link (passwordless)
 *   Sign Up  -> 2-step form  (basic info -> identity / KYC)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { SignUpData } from '../context/AuthContext';

// --- Sparkle positions ---------------------------------------------------
const SPARKLES = [
  { top: '8%',  left: '5%',  delay: '0s',   size: 18 },
  { top: '15%', left: '88%', delay: '0.6s', size: 12 },
  { top: '35%', left: '92%', delay: '1.2s', size: 20 },
  { top: '60%', left: '4%',  delay: '0.3s', size: 14 },
  { top: '75%', left: '85%', delay: '1.8s', size: 16 },
  { top: '88%', left: '12%', delay: '0.9s', size: 10 },
  { top: '50%', left: '96%', delay: '2.1s', size: 22 },
  { top: '25%', left: '2%',  delay: '1.5s', size: 12 },
];

const Sparkle: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={style} className="absolute pointer-events-none animate-sparkle">
    <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
      fill="url(#sparkG)" opacity="0.85" />
    <defs>
      <linearGradient id="sparkG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
  </svg>
);

// --- Types ----------------------------------------------------------------
type Tab       = 'login'    | 'signup';
type LoginMode = 'password' | 'otp' | 'phone';
type OtpStep   = 'input'    | 'sent';

// --- Main component -------------------------------------------------------
const AuthPage: React.FC = () => {
  const { signIn, signUp, sendOtp, verifyOtp, sendPhoneOtp, verifyPhoneOtp } = useAuth();

  const [tab,       setTab]       = useState<Tab>('login');
  const [loginMode, setLoginMode] = useState<LoginMode>('password');
  const [otpStep,   setOtpStep]   = useState<OtpStep>('input');
  const [error,     setError]     = useState('');
  const [info,      setInfo]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [phoneNum,   setPhoneNum]  = useState('');
  const [phoneCode,  setPhoneCode] = useState('');
  const [phoneSent,  setPhoneSent] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes('/auth/verify') || window.location.search.includes('mode=signIn')) {
      (async () => {
        setLoading(true);
        try {
          const res = await verifyOtp();
          if (res.success) setInfo('Signed in as ' + res.email + '. Redirecting...');
          else setError('Link is invalid or expired. Please request a new one.');
        } catch (e: any) {
          setError(e?.message ?? 'Verification failed.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const clearMsgs = () => { setError(''); setInfo(''); };

  const [lpEmail,    setLpEmail]    = useState('');
  const [lpPassword, setLpPassword] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try   { await signIn(lpEmail.trim(), lpPassword); }
    catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally        { setLoading(false); }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try {
      await sendPhoneOtp(phoneNum.trim(), 'recaptcha-container');
      setPhoneSent(true);
    } catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally           { setLoading(false); }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try {
      await verifyPhoneOtp(phoneCode.trim());
    } catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally           { setLoading(false); }
  };

  const [otpEmail, setOtpEmail] = useState('');
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try   { await sendOtp(otpEmail.trim()); setOtpStep('sent'); }
    catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally        { setLoading(false); }
  };

  const blankForm = (): SignUpData => ({
    name: '', email: '', password: '', phone: '',
    city: '', state: '', country: 'India',
    dateOfBirth: '', panNumber: '', aadhaarLast4: '',
    role: 'CUSTOMER', shopName: '',
  });
  const [form,        setForm]        = useState<SignUpData>(blankForm);
  const [confirmPass, setConfirmPass] = useState('');
  const [signupStep,  setSignupStep]  = useState<1 | 2>(1);
  const setF = (key: keyof SignUpData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs();
    if (form.password !== confirmPass) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6)     { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signUp(form);
      // After signup, require phone verification. Show post-signup verification UI.
      setPostSignup({ phone: form.phone, email: form.email });
      setForm(blankForm()); setConfirmPass(''); setSignupStep(1);
    } catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally           { setLoading(false); }
  };

  // Post-signup verification state
  const [postSignup, setPostSignup] = useState<{ phone: string; email: string } | null>(null);
  const handleSendPostSignupOtp = async () => {
    clearMsgs(); setLoading(true);
    try {
      if (!postSignup) throw new Error('No phone to verify');
      await sendPhoneOtp(postSignup.phone, 'recaptcha-container-postsignup');
      setPhoneSent(true);
      setInfo('OTP sent to ' + postSignup.phone);
    } catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #fef9ee 0%, #fdf3d8 40%, #fef5e0 70%, #fffbf0 100%)' }}>

      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
      </div>

      {/* Floating sparkles */}
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} size={s.size} style={{ top: s.top, left: s.left, animationDelay: s.delay }} />
      ))}

      {/* Brand / logo - transparent logo, no ring or background */}
      <div className="relative z-10 mb-8 flex flex-col items-center animate-float">
        <img
          src="/logo.png"
          alt="Bizmation"
          className="w-28 h-28 object-contain mb-4 drop-shadow-lg"
        />
        <h1 className="font-display text-4xl font-semibold text-amber-900 tracking-wide leading-none">
          Bizmation Gold
        </h1>
        <p className="text-sm text-amber-600 mt-1 tracking-widest">
          Trusted Since 2024 &middot; Ahilyanagar
        </p>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,253,245,0.92)',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 20px 60px rgba(180,120,0,0.12), 0 4px 16px rgba(180,120,0,0.08)',
          backdropFilter: 'blur(12px)',
        }}>

        {/* Tab bar */}
        <div className="flex">
          {(['login', 'signup'] as Tab[]).map(t => (
            <button key={t}
              onClick={() => { setTab(t); clearMsgs(); setSignupStep(1); }}
              className="flex-1 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
              style={tab === t ? {
                background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 80%, #d97706 100%)',
                color: '#451a03',
              } : { background: 'rgba(253,243,212,0.6)', color: '#92400e' }}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="p-7">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm border"
              style={{ background: '#fff5f5', borderColor: '#fecaca', color: '#b91c1c' }}>
              <span className="flex-shrink-0 mt-0.5">!</span><p>{error}</p>
            </div>
          )}
          {info && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm border"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <span className="flex-shrink-0 mt-0.5">✓</span><p>{info}</p>
            </div>
          )}

          {/* SIGN IN */}
          {tab === 'login' && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-amber-900 mb-1">Welcome back</h2>
              <p className="text-xs text-amber-500 mb-5 tracking-wide">Sign in to your gold account</p>

              <div className="flex gap-2 p-1 mb-6 rounded-2xl"
                style={{ background: 'rgba(253,243,212,0.8)', border: '1px solid rgba(251,191,36,0.25)' }}>
                {(['password', 'otp', 'phone'] as LoginMode[]).map(m => (
                  <button key={m}
                    onClick={() => { setLoginMode(m); setOtpStep('input'); setPhoneSent(false); clearMsgs(); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all"
                    style={loginMode === m ? {
                      background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                      color: '#451a03',
                    } : { color: '#92400e' }}>
                    {m === 'password' ? 'Password' : m === 'otp' ? 'Magic Link' : 'Phone OTP'}
                  </button>
                ))}
              </div>

              {loginMode === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <GoldInput label="Email Address" type="email" value={lpEmail}
                    onChange={e => setLpEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
                  <div className="relative">
                    <GoldInput label="Password" type={showPass ? 'text' : 'password'} value={lpPassword}
                      onChange={e => setLpPassword(e.target.value)} required placeholder="Enter your password" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                      className="absolute right-4 bottom-3 text-amber-400 hover:text-amber-600 text-xs font-medium">
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <GoldButton loading={loading}>Sign In</GoldButton>
                  <p className="text-center text-xs text-amber-500 mt-1">
                    New here?{' '}
                    <button type="button" onClick={() => setTab('signup')}
                      className="text-amber-700 font-semibold underline underline-offset-2">
                      Create an account
                    </button>
                  </p>
                </form>
              ) : loginMode === 'phone' ? (
                phoneSent ? (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                    <div className="rounded-2xl px-4 py-3 text-xs text-amber-700 leading-relaxed"
                      style={{ background: 'rgba(253,243,212,0.7)', border: '1px solid rgba(251,191,36,0.25)' }}>
                      Enter the 6-digit OTP sent to <strong>{phoneNum}</strong>
                    </div>
                    <GoldInput label="OTP Code" type="text" inputMode="numeric" maxLength={6}
                      value={phoneCode} onChange={e => setPhoneCode(e.target.value)}
                      required autoFocus placeholder="6-digit OTP" />
                    <GoldButton loading={loading}>Verify OTP</GoldButton>
                    <button type="button" onClick={() => { setPhoneSent(false); clearMsgs(); }}
                      className="text-xs text-amber-500 underline underline-offset-2 w-full text-center">
                      Wrong number? Try again
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div className="rounded-2xl px-4 py-3 text-xs text-amber-700 leading-relaxed"
                      style={{ background: 'rgba(253,243,212,0.7)', border: '1px solid rgba(251,191,36,0.25)' }}>
                      Enter your mobile number with country code. We will send a one-time password (OTP).
                    </div>
                    <GoldInput label="Mobile Number" type="tel" value={phoneNum}
                      onChange={e => setPhoneNum(e.target.value)} required autoFocus placeholder="+91 98765 43210" />
                    <div id="recaptcha-container" />
                    <GoldButton loading={loading}>Send OTP</GoldButton>
                  </form>
                )
              ) : otpStep === 'input' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="rounded-2xl px-4 py-3 text-xs text-amber-700 leading-relaxed"
                    style={{ background: 'rgba(253,243,212,0.7)', border: '1px solid rgba(251,191,36,0.25)' }}>
                    Enter your email and we will send you a secure magic link. Click it to sign in instantly - no password needed.
                  </div>
                  <GoldInput label="Email Address" type="email" value={otpEmail}
                    onChange={e => setOtpEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
                  <GoldButton loading={loading}>Send Magic Link</GoldButton>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="text-5xl animate-float">✉</div>
                  <h3 className="font-display text-xl font-semibold text-amber-900">Check your inbox</h3>
                  <p className="text-sm text-amber-600 leading-relaxed">
                    We sent a magic link to<br />
                    <strong className="text-amber-800">{otpEmail}</strong>.<br />
                    Click it to sign in instantly - no password needed.
                  </p>
                  <button onClick={() => { setOtpStep('input'); clearMsgs(); }}
                    className="text-xs text-amber-500 underline underline-offset-2">
                    Wrong email? Try again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SIGN UP */}
          {tab === 'signup' && !postSignup && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-amber-900 mb-1">
                {signupStep === 1 ? 'Create your account' : 'Identity Details'}
              </h2>
              <p className="text-xs text-amber-500 mb-5 tracking-wide">
                {signupStep === 1 ? 'Join thousands of gold investors' : 'For compliance and fast payouts'}
              </p>

              <div className="flex items-center gap-2 mb-6">
                {[1, 2].map(s => (
                  <React.Fragment key={s}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={signupStep >= s ? {
                        background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                        color: '#451a03',
                        boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                      } : {
                        background: 'rgba(253,243,212,0.8)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: '#b45309',
                      }}>{s}</div>
                    {s < 2 && (
                      <div className="flex-1 h-px rounded-full"
                        style={{ background: signupStep > 1 ? 'linear-gradient(90deg,#fde68a,#f59e0b)' : 'rgba(251,191,36,0.2)' }} />
                    )}
                  </React.Fragment>
                ))}
                <span className="ml-2 text-xs text-amber-600 font-medium">Step {signupStep} of 2</span>
              </div>

              <form onSubmit={signupStep === 1 ? (e => { e.preventDefault(); clearMsgs(); setSignupStep(2); }) : handleSignup}
                className="space-y-4">
                {signupStep === 1 ? (
                  <>
                    <GoldInput label="Full Name" value={form.name} onChange={setF('name')} required autoFocus placeholder="Your full name" />
                    <GoldInput label="Email Address" type="email" value={form.email} onChange={setF('email')} required placeholder="you@example.com" />
                    <div className="relative">
                      <GoldInput label="Password" type={showPass ? 'text' : 'password'} value={form.password}
                        onChange={setF('password')} required placeholder="Min 6 characters" />
                      <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                        className="absolute right-4 bottom-3 text-amber-400 hover:text-amber-600 text-xs font-medium">
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <GoldInput label="Confirm Password" type={showPass ? 'text' : 'password'}
                      value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required placeholder="Repeat password" />
                    <GoldInput label="Mobile Number" type="tel" value={form.phone}
                      onChange={setF('phone')} required placeholder="+91 98765 43210" />

                    {/* Account type selector */}
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">Account Type</label>
                      <div className="flex gap-2">
                        {(['CUSTOMER', 'OWNER'] as const).map(r => (
                          <button key={r} type="button"
                            onClick={() => setForm(f => ({ ...f, role: r }))}
                            className="flex-1 py-2 rounded-2xl text-xs font-semibold transition-all"
                            style={form.role === r ? {
                              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                              color: '#451a03',
                              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                            } : {
                              background: 'rgba(253,243,212,0.8)',
                              border: '1px solid rgba(251,191,36,0.3)',
                              color: '#b45309',
                            }}>
                            {r === 'CUSTOMER' ? '👤 Customer' : '🏥 Shop Owner'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(form.role === 'OWNER' || form.role === 'CUSTOMER') && (
                      <GoldInput label="Shop / Business Name" value={form.shopName ?? ''}
                        onChange={setF('shopName')} required placeholder="e.g. Lakshmi Gold Palace" />
                    )}

                    <GoldButton loading={false}>Continue</GoldButton>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <GoldInput label="City" value={form.city} onChange={setF('city')} required placeholder="Mumbai" />
                      <GoldInput label="State" value={form.state} onChange={setF('state')} required placeholder="Maharashtra" />
                    </div>
                    <GoldInput label="Country" value={form.country} onChange={setF('country')} required />
                    <GoldInput label="Date of Birth" type="date" value={form.dateOfBirth} onChange={setF('dateOfBirth')} required />
                    <GoldInput label="PAN Number (optional)" value={form.panNumber} onChange={setF('panNumber')}
                      placeholder="ABCDE1234F" maxLength={10} />
                    <GoldInput label="Aadhaar Last 4 Digits (optional)" value={form.aadhaarLast4}
                      onChange={setF('aadhaarLast4')} placeholder="e.g. 6789" maxLength={4} />
                    <p className="text-xs text-stone-400 leading-relaxed px-1">
                      By creating an account you agree to our Terms of Service. Data is stored securely for KYC and tax compliance (India).
                    </p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setSignupStep(1)}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                        style={{ background: 'rgba(253,243,212,0.8)', border: '1px solid rgba(251,191,36,0.4)', color: '#92400e' }}>
                        Back
                      </button>
                      <GoldButton loading={loading} className="flex-1">Create Account</GoldButton>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {/* Post-signup: prompt phone verification */}
          {postSignup && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-amber-900 mb-1">Verify your phone</h2>
              <p className="text-sm text-amber-600 mb-4">We sent an email verification. Before you can sign in, verify your phone to activate your account.</p>
              <div className="mb-4 text-sm text-amber-700">Phone: <strong>{postSignup.phone}</strong></div>
              <div id="recaptcha-container-postsignup" />
              <div className="flex gap-3">
                <button type="button" onClick={handleSendPostSignupOtp}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-semibold">Send OTP</button>
                <button type="button" onClick={() => setPostSignup(null)}
                  className="flex-1 py-3 rounded-2xl bg-white border border-amber-200 text-amber-700">Cancel</button>
              </div>
              {phoneSent && (
                <form onSubmit={handleVerifyPhoneOtp} className="mt-4 space-y-3">
                  <GoldInput label="Enter OTP" type="text" value={phoneCode} onChange={e => setPhoneCode(e.target.value)} required placeholder="6-digit OTP" />
                  <GoldButton loading={loading}>Verify</GoldButton>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-7 text-xs text-amber-500/70 text-center">
        Secured by Firebase Auth · TLS 1.3 · 256-bit encrypted
      </p>
    </div>
  );
};

// --- Gold input field -----------------------------------------------------
interface GoldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
const GoldInput: React.FC<GoldInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">{label}</label>
    <input {...props}
      className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none"
      style={{
        background: 'rgba(255,251,240,0.9)',
        border: '1.5px solid rgba(251,191,36,0.35)',
        boxShadow: 'inset 0 1px 3px rgba(180,120,0,0.06)',
      }}
      onFocus={e => {
        e.currentTarget.style.border = '1.5px solid rgba(245,158,11,0.7)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.15)';
      }}
      onBlur={e => {
        e.currentTarget.style.border = '1.5px solid rgba(251,191,36,0.35)';
        e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(180,120,0,0.06)';
      }}
    />
  </div>
);

// --- Shimmer gold button --------------------------------------------------
const GoldButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ loading, children, className = 'w-full' }) => (
  <button type="submit" disabled={loading}
    className={`${className} py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed animate-shimmer`}
    style={{
      background: 'linear-gradient(90deg, #fde68a 0%, #f59e0b 30%, #fbbf24 60%, #f59e0b 100%)',
      backgroundSize: '200% auto',
      boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
      color: '#451a03',
    }}>
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Please wait...
      </span>
    ) : children}
  </button>
);

// --- Firebase error map --------------------------------------------------
const friendlyError = (code: string): string =>
  ({
    'auth/user-not-found':             'No account found with this email. Please sign up.',
    'auth/wrong-password':             'Incorrect password. Please try again.',
    'auth/invalid-credential':         'Incorrect email or password. Try signing in with Magic Link if you registered without a password.',
    'auth/email-already-in-use':       'This email is already registered. Please sign in.',
    'auth/invalid-email':              'Please enter a valid email address.',
    'auth/weak-password':              'Password must be at least 6 characters.',
    'auth/too-many-requests':          'Too many attempts. Please wait a few minutes.',
    'auth/network-request-failed':     'Network error. Please check your connection.',
    'auth/invalid-action-code':        'Magic link is invalid or expired. Request a new one.',
    'auth/invalid-phone-number':       'Invalid phone number. Include country code (e.g. +91 98765 43210).',
    'auth/code-expired':               'OTP has expired. Please request a new code.',
    'auth/invalid-verification-code':  'Invalid OTP. Please check and try again.',
    'auth/missing-phone-number':       'Please enter your phone number.',
    'auth/quota-exceeded':             'SMS quota exceeded. Please try again later.',
  } as Record<string, string>)[code] ?? code;

export default AuthPage;