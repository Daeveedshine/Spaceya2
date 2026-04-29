import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { auth, db } from '../firebaseConfig';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError } from '../lib/firebaseErrors';
import { logger } from '../lib/logger';
import { 
  Mail, UserCheck, 
  Lock, AlertCircle, Eye, EyeOff, Loader2 
} from 'lucide-react';
import { Logo } from '../App';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="grayscale contrast-200">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
  </svg>
);

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [useEmail, setUseEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.TENANT);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset link sent to your inbox! Once you have updated your password, you can login with your new credentials.');
    } catch (err: any) {
      console.error('Password reset failed', err);
      if (err.code === 'auth/user-not-found') {
        setError('This email identity was not found in our registry.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The provided email format is invalid.');
      } else {
        setError('Failed to initiate reset protocol. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!email || !password || (isRegistering && !name)) {
      setError('Please fill in all protocol sequences.');
      return;
    }

    if (password.length < 6) {
      setError('Security key must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      let userCredential;
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const { user } = userCredential;
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err: any) {
        handleFirestoreError(err, 'get', `/users/${user.uid}`, user);
      }
      
      let currentUserProfile: User;
      
      if (userSnap && userSnap.exists()) {
        currentUserProfile = userSnap.data() as User;
      } else {
        currentUserProfile = {
          id: user.uid,
          name: name || user.displayName || 'New User',
          email: user.email || '',
          role: role,
          phone: '',
          profilePictureUrl: '',
          walletBalance: role === UserRole.AGENT ? 5000 : 0,
          assignedPropertyIds: []
        };
        try {
          await setDoc(userRef, currentUserProfile);
        } catch (err: any) {
          handleFirestoreError(err, 'create', `/users/${user.uid}`, user);
        }
      }
      
      onLogin(currentUserProfile);
    } catch (err: any) {
      console.error('Manual Authentication failed', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This identity is already registered. Try logging in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid security credentials provided. Please check your email and password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Account temporarily locked due to too many failed attempts. Please try again later or reset your password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Security key sequence is too weak.');
      } else if (err.code === 'auth/operation-not-allowed') {
        const projectId = (auth as any).app?.options?.projectId || 'unknown';
        setError(`Manual registration is not enabled in the Firebase console for project "${projectId}". Please enable Email/Password authentication in the Auth section of the console.`);
      } else {
        setError(err.message || 'Authentication protocol failure.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setSuccessMessage('');

    // Rate Limiting Logic (Client-Side implementation)
    const RATELIMIT_KEY = 'spaceya_login_attempts';
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    
    let attempts: number[] = [];
    try {
      const storedAttempts = localStorage.getItem(RATELIMIT_KEY);
      if (storedAttempts) {
        attempts = JSON.parse(storedAttempts);
      }
    } catch(e) {}

    const now = Date.now();
    attempts = attempts.filter(time => now - time < WINDOW_MS);

    if (attempts.length >= MAX_ATTEMPTS) {
      const oldestAttempt = attempts[0];
      const timeRemainingMs = WINDOW_MS - (now - oldestAttempt);
      const minutesRemaining = Math.ceil(timeRemainingMs / 60000);
      setError(`Rate limit exceeded. Try again in ${minutesRemaining} minutes.`);
      return;
    }

    attempts.push(now);
    localStorage.setItem(RATELIMIT_KEY, JSON.stringify(attempts));

    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err: any) {
        handleFirestoreError(err, 'get', `/users/${result.user.uid}`, result.user);
      }
      
      let currentUserProfile: User;
      
      if (userSnap && userSnap.exists()) {
        currentUserProfile = userSnap.data() as User;
      } else {
        currentUserProfile = {
          id: result.user.uid,
          name: result.user.displayName || 'New User',
          email: result.user.email || '',
          role: role,
          phone: result.user.phoneNumber || '',
          profilePictureUrl: result.user.photoURL || '',
          walletBalance: role === UserRole.AGENT ? 5000 : 0,
          assignedPropertyIds: []
        };
        try {
          await setDoc(userRef, currentUserProfile);
        } catch (err: any) {
          handleFirestoreError(err, 'create', `/users/${result.user.uid}`, result.user);
        }
      }
      
      onLogin(currentUserProfile);
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden font-sans">
      {/* Background Grid - Matching user provided photo */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Vignette effect for depth */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Scrollable Content Layer */}
      <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden scroll-smooth flex flex-col">
        <div className="w-full flex-grow flex flex-col items-center p-6 py-20 md:py-32">
          <div className="max-w-4xl w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-8">
                <Logo size={80} className="text-white" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.05em] uppercase break-words">
                SPACEYA
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-400">
                Your Space, Handled.
              </p>
            </div>

            {error && (
              <div 
                id="manual-auth-error"
                className="max-w-md mx-auto bg-zinc-950 dark:bg-white text-white dark:text-black p-5 rounded-2xl text-[10px] font-bold uppercase tracking-wider leading-relaxed flex items-start gap-4 animate-in shake"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" /> 
                <span className="flex-1">{error}</span>
              </div>
            )}

            {successMessage && (
              <div 
                className="max-w-md mx-auto bg-green-500 text-white p-5 rounded-2xl text-[10px] font-bold uppercase tracking-wider leading-relaxed flex items-start gap-4 animate-in fade-in zoom-in"
              >
                <UserCheck size={20} className="shrink-0 mt-0.5" /> 
                <span className="flex-1">{successMessage}</span>
              </div>
            )}

            <div className="max-w-md mx-auto space-y-6 w-full">
              <div className="flex items-center gap-4 text-zinc-400 dark:text-zinc-800">
                 <div className="flex-1 h-px bg-current"></div>
                 <span className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap text-white">SIGNUP/LOGIN AS</span>
                 <div className="flex-1 h-px bg-current"></div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setRole(UserRole.TENANT)}
                    className={`py-5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all border-2 ${role === UserRole.TENANT ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                  >
                    Tenant
                  </button>
                  <button 
                    onClick={() => setRole(UserRole.AGENT)}
                    className={`py-5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all border-2 ${role === UserRole.AGENT ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-500'}`}
                  >
                    Agent
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Social Auth Card */}
              <div className="space-y-3 bg-white dark:bg-zinc-950 p-6 md:p-6 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.4)] border border-zinc-100 dark:border-zinc-900 flex flex-col">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Social Verification</h3>
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500">Fast-Track Authorization</p>
                </div>
                
                <div className="flex items-center justify-center py-2">
                  <button 
                    disabled={isLoading} 
                    onClick={signInWithGoogle} 
                    className="w-full py-5 sm:py-5 px-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-3 sm:gap-6 hover:opacity-80 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
                  >
                    <GoogleIcon /> {isLoading ? 'Verifying...' : 'Authorize via Google'}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[7px] font-black uppercase tracking-widest text-zinc-400">Zero-Knowledge Proof Enabled</p>
                </div>
              </div>

              {/* Manual Auth Card */}
              <div className="space-y-3 bg-white dark:bg-zinc-950 p-6 md:p-6 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_48px_80px_-16px_rgba(0,0,0,0.4)] border border-zinc-100 dark:border-zinc-900">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Manual Credentials</h3>
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500">Traditional Protocol Entry</p>
                </div>

                <form onSubmit={handleManualAuth} className="space-y-3">
                  {isRegistering && (
                    <div className="relative">
                      <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="FULL NAME"
                        className="w-full pl-14 pr-6 py-4 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-black dark:text-white"
                      />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="EMAIL ADDRESS"
                      className="w-full pl-14 pr-6 py-4 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-black dark:text-white"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-14 pr-16 py-4 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-3xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-black dark:text-white"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {!isRegistering && (
                    <div className="flex justify-end pr-2">
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                      >
                        Reset Password?
                      </button>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:opacity-80 transition-all active:scale-95 disabled:opacity-50 shadow-xl"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : isRegistering ? 'Register' : 'Login'}
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-white hover:text-red-500 transition-colors"
                    >
                      {isRegistering ? 'Already have an account? Login here.' : "Don't have an Account? Register Here."}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <footer className="pt-12 text-center pb-12">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-500">Secured via Quantum Infrastructure</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
