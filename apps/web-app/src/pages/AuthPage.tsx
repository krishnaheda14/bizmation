/**
 * AuthPage – Sign In | Create Account
 *
 * Theme   : Warm gold/cream/amber – matches the rest of the app
 * Modes   : Password  |  Magic Link (email OTP)
 * Signup  : 3-step form  (type → basics → compliance)
 */

import React, { useState, useEffect } from 'react';
import { Lock, Mail, Smartphone, User, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Floating sparkles ────────────────────────────────────────────────────────
const SPARKLES = [
  { top: '7%',  left: '4%',  delay: '0s',   size: 18 },
  { top: '14%', left: '89%', delay: '0.6s', size: 12 },
  { top: '34%', left: '93%', delay: '1.2s', size: 20 },
  { top: '58%', left: '3%',  delay: '0.3s', size: 14 },
  { top: '74%', left: '86%', delay: '1.8s', size: 16 },
  { top: '87%', left: '11%', delay: '0.9s', size: 10 },
  { top: '50%', left: '97%', delay: '2.1s', size: 22 },
  { top: '24%', left: '1%',  delay: '1.5s', size: 12 },
];

const Sparkle: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={style} className="absolute pointer-events-none animate-sparkle">
    <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
      fill="url(#sparkG)" opacity="0.85" />
    <defs>
      <linearGradient id="sparkG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Indian States ────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Delhi','Jammu & Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const CITIES_BY_STATE: Record<string, string[]> = {
  'Maharashtra':      ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Ahilyanagar','Solapur','Thane','Navi Mumbai','Kolhapur','Sangli','Latur','Jalgaon','Akola','Dhule','Amravati','Chandrapur','Nanded','Satara','Ratnagiri'],
  'Delhi':            ['New Delhi','Central Delhi','North Delhi','South Delhi','East Delhi','West Delhi','Dwarka','Rohini','Noida (NCR)'],
  'Gujarat':          ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand','Bharuch','Morbi'],
  'Karnataka':        ['Bangalore','Mysore','Hubli','Mangalore','Belgaum','Davanagere','Bellary','Shimoga','Tumkur','Udupi'],
  'Tamil Nadu':       ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Tiruppur','Dindigul'],
  'Rajasthan':        ['Jaipur','Jodhpur','Udaipur','Ajmer','Kota','Bikaner','Alwar','Bhilwara','Sikar','Tonk'],
  'Uttar Pradesh':    ['Lucknow','Kanpur','Agra','Varanasi','Allahabad (Prayagraj)','Meerut','Noida','Ghaziabad','Bareilly','Aligarh','Gorakhpur','Mathura'],
  'West Bengal':      ['Kolkata','Howrah','Asansol','Siliguri','Durgapur','Bardhaman','Malda','Kharagpur'],
  'Madhya Pradesh':   ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Satna','Rewa'],
  'Andhra Pradesh':   ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Rajahmundry','Tirupati','Kakinada'],
  'Telangana':        ['Hyderabad','Warangal','Nizamabad','Karimnagar','Ramagundam','Khammam','Secunderabad'],
  'Kerala':           ['Thiruvananthapuram','Kochi','Kozhikode','Kottayam','Thrissur','Palakkad','Malappuram','Kannur'],
  'Punjab':           ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Pathankot','Hoshiarpur'],
  'Haryana':          ['Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal','Sonipat'],
  'Bihar':            ['Patna','Gaya','Bhagalpur','Muzaffarpur','Purnia','Arrah','Begusarai','Munger'],
  'Odisha':           ['Bhubaneswar','Cuttack','Rourkela','Brahmapur','Sambalpur','Puri','Balasore'],
  'Jharkhand':        ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar','Hazaribagh'],
  'Assam':            ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia'],
  'Chhattisgarh':     ['Raipur','Bhilai','Korba','Bilaspur','Durg','Rajnandgaon'],
  'Himachal Pradesh': ['Shimla','Manali','Dharamshala','Solan','Mandi','Kullu'],
  'Uttarakhand':      ['Dehradun','Haridwar','Roorkee','Haldwani','Kashipur','Rishikesh','Mussoorie'],
  'Goa':              ['Panaji','Margao','Vasco da Gama','Mapusa','Ponda'],
  'Chandigarh':       ['Chandigarh'],
  'Jammu & Kashmir':  ['Srinagar','Jammu','Sopore','Baramulla','Kathua','Anantnag'],
  'Ladakh':           ['Leh','Kargil'],
  'Puducherry':       ['Puducherry','Karaikal','Mahe'],
  'Tripura':          ['Agartala','Dharmanagar','Udaipur'],
  'Manipur':          ['Imphal','Thoubal','Bishnupur'],
  'Meghalaya':        ['Shillong','Tura','Nongpoh'],
  'Nagaland':         ['Kohima','Dimapur','Mokokchung'],
  'Mizoram':          ['Aizawl','Lunglei','Champhai'],
  'Sikkim':           ['Gangtok','Namchi','Gyalshing'],
  'Arunachal Pradesh':['Itanagar','Naharlagun','Pasighat'],
  'Andaman & Nicobar Islands': ['Port Blair'],
  'Lakshadweep':      ['Kavaratti'],
};

type Tab       = 'login' | 'signup';
type LoginMode = 'password' | 'otp';
type OtpStep   = 'input' | 'sent';
type PhoneOtpStep = 'phone' | 'code' | 'done';
type ProgressStatus = 'pending' | 'running' | 'done' | 'error';
type ProgressStep   = { id: string; label: string; status: ProgressStatus; detail?: string };

interface ExtSignUpData {
  name: string; email: string; password: string; phone: string;
  role: 'CUSTOMER' | 'OWNER'; shopName: string;
  ownerCode: string;
  city: string; state: string; country: string; dateOfBirth: string;
  investmentGoal: string; referralCode: string;
  panNumber: string; aadhaarLast4: string; aadhaarNumber: string; gstNumber: string;
  hallmarkLicenseNumber: string; businessType: string; businessAddress: string; businessPincode: string;
}

const blankForm = (): ExtSignUpData => ({
  name: '', email: '', password: '', phone: '+91',
  role: 'CUSTOMER', shopName: '', ownerCode: '',
  city: '', state: '', country: 'India', dateOfBirth: '',
  investmentGoal: '', referralCode: '',
  panNumber: '', aadhaarLast4: '', aadhaarNumber: '', gstNumber: '',
  hallmarkLicenseNumber: '', businessType: '', businessAddress: '', businessPincode: '',
});

const AuthPage: React.FC = () => {
  const { signIn, signUp, sendOtp, verifyOtp, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, verifyPhoneOtpAndLogin, signInWithPhonePassword } = useAuth();

  const [tab,        setTab]        = useState<Tab>('login');
  const [loginMode,  setLoginMode]  = useState<LoginMode>('password');
  const [otpStep,    setOtpStep]    = useState<OtpStep>('input');
  const [phoneOtpStep, setPhoneOtpStep] = useState<PhoneOtpStep>('phone');
  const [phoneOtpNumber, setPhoneOtpNumber] = useState('+91');
  const [phoneOtpCode, setPhoneOtpCode]     = useState('');
  // phoneRaw: just the 10-digit number the user types (without +91)
  // form.phone is always set to '+91' + phoneRaw
  const [phoneRaw, setPhoneRaw] = useState('');
  const [signupStep, setSignupStep] = useState<1|2|3>(1);
  const [error,      setError]      = useState('');
  const [info,       setInfo]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [accountCreated, setAccountCreated] = useState('');
  const [signupProgress, setSignupProgress] = useState<ProgressStep[]>([]);
  const [otpDebugLog, setOtpDebugLog] = useState<string[]>([]);
  

  const addOtpLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setOtpDebugLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  };

  const [lpEmail,    setLpEmail]    = useState('');
  const [lpPassword, setLpPassword] = useState('');
  const [otpEmail,   setOtpEmail]   = useState('');
  const [form,       setForm]       = useState<ExtSignUpData>(blankForm());
  const [confirmPass, setConfirmPass] = useState('');

  const clearMsgs = () => { setError(''); setInfo(''); setSignupProgress([]); };
  const setF = (key: keyof ExtSignUpData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (window.location.hash.includes('/auth/verify') || window.location.search.includes('mode=signIn')) {
      (async () => {
        setLoading(true);
        try {
          const res = await verifyOtp();
          if (res.success) setInfo('Signed in as ' + res.email + '. Redirecting...');
          else setError('Link is invalid or expired. Please request a new one.');
        } catch (e: any) { setError(e?.message ?? 'Verification failed.'); }
        finally { setLoading(false); }
      })();
    }
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try { await signIn(lpEmail.trim(), lpPassword); }
    catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); clearMsgs();
    try { await signInWithGoogle(); }
    catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    try { await sendOtp(otpEmail.trim()); setOtpStep('sent'); }
    catch (e: any) { setError(friendlyError(e?.code ?? e?.message)); }
    finally { setLoading(false); }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    setOtpDebugLog([]);
    const workerUrl = import.meta.env.VITE_TWILIO_WORKER_URL as string | undefined;
    addOtpLog(`📡 Sending OTP to: ${phoneOtpNumber.trim()}`);
    addOtpLog(`🔧 VITE_TWILIO_WORKER_URL = ${workerUrl || '⚠️ NOT SET — add it in Cloudflare Pages → Settings → Environment Variables'}`);
    if (!workerUrl) {
      addOtpLog('❌ VITE_TWILIO_WORKER_URL is missing. Set it to your deployed Twilio Worker URL (e.g. https://twilio-otp-worker.xxx.workers.dev)');
      
    }
    try {
      await sendPhoneOtp(phoneOtpNumber.trim());
      addOtpLog('✅ OTP sent successfully via backend');
      setPhoneOtpStep('code');
      setInfo('OTP sent to ' + phoneOtpNumber);
    } catch (e: any) {
      addOtpLog(`❌ Error: ${e?.message ?? 'Unknown error'}`);
      setError(e?.message ?? 'Failed to send OTP.');
    }
    finally { setLoading(false); }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs(); setLoading(true);
    addOtpLog(`🔍 Verifying OTP code for ${phoneOtpNumber.trim()}`);
    try {
      await verifyPhoneOtpAndLogin(phoneOtpNumber.trim(), phoneOtpCode.trim());
      addOtpLog('✅ OTP verified — signed in!');
      setPhoneOtpStep('done');
      setInfo('Signed in successfully!');
    } catch (e: any) {
      addOtpLog(`❌ Error: ${e?.message}`);
      setError(e?.message ?? 'Invalid or expired OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const goStep2 = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs();
    if (!form.name.trim())               { setError('Please enter your name.'); return; }
    if (!form.email.trim())              { setError('Please enter your email.'); return; }
    if (form.password.length < 6)        { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== confirmPass)   { setError('Passwords do not match.'); return; }
    if (form.role === 'OWNER' && !form.shopName.trim()) { setError('Please enter the shop / business name.'); return; }
    if (form.role === 'CUSTOMER' && !form.ownerCode.trim()) { setError('Please enter the shop owner code.'); return; }
    // Phone validation: must be exactly 10 digits (after +91 prefix)
    const phoneDigits = phoneRaw.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number (do not include +91).');
      return;
    }
    if (['0','1','2','3','4','5'].includes(phoneDigits[0])) {
      setError('Mobile number must start with 6, 7, 8 or 9.');
      return;
    }

    // For CUSTOMER role: validate that the owner code exists in Firestore.
    if (form.role === 'CUSTOMER') {
      try {
        setLoading(true);
        const code = form.ownerCode.trim().toUpperCase();
        const shopQ = query(collection(db, 'shops'), where('ownerCode', '==', code), limit(1));
        const shopSnap = await getDocs(shopQ);
        if (shopSnap.empty) {
          setError('Invalid owner code. Please ask your shop owner for the exact code.');
          setLoading(false);
          return;
        }
        const linkedShopName = String(shopSnap.docs[0].data()?.name ?? '').trim().toLowerCase();
        setForm(f => ({ ...f, ownerCode: code, shopName: linkedShopName }));
      } catch {
        // Allow signup if Firestore check fails (non-blocking)
      } finally {
        setLoading(false);
      }
    }

    setSignupStep(2);
  };

  const goStep3 = (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs();
    if (form.role === 'CUSTOMER') {
      if (!form.city.trim() || !form.state.trim()) { setError('City and state are required.'); return; }
      if (!form.dateOfBirth) { setError('Date of birth is required.'); return; }
    } else {
      if (!form.businessAddress.trim()) { setError('Business address is required for shop owner.'); return; }
      if (!/^\d{6}$/.test(form.businessPincode.trim())) { setError('Business pincode must be 6 digits.'); return; }
    }
    setSignupStep(3);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clearMsgs();
    if (form.role === 'OWNER') {
      if (!form.panNumber.trim())    { setError('PAN number is required for shop owners.'); return; }
      if (!form.gstNumber.trim())    { setError('GST number is required for shop owners.'); return; }
      if (!/^\d{12}$/.test(form.aadhaarNumber.trim())) { setError('Aadhaar number must be exactly 12 digits for shop owners.'); return; }
      if (!form.hallmarkLicenseNumber.trim()) { setError('Hallmark license number is required for shop owners.'); return; }
    }
    // Build progress steps for visual feedback during signup
    const steps: ProgressStep[] = [
      { id: 'create-auth',  label: 'Creating your account',      status: 'pending' },
      { id: 'verify-email', label: 'Sending verification email', status: 'pending' },
      { id: 'save-profile', label: 'Saving profile to database', status: 'pending' },
      ...(form.role === 'OWNER'
        ? [{ id: 'setup-shop', label: 'Setting up your shop',      status: 'pending' as ProgressStatus }]
        : form.ownerCode.trim()
        ? [{ id: 'link-shop',  label: 'Linking you to your shop',  status: 'pending' as ProgressStatus }]
        : []),
    ];
    setSignupProgress(steps);
    setLoading(true);
    try {
      await signUp({ ...form } as any, (stepId, status, detail) => {
        setSignupProgress(prev => prev.map(s => s.id === stepId ? { ...s, status, detail } : s));
      });
      setAccountCreated(form.email);
      setForm(blankForm()); setConfirmPass(''); setSignupStep(1);
      setSignupProgress([]);
    } catch (e: any) {
      setError(friendlyError(e?.code ?? e?.message));
      // Keep signupProgress visible so the user can see which step failed
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Account Type & Basics', form.role === 'OWNER' ? 'Business Details' : 'Personal Details', 'KYC & Compliance'];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #fef9ee 0%, #fdf3d8 40%, #fef5e0 70%, #fffbf0 100%)' }}>

      {accountCreated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}>
          <div className="relative w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center"
            style={{ background: 'linear-gradient(145deg,#fffdf5 0%,#fef9e0 100%)', boxShadow: '0 32px 80px rgba(180,120,0,0.25),0 0 0 1px rgba(251,191,36,0.4)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-float"
              style={{ background: 'linear-gradient(135deg,#fde68a,#f59e0b)', boxShadow: '0 8px 32px rgba(245,158,11,0.4)' }}>
              <svg viewBox="0 0 36 36" className="w-10 h-10">
                <path d="M6 18 l8 8 l16 -16" fill="none" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-amber-900 mb-2">Account Created!</h2>
            <p className="text-sm text-amber-700 mb-2">Verification email sent to</p>
            <p className="font-bold text-amber-800 text-sm mb-4 break-all">{accountCreated}</p>
            <p className="text-sm font-semibold text-amber-800 mb-1">Please login to continue.</p>
            <p className="text-xs text-amber-600 mb-6">Check your email and verify your address first, then sign in below.</p>
            <div className="flex gap-3 mb-6 text-amber-400">
              {[16,12,20,12,16].map((sz,i) => (
                <svg key={i} width={sz} height={sz} viewBox="0 0 24 24" fill="url(#acg)" className="animate-sparkle" style={{animationDelay:`${i*0.3}s`}}>
                  <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
                  <defs><linearGradient id="acg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fcd34d"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
                </svg>
              ))}
            </div>
            <GoldButton loading={false} onClick={() => { setAccountCreated(''); setTab('login'); }}>Go to Sign In</GoldButton>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#fcd34d 0%,transparent 70%)' }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#f59e0b 0%,transparent 70%)' }} />
      </div>
      {SPARKLES.map((s,i) => <Sparkle key={i} size={s.size} style={{ top: s.top, left: s.left, animationDelay: s.delay }} />)}

      <div className="relative z-10 mb-8 flex flex-col items-center animate-float">
        <img src="/logo.png" alt="Bizmation" className="w-28 h-28 object-contain mb-4 drop-shadow-lg" />
        <h1 className="font-display text-4xl font-semibold text-amber-900 tracking-wide leading-none">Bizmation Gold</h1>
        <p className="text-sm text-amber-600 mt-1 tracking-widest">Digital Gold &amp; Silver · India</p>
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: 'rgba(255,253,245,0.92)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 20px 60px rgba(180,120,0,0.12),0 4px 16px rgba(180,120,0,0.08)', backdropFilter: 'blur(12px)' }}>

        <div className="flex">
          {(['login','signup'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); clearMsgs(); setSignupStep(1); }}
              className="flex-1 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
              style={tab===t ? { background:'linear-gradient(135deg,#fde68a 0%,#f59e0b 80%,#d97706 100%)',color:'#451a03' } : { background:'rgba(253,243,212,0.6)',color:'#92400e' }}>
              {t==='login'?'Sign In':'Create Account'}
            </button>
          ))}
        </div>

        <div className="p-7">
          {error && <div className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm border" style={{ background:'#fff5f5',borderColor:'#fecaca',color:'#b91c1c' }}><span className="flex-shrink-0 mt-0.5">⚠</span><p>{error}</p></div>}
          {info  && <div className="mb-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm border" style={{ background:'#f0fdf4',borderColor:'#bbf7d0',color:'#166534' }}><span className="flex-shrink-0 mt-0.5">✓</span><p>{info}</p></div>}

          {tab === 'login' && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-amber-900 mb-1">Welcome back</h2>
              <p className="text-xs text-amber-500 mb-5 tracking-wide">Sign in to your gold account</p>

              <button type="button" onClick={handleGoogleLogin} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl mb-4 border transition-all hover:scale-[1.01] active:scale-[0.98] hover:shadow-md"
                style={{ background:'#fff',borderColor:'rgba(251,191,36,0.5)',boxShadow:'0 2px 8px rgba(180,120,0,0.08)',color:'#92400e' }}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-semibold">Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background:'rgba(251,191,36,0.3)' }} />
                <span className="text-xs text-amber-400 font-medium">or</span>
                <div className="flex-1 h-px" style={{ background:'rgba(251,191,36,0.3)' }} />
              </div>

              <div className="flex gap-1.5 p-1 mb-6 rounded-2xl" style={{ background:'rgba(253,243,212,0.8)',border:'1px solid rgba(251,191,36,0.25)' }}>
                {([
                  { mode: 'password'  as LoginMode, Icon: Lock, label: 'Password' },
                  { mode: 'otp'       as LoginMode, Icon: Mail, label: 'Magic Link' },
                ] as { mode: LoginMode; Icon: React.FC<any>; label: string }[]).map(({ mode, Icon, label }) => (
                  <button key={mode} onClick={() => { setLoginMode(mode); setOtpStep('input'); clearMsgs(); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex flex-col items-center gap-0.5"
                    style={loginMode===mode ? { background:'linear-gradient(135deg,#fde68a,#f59e0b)',color:'#451a03' } : { color:'#92400e' }}>
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {loginMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <GoldInput label="Email Address" type="email" value={lpEmail} onChange={e=>setLpEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
                  <div className="relative">
                    <GoldInput label="Password" type={showPass?'text':'password'} value={lpPassword} onChange={e=>setLpPassword(e.target.value)} required placeholder="Enter your password" />
                    <button type="button" tabIndex={-1} onClick={()=>setShowPass(v=>!v)} className="absolute right-4 bottom-3 text-amber-400 hover:text-amber-600 text-xs font-medium transition-colors">{showPass?'Hide':'Show'}</button>
                  </div>
                  <GoldButton loading={loading}>Sign In</GoldButton>
                  <p className="text-center text-xs text-amber-500 mt-1">New here? <button type="button" onClick={()=>setTab('signup')} className="text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900 transition-colors">Create an account</button></p>
                </form>
              )}

              {loginMode === 'otp' && (
                otpStep === 'input' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="rounded-2xl px-4 py-3 text-xs text-amber-700" style={{ background:'rgba(253,243,212,0.7)',border:'1px solid rgba(251,191,36,0.25)' }}>
                      Enter your email and we will send a secure magic link. Click it to sign in instantly — no password needed.
                    </div>
                    <GoldInput label="Email Address" type="email" value={otpEmail} onChange={e=>setOtpEmail(e.target.value)} required autoFocus placeholder="you@example.com" />
                    <GoldButton loading={loading}>Send Magic Link</GoldButton>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto animate-float">
                      <Mail size={32} className="text-amber-500" />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-amber-900">Check your inbox</h3>
                    <p className="text-sm text-amber-600 leading-relaxed">We sent a magic link to<br /><strong className="text-amber-800">{otpEmail}</strong></p>
                    <button onClick={()=>{setOtpStep('input');clearMsgs();}} className="text-xs text-amber-500 underline underline-offset-2 hover:text-amber-700 transition-colors">Wrong email? Try again</button>
                  </div>
                )
              )}
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                {[1,2,3].map(s => (
                  <React.Fragment key={s}>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={signupStep > s ? { background:'linear-gradient(135deg,#fde68a,#f59e0b)',color:'#451a03' }
                          : signupStep===s ? { background:'linear-gradient(135deg,#fde68a,#f59e0b)',color:'#451a03',boxShadow:'0 0 0 3px rgba(251,191,36,0.3)' }
                          : { background:'rgba(253,243,212,0.8)',border:'1px solid rgba(251,191,36,0.3)',color:'#b45309' }}>
                        {signupStep > s ? '✓' : s}
                      </div>
                    </div>
                    {s<3 && <div className="flex-1 h-0.5 rounded-full transition-all" style={{ background:signupStep>s?'linear-gradient(90deg,#fde68a,#f59e0b)':'rgba(251,191,36,0.2)' }} />}
                  </React.Fragment>
                ))}
              </div>
              <h2 className="font-display text-2xl font-semibold text-amber-900 mb-0.5">{stepLabels[signupStep-1]}</h2>
              <p className="text-xs text-amber-500 mb-5 tracking-wide">
                {signupStep===1
                  ? 'Choose your account type and basics'
                  : signupStep===2
                  ? (form.role === 'OWNER' ? 'Your business details' : 'Your personal & contact details')
                  : 'For regulatory compliance and fast payouts'}
              </p>

              {signupStep === 1 && (
                <form onSubmit={goStep2} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-2 tracking-wide">I am a…</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { role:'CUSTOMER' as const, Icon: User,  title:'Customer',   desc:'Buy & invest in digital gold/silver' },
                        { role:'OWNER'    as const, Icon: Store, title:'Shop Owner', desc:'Manage your jewellery shop & customers' },
                      ]).map(({ role, Icon, title, desc }) => (
                        <button key={role} type="button" onClick={()=>setForm(f=>({...f,role}))}
                          className="flex flex-col items-center p-4 rounded-2xl border-2 text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={form.role===role
                            ? { background:'linear-gradient(135deg,#fffbeb,#fef3c7)',borderColor:'#f59e0b',boxShadow:'0 4px 16px rgba(245,158,11,0.2)' }
                            : { background:'rgba(253,243,212,0.5)',borderColor:'rgba(251,191,36,0.25)',color:'#92400e' }}>
                          <Icon size={28} className="text-amber-600 mb-1.5" />
                          <span className="font-bold text-sm text-amber-900">{title}</span>
                          <span className="text-[10px] text-amber-600 mt-0.5 leading-tight">{desc}</span>
                          {form.role===role && <span className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">Selected ✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <GoldInput label="Full Name" value={form.name} onChange={setF('name')} required autoFocus placeholder="Your full legal name" />
                  <GoldInput label="Email Address" type="email" value={form.email} onChange={setF('email')} required placeholder="you@example.com" />
                  <div className="relative">
                    <GoldInput label="Password" type={showPass?'text':'password'} value={form.password} onChange={setF('password')} required placeholder="Min 6 characters" />
                    <button type="button" tabIndex={-1} onClick={()=>setShowPass(v=>!v)} className="absolute right-4 bottom-3 text-amber-400 hover:text-amber-600 text-xs font-medium transition-colors">{showPass?'Hide':'Show'}</button>
                  </div>
                  <GoldInput label="Confirm Password" type={showPass?'text':'password'} value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} required placeholder="Repeat password" />
                  {/* ── Split phone input: +91 fixed prefix + 10-digit number ── */}
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3.5 py-2.5 rounded-2xl text-sm font-bold text-amber-800 select-none cursor-default"
                        style={{ background:'rgba(253,243,212,0.8)',border:'1.5px solid rgba(251,191,36,0.35)',minWidth:'60px' }}>
                        +91
                      </div>
                      <input
                        type="tel" inputMode="numeric" maxLength={10}
                        value={phoneRaw}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g,'').slice(0,10);
                          setPhoneRaw(digits);
                          setForm(f => ({ ...f, phone: '+91' + digits }));
                        }}
                        required placeholder="98765 43210"
                        className="flex-1 px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none"
                        style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}
                        onFocus={e=>{e.currentTarget.style.border='1.5px solid rgba(245,158,11,0.7)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(251,191,36,0.15)';}}
                        onBlur={e=>{e.currentTarget.style.border='1.5px solid rgba(251,191,36,0.35)';e.currentTarget.style.boxShadow='inset 0 1px 3px rgba(180,120,0,0.06)';}}
                      />
                    </div>
                    <p className="text-[10px] text-amber-400 mt-1 pl-1">10-digit number without 0 or +91</p>
                  </div>
                  {form.role === 'OWNER' ? (
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">Shop / Business Name *</label>
                      <input
                        type="text" required
                        value={form.shopName}
                        onChange={e => setForm(f => ({ ...f, shopName: e.target.value.toLowerCase() }))}
                        placeholder="e.g. lakshmi gold palace"
                        className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none"
                        style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}
                        onFocus={e=>{e.currentTarget.style.border='1.5px solid rgba(245,158,11,0.7)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(251,191,36,0.15)';}}
                        onBlur={e=>{e.currentTarget.style.border='1.5px solid rgba(251,191,36,0.35)';e.currentTarget.style.boxShadow='inset 0 1px 3px rgba(180,120,0,0.06)';}}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">Shop Owner Code *</label>
                      <input
                        type="text" required
                        value={form.ownerCode}
                        onChange={e => setForm(f => ({ ...f, ownerCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                        placeholder="e.g. RAVI7K2Q"
                        className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none uppercase"
                        style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}
                        onFocus={e=>{e.currentTarget.style.border='1.5px solid rgba(245,158,11,0.7)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(251,191,36,0.15)';}}
                        onBlur={e=>{e.currentTarget.style.border='1.5px solid rgba(251,191,36,0.35)';e.currentTarget.style.boxShadow='inset 0 1px 3px rgba(180,120,0,0.06)';}}
                      />
                      <p className="text-[10px] text-amber-400 mt-1 pl-1">Get this code from your jeweller shop owner.</p>
                    </div>
                  )}
                  <GoldButton loading={false}>Continue →</GoldButton>
                </form>
              )}

              {signupStep === 2 && (
                <form onSubmit={goStep3} className="space-y-4">
                  {form.role === 'CUSTOMER' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">State *</label>
                        <select
                          value={form.state}
                          onChange={e => setForm(f => ({ ...f, state: e.target.value, city: '' }))}
                          required
                          className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none appearance-none"
                          style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}>
                          <option value="">Select state</option>
                          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">City *</label>
                        <select
                          value={form.city}
                          onChange={setF('city')}
                          required
                          disabled={!form.state}
                          className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none appearance-none disabled:opacity-50"
                          style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}>
                          <option value="">{form.state ? 'Select city' : 'Select state first'}</option>
                          {(CITIES_BY_STATE[form.state] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                          {form.state && <option value="Other">Other (not listed)</option>}
                        </select>
                      </div>
                      <GoldInput label="Country" value={form.country} onChange={setF('country')} required />
                      <GoldInput label="Date of Birth" type="date" value={form.dateOfBirth} onChange={setF('dateOfBirth')} required />
                    </>
                  ) : (
                    <>
                      <GoldInput label="Business Address *" value={form.businessAddress} onChange={setF('businessAddress')} required placeholder="Shop/office full address" />
                      <GoldInput label="Business Pincode *" value={form.businessPincode} onChange={setF('businessPincode')} required placeholder="6 digit pincode" maxLength={6} />
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">{form.role==='CUSTOMER'?'Investment Goal':'Business Type'}</label>
                    <select value={form.role==='CUSTOMER'?form.investmentGoal:form.businessType} onChange={setF(form.role==='CUSTOMER'?'investmentGoal':'businessType')}
                      className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none appearance-none"
                      style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}>
                      {form.role==='CUSTOMER' ? (
                        <>
                          <option value="">Select goal (optional)</option>
                          <option value="Wealth Building">Wealth Building</option>
                          <option value="Gift/Wedding">Gift / Wedding</option>
                          <option value="SIP/Recurring">SIP / Recurring</option>
                          <option value="Emergency Fund">Emergency Fund</option>
                          <option value="Short Term Savings">Short Term Savings</option>
                        </>
                      ) : (
                        <>
                          <option value="">Select type (optional)</option>
                          <option value="Retailer">Retailer</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Wholesaler">Wholesaler</option>
                          <option value="Multi-branch">Multi-branch</option>
                        </>
                      )}
                    </select>
                  </div>
                  <GoldInput label="Referral Code (optional)" value={form.referralCode} onChange={setF('referralCode')} placeholder="Enter referral code if you have one" />
                  <div className="flex gap-3">
                    <BackButton onClick={()=>setSignupStep(1)} />
                    <GoldButton loading={false} className="flex-1">Continue →</GoldButton>
                  </div>
                </form>
              )}

              {signupStep === 3 && (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="rounded-2xl px-4 py-3 text-xs text-amber-700" style={{ background:'rgba(254,252,232,0.9)',border:'1px solid rgba(251,191,36,0.3)' }}>
                    {form.role==='OWNER'
                      ? 'Shop owner compliance: Aadhaar, PAN, Hallmark license and GST are compulsory. Please also email these documents to support after signup.'
                      : 'PAN & Aadhaar are optional but required for gold purchases above ₹50,000 per RBI regulations. Data is encrypted.'}
                  </div>
                  {form.role === 'OWNER' ? (
                    <>
                      <GoldInput label="PAN Number *" value={form.panNumber} onChange={setF('panNumber')} placeholder="ABCDE1234F" maxLength={10} required />
                      <GoldInput label="Aadhaar Number *" value={form.aadhaarNumber} onChange={setF('aadhaarNumber')} placeholder="12 digit Aadhaar" maxLength={12} required />
                      <GoldInput label="Hallmark License Number *" value={form.hallmarkLicenseNumber} onChange={setF('hallmarkLicenseNumber')} placeholder="Enter hallmark license" required />
                      <GoldInput label="GST Number *" value={form.gstNumber} onChange={setF('gstNumber')} placeholder="27AABCU9603R1ZM" maxLength={15} required />
                      <div className="rounded-xl px-3 py-2 text-[11px] text-amber-700" style={{ background:'rgba(253,243,212,0.7)',border:'1px solid rgba(251,191,36,0.25)' }}>
                        Please mail the same documents (Aadhaar, PAN, Hallmark, GST) to contact@bizmation.in for verification.
                      </div>
                    </>
                  ) : (
                    <>
                      <GoldInput label="PAN Number (optional)" value={form.panNumber} onChange={setF('panNumber')} placeholder="ABCDE1234F" maxLength={10} />
                      <GoldInput label="Aadhaar Last 4 Digits (optional)" value={form.aadhaarLast4} onChange={setF('aadhaarLast4')} placeholder="e.g. 6789" maxLength={4} />
                    </>
                  )}
                  <p className="text-[11px] text-stone-400 leading-relaxed px-1">By creating an account you agree to our Terms of Service and Privacy Policy. Data stored securely for KYC and tax compliance (India).</p>
                  <div className="flex gap-3">
                    <BackButton onClick={()=>setSignupStep(2)} />
                    <GoldButton loading={loading} className="flex-1">Create Account</GoldButton>
                  </div>
                  {signupProgress.length > 0 && (
                    <SignupProgressPanel steps={signupProgress} onDismiss={() => setSignupProgress([])} />
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-7 text-xs text-amber-500/70 text-center">Secured by Firebase Auth · TLS 1.3 · 256-bit encrypted</p>
    </div>
  );
};

interface GoldInputProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
const GoldInput: React.FC<GoldInputProps> = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-amber-800 mb-1.5 tracking-wide">{label}</label>
    <input {...props} className="w-full px-4 py-2.5 rounded-2xl text-sm text-stone-800 transition-all focus:outline-none"
      style={{ background:'rgba(255,251,240,0.9)',border:'1.5px solid rgba(251,191,36,0.35)',boxShadow:'inset 0 1px 3px rgba(180,120,0,0.06)' }}
      onFocus={e=>{ e.currentTarget.style.border='1.5px solid rgba(245,158,11,0.7)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(251,191,36,0.15)'; }}
      onBlur={e=>{ e.currentTarget.style.border='1.5px solid rgba(251,191,36,0.35)'; e.currentTarget.style.boxShadow='inset 0 1px 3px rgba(180,120,0,0.06)'; }} />
  </div>
);

const GoldButton: React.FC<{ loading: boolean; children: React.ReactNode; className?: string; onClick?: () => void }> = ({ loading, children, className='w-full', onClick }) => (
  <button type={onClick?'button':'submit'} disabled={loading} onClick={onClick}
    className={`${className} py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed animate-shimmer`}
    style={{ background:'linear-gradient(90deg,#fde68a 0%,#f59e0b 30%,#fbbf24 60%,#f59e0b 100%)',backgroundSize:'200% auto',boxShadow:'0 4px 16px rgba(245,158,11,0.35)',color:'#451a03' }}>
    {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Please wait...</span> : children}
  </button>
);

const BackButton: React.FC<{ onClick:()=>void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all hover:bg-amber-100 active:scale-[0.97]"
    style={{ background:'rgba(253,243,212,0.8)',border:'1px solid rgba(251,191,36,0.4)',color:'#92400e' }}>← Back</button>
);

// ── Signup progress panel ────────────────────────────────────────────────────
const SignupProgressPanel: React.FC<{ steps: ProgressStep[]; onDismiss: () => void }> = ({ steps, onDismiss }) => {
  const hasError = steps.some(s => s.status === 'error');
  return (
    <div className="rounded-2xl p-4 space-y-2.5" style={{ background:'rgba(253,243,212,0.6)',border:'1px solid rgba(251,191,36,0.25)' }}>
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Account Setup Progress</p>
      {steps.map(step => (
        <div key={step.id} className="flex items-start gap-2.5">
          <div className="flex-shrink-0 mt-0.5 w-4 h-4">
            {step.status === 'pending' && (
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor:'rgba(251,191,36,0.3)' }} />
            )}
            {step.status === 'running' && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color:'#f59e0b' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {step.status === 'done' && (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="#16a34a">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {step.status === 'error' && (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="#dc2626">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium leading-tight ${
              step.status === 'error'   ? 'text-red-700' :
              step.status === 'done'    ? 'text-green-700' :
              step.status === 'running' ? 'text-amber-800' :
              'text-amber-400'
            }`}>{step.label}</p>
            {step.detail && step.status === 'error' && (
              <p className="text-[9px] text-red-500 mt-0.5 break-words leading-snug">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
      {hasError && (
        <button type="button" onClick={onDismiss}
          className="mt-1 w-full text-[10px] text-amber-500 hover:text-amber-700 underline underline-offset-2 transition-colors text-center">
          Dismiss and try again
        </button>
      )}
    </div>
  );
};

const friendlyError = (code: string): string => {
  const map: Record<string, string> = {
    'auth/user-not-found':         'No account found with this email. Please sign up.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Incorrect email or password. Please check and try again.',
    'auth/email-already-in-use':   'This email is already registered. Please sign in.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please wait a few minutes.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-action-code':    'Magic link is invalid or expired. Request a new one.',
    'auth/email-not-verified':     '📧 Email not verified. Please click the verification link in your inbox.',
    'EMAIL_NOT_VERIFIED':          '📧 Email not verified. Please click the verification link in your inbox.',
    'permission-denied':           'Database permission denied — please try again in a moment.',
  };
  if (map[code]) return map[code];
  if (code?.includes('permission-denied') || code?.includes('Missing or insufficient permissions')) {
    return 'Database permission denied — please try again. If it keeps failing, contact support.';
  }
  return code;
};

export default AuthPage;
