'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername || !formData.password) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid username or password');
        setIsSubmitting(false);
        return;
      }

      // Successful login -> navigate to dashboard
      window.location.href = '/';
    } catch {
      setErrorMessage('An unexpected connection error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {errorMessage && (
          <div
            className="flex items-center gap-2.5 p-3 mb-5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Username / Email Field */}
          <div className="flex items-center gap-3 border-b border-[#292929] pb-2.5 focus-within:border-[#C8A96B] transition-colors">
            <User className="w-4 h-4 text-[#C8A96B] shrink-0" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={formData.username}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, username: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Email or Username"
              disabled={isSubmitting}
              className="w-full bg-transparent text-sm text-[#F5F1E8] placeholder-[#666] outline-none disabled:opacity-50 tracking-wide"
            />
          </div>

          {/* Password Field */}
          <div className="flex items-center gap-3 border-b border-[#292929] pb-2.5 focus-within:border-[#C8A96B] transition-colors">
            <Lock className="w-4 h-4 text-[#C8A96B] shrink-0" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, password: e.target.value }));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Password"
              disabled={isSubmitting}
              className="w-full bg-transparent text-sm text-[#F5F1E8] placeholder-[#666] outline-none disabled:opacity-50 tracking-wide"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-[#929292] hover:text-[#F5F1E8] transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Actions Row: Forgot Password & LOGIN Button */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => alert('Please contact your administrator or register a new workspace account.')}
              className="text-xs font-semibold text-[#C8A96B] hover:text-[#e0c487] transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#C8A96B] hover:bg-[#d8bc7f] active:bg-[#b89859] text-[#0B0D0F] px-9 py-2.5 rounded-full font-extrabold text-xs tracking-[0.2em] uppercase shadow-md shadow-[#C8A96B]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </AuthLayout>
  );
}