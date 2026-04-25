import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { getStore } from '../store';
import { auth, db } from '../firebaseConfig';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError } from '../lib/firebaseErrors';
import { logger } from '../lib/logger';
import { Apple, Mail, Phone, ArrowRight, Home, Users, UserCheck, Smartphone, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Logo } from '../App';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
// Unused states for email/password auth
  // const [email, setEmail] = useState('');
  // const [name, setName] = useState('');
  // const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TENANT);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('Email/Password auth is not configured. Please use Google Auth below.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('Email/Password auth is not configured. Please use Google Auth below.');
  };

  const signInWithGoogle = async () => {
    setError('');

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
    // Filter out attempts older than the window
    attempts = attempts.filter(time => now - time < WINDOW_MS);

    if (attempts.length >= MAX_ATTEMPTS) {
      const oldestAttempt = attempts[0];
      const timeRemainingMs = WINDOW_MS - (now - oldestAttempt);
      const minutesRemaining = Math.ceil(timeRemainingMs / 60000);
      setError(`Rate limit exceeded. Please try again in ${minutesRemaining} minutes.`);
      return;
    }

    // Record the attempt
    attempts.push(now);
    localStorage.setItem(RATELIMIT_KEY, JSON.stringify(attempts));

    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      let currentUserProfile: User;
      
      if (userSnap.exists()) {
        currentUserProfile = userSnap.data() as User;
        logger.action('user_login', { userId: currentUserProfile.id, email: currentUserProfile.email, role: currentUserProfile.role });
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
          logger.action('user_registered', { userId: currentUserProfile.id, email: currentUserProfile.email, role: currentUserProfile.role });
        } catch (e: any) {
           handleFirestoreError(e, 'create', '/users/' + result.user.uid, result.user);
        }
      }
      
      onLogin(currentUserProfile);
    } catch (err: any) {
      logger.error('Google Authentication failed', err);
      setError(err.message || 'Google Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-black overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none select-none overflow-hidden flex flex-wrap items-center justify-center gap-12 rotate-12">
        {Array.from({length: 40}).map((_, i) => (
          <span key={i} className="text-9xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">Spaceya</span>
        ))}
      </div>

      <div className="max-w-md w-full relative z-10 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-8">
            <Logo size={80} className="text-zinc-900 dark:text-white" />
          </div>
          <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-[-0.05em] uppercase">Executive Access</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-400">Identity Provisioning Layer</p>
        </div>

        <div className="space-y-10">
          {error && (
            <div className="bg-rose-50 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-6 rounded-[2rem] text-[9px] font-black uppercase tracking-widest flex items-center gap-4 animate-in shake">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          <div className="space-y-6">
            <button 
              disabled={isLoading} 
              onClick={signInWithGoogle} 
              className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:opacity-80 transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
            >
              <GoogleIcon /> {isLoading ? 'Verifying Protocol...' : 'Verify Identity via Google'}
            </button>

            <div className="flex items-center gap-4 text-zinc-300 dark:text-zinc-800">
               <div className="flex-1 h-px bg-current"></div>
               <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Tier Selection</span>
               <div className="flex-1 h-px bg-current"></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setRole(UserRole.TENANT)}
                 className={`py-5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all ${role === UserRole.TENANT ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white opacity-40'}`}
               >
                 Tenant Entry
               </button>
               <button 
                 onClick={() => setRole(UserRole.AGENT)}
                 className={`py-5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all ${role === UserRole.AGENT ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white opacity-40'}`}
               >
                 Agent Gateway
               </button>
            </div>
          </div>
        </div>

        <footer className="pt-12 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-400 opacity-40">Secured via Quantum Infrastructure</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;