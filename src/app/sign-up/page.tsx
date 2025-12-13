'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const router = useRouter();
  const [data, setData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json(); // সার্ভার থেকে JSON রেসপন্স নেওয়া

      if (res.ok) {
          // সফল হলে লগইন পেজে রিডাইরেক্ট
          window.location.href = '/log-in';
      } else {
          // সার্ভার থেকে আসা সঠিক এরর মেসেজ দেখানো
          setError(responseData.message || 'Registration failed. Please try again.');
          setLoading(false);
      }
    } catch (err) {
      setError('Network error. Check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 font-sans">
      <div className="w-full max-w-md bg-[#121212] p-8 rounded-2xl border border-brand-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-gold mb-2 tracking-wide uppercase">Create Account</h1>
          <p className="text-gray-400 text-sm">Join us for premium rides</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={registerUser} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-black border border-gray-800 rounded-xl p-3.5 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all placeholder-gray-700"
              placeholder="John Doe"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-black border border-gray-800 rounded-xl p-3.5 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all placeholder-gray-700"
              placeholder="name@example.com"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-black border border-gray-800 rounded-xl p-3.5 text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all placeholder-gray-700"
              placeholder="••••••••"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-gold hover:bg-yellow-600 text-black font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide shadow-lg shadow-brand-gold/20 mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800 pt-6">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <Link href="/log-in" className="text-brand-gold hover:text-white font-semibold transition-colors ml-1">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}