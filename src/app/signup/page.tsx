'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, AtSign, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors: typeof fieldErrors = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required';
    }

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername) {
      errors.username = 'Username is required';
    } else if (trimmedUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (trimmedUsername.length > 30) {
      errors.username = 'Username must be at most 30 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      errors.username = 'Only letters, numbers, and underscores allowed';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Minimum 8 characters';
    } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Must include letters & numbers';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          setFieldErrors({
            name: data.fieldErrors.name?.[0],
            username: data.fieldErrors.username?.[0],
            password: data.fieldErrors.password?.[0],
            confirmPassword: data.fieldErrors.confirmPassword?.[0],
            form: data.error,
          });
        } else {
          setFieldErrors({ form: data.error || 'Failed to create account.' });
        }
        setIsSubmitting(false);
        return;
      }

      // Successful signup with auto-login -> navigate to dashboard
      window.location.href = '/';
    } catch {
      setFieldErrors({ form: 'An unexpected connection error occurred. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout mode="signup">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {fieldErrors.form && (
          <div
            className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fieldErrors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <div className="flex items-center gap-3 border-b border-[#292929] pb-2 focus-within:border-[#C8A96B] transition-colors">
              <User className="w-4 h-4 text-[#C8A96B] shrink-0" />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Full Name"
                disabled={isSubmitting}
                className="w-full bg-transparent text-sm text-[#F5F1E8] placeholder-[#666] outline-none disabled:opacity-50 tracking-wide"
              />
            </div>
            {fieldErrors.name && <p className="text-[11px] text-destructive mt-1">{fieldErrors.name}</p>}
          </div>

          {/* Username */}
          <div>
            <div className="flex items-center gap-3 border-b border-[#292929] pb-2 focus-within:border-[#C8A96B] transition-colors">
              <AtSign className="w-4 h-4 text-[#C8A96B] shrink-0" />
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
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }}
                placeholder="Username"
                disabled={isSubmitting}
                className="w-full bg-transparent text-sm text-[#F5F1E8] placeholder-[#666] outline-none disabled:opacity-50 tracking-wide"
              />
            </div>
            {fieldErrors.username && <p className="text-[11px] text-destructive mt-1">{fieldErrors.username}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center gap-3 border-b border-[#292929] pb-2 focus-within:border-[#C8A96B] transition-colors">
              <Lock className="w-4 h-4 text-[#C8A96B] shrink-0" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, password: e.target.value }));
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Password (8+ chars)"
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
            {fieldErrors.password && <p className="text-[11px] text-destructive mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="flex items-center gap-3 border-b border-[#292929] pb-2 focus-within:border-[#C8A96B] transition-colors">
              <Lock className="w-4 h-4 text-[#C8A96B] shrink-0" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Confirm Password"
                disabled={isSubmitting}
                className="w-full bg-transparent text-sm text-[#F5F1E8] placeholder-[#666] outline-none disabled:opacity-50 tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="text-[#929292] hover:text-[#F5F1E8] transition-colors p-1"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-destructive mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Action Row: SIGN UP Button */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#C8A96B] hover:bg-[#d8bc7f] active:bg-[#b89859] text-[#0B0D0F] px-9 py-2.5 rounded-full font-extrabold text-xs tracking-[0.2em] uppercase shadow-md shadow-[#C8A96B]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                'SIGN UP'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </AuthLayout>
  );
}