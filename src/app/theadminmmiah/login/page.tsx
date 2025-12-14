'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminLogin() {
  const router = useRouter();
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  
  const handlePreLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast.success("Verification code sent to your email");
        setStep(2); 
      } else {
        const data = await res.json();
        toast.error(data.message || "Access Denied");
      }
    } catch (err) {
      toast.error("Server Error");
    } finally {
      setLoading(false);
    }
  };

  
  const handleFinalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password: "dummy_password", 
      otp, 
      redirect: false,
    });

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Access Granted");
      router.push('/theadminmmiah');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-[#0a0a0a] border border-brand-gold/30 p-8 rounded-lg shadow-[0_0_50px_rgba(212,175,55,0.1)]">
        <h1 className="text-2xl font-bold text-center text-brand-gold mb-8 uppercase tracking-widest">
            {step === 1 ? "Admin Access" : "Security Check"}
        </h1>

        {step === 1 ? (
          <form onSubmit={handlePreLogin} className="space-y-6">
            <div>
                <label className="block text-gray-500 text-xs mb-2 tracking-wider">IDENTIFICATION</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white p-3 rounded focus:border-brand-gold outline-none transition"
                    placeholder="admin@fare1.co.uk"
                    required
                />
            </div>
            <div>
                <label className="block text-gray-500 text-xs mb-2 tracking-wider">PASSPHRASE</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white p-3 rounded focus:border-brand-gold outline-none transition"
                    placeholder="••••••••••••"
                    required
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-gold text-black font-bold py-3 rounded hover:bg-yellow-600 transition uppercase tracking-wide"
            >
                {loading ? "Verifying..." : "REQUEST ACCESS"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFinalLogin} className="space-y-6">
            <div className="text-center mb-4 bg-gray-900 p-4 rounded border border-gray-800">
                <p className="text-gray-400 text-xs">Code sent to:</p>
                <p className="text-white font-bold text-sm mt-1">{email}</p>
            </div>
            <div>
                <label className="block text-gray-500 text-xs mb-2 tracking-wider text-center">ENTER VERIFICATION CODE</label>
                <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-black border border-brand-gold text-center text-3xl text-white p-3 rounded outline-none tracking-[10px] font-bold"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                />
            </div>
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700 transition uppercase tracking-wide"
            >
                {loading ? "Checking..." : "VERIFY & LOGIN"}
            </button>
            <button 
                type="button" 
                onClick={() => setStep(1)}
                className="w-full text-gray-500 text-xs hover:text-white mt-4 underline"
            >
                Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}