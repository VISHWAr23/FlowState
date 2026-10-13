'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface AuthLayoutProps {
  mode: 'login' | 'signup';
  children: React.ReactNode;
}

export function AuthLayout({ mode, children }: AuthLayoutProps) {
  const router = useRouter();

  const handleTabChange = (targetMode: 'login' | 'signup') => {
    if (targetMode === mode) return;
    router.push(targetMode === 'login' ? '/login' : '/signup', { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center p-4 sm:p-6 md:p-8 font-montserrat">
      {/* Main Card */}
      <div className="w-full max-w-[680px] bg-[#151719] border border-[#292929] rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col md:flex-row min-h-[480px]">
        
        {/* Left Layered Ribbon Panel */}
        <div className="relative w-full md:w-[38%] min-h-[140px] md:min-h-[480px] overflow-hidden flex flex-col justify-center">
          {/* Layered Diagonal Ribbons SVG in FlowState Metallic Palette */}
          <svg
            className="absolute inset-0 w-full h-full object-cover"
            viewBox="0 0 320 540"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="gold-shadow-deep" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="-3" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.55" />
              </filter>
              <filter id="gold-shadow-mid" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="-2" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* Base dark obsidian layer */}
            <rect width="320" height="540" fill="#101214" />

            {/* Diagonal Ribbon 1 - Deep charcoal fold */}
            <polygon points="0,0 150,0 0,210" fill="#1A1D21" filter="url(#gold-shadow-deep)" />

            {/* Diagonal Ribbon 2 - Dark bronze band */}
            <polygon points="0,50 250,0 0,360" fill="#2E281D" filter="url(#gold-shadow-deep)" />

            {/* Diagonal Ribbon 3 - Antique gold band */}
            <polygon points="0,150 320,0 320,90 0,490" fill="#524222" filter="url(#gold-shadow-deep)" />

            {/* Diagonal Ribbon 4 - Warm bronze gold */}
            <polygon points="0,260 320,60 320,210 0,540" fill="#7D6535" filter="url(#gold-shadow-mid)" />

            {/* Diagonal Ribbon 5 - Rich champagne gold chevron */}
            <polygon points="0,370 320,190 320,360 0,540" fill="#A88B4C" filter="url(#gold-shadow-mid)" />

            {/* Diagonal Ribbon 6 - FlowState Champagne Gold highlight */}
            <polygon points="0,470 320,340 320,500 0,540" fill="#C8A96B" />
          </svg>

          {/* Desktop Tab Toggle Container with Smooth Fillet Curve Finish */}
          <div className="relative z-10 hidden md:flex flex-col items-end pr-0 select-none">
            {/* Tab Track */}
            <div className="relative w-[130px] flex flex-col gap-5">
              
              {/* Sliding Fillet Indicator SVG */}
              <motion.div
                className="absolute right-0 pointer-events-none"
                style={{ width: 120, height: 78 }}
                animate={{
                  top: mode === 'login' ? -16 : 50,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 30,
                }}
              >
                {/* SVG Concave Curve Fillet & Rounded Pill Tab */}
                <svg width="120" height="78" viewBox="0 0 120 78" fill="none">
                  <path
                    d="M 120,0 Q 120,16 104,16 L 23,16 A 23,23 0 0 0 23,62 L 104,62 Q 120,62 120,78 Z"
                    fill="#151719"
                  />
                </svg>
              </motion.div>

              {/* LOGIN Tab Button */}
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                className={`relative z-20 w-full h-[46px] flex items-center pl-7 text-left transition-colors duration-200 cursor-pointer ${
                  mode === 'login'
                    ? 'text-[#C8A96B] font-extrabold'
                    : 'text-[#929292] hover:text-[#F5F1E8] font-bold'
                }`}
              >
                <span className="text-xs tracking-[0.2em] uppercase leading-none">
                  LOGIN
                </span>
              </button>

              {/* SIGN UP Tab Button */}
              <button
                type="button"
                onClick={() => handleTabChange('signup')}
                className={`relative z-20 w-full h-[46px] flex items-center pl-7 text-left transition-colors duration-200 cursor-pointer ${
                  mode === 'signup'
                    ? 'text-[#C8A96B] font-extrabold'
                    : 'text-[#929292] hover:text-[#F5F1E8] font-bold'
                }`}
              >
                <span className="text-xs tracking-[0.2em] uppercase leading-none">
                  SIGN UP
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Tab Toggle */}
          <div className="relative z-10 flex md:hidden justify-center items-center gap-3 py-4 px-6 select-none">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`px-5 py-2 rounded-full text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#C8A96B] text-[#0B0D0F] shadow-md'
                  : 'text-[#929292] hover:text-[#F5F1E8]'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`px-5 py-2 rounded-full text-xs font-extrabold tracking-wider transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#C8A96B] text-[#0B0D0F] shadow-md'
                  : 'text-[#929292] hover:text-[#F5F1E8]'
              }`}
            >
              SIGN UP
            </button>
          </div>
        </div>

        {/* Right FlowState Surface Card Panel */}
        <div className="flex-1 bg-[#151719] px-6 sm:px-9 md:px-10 py-7 sm:py-9 flex flex-col justify-center">
          {/* Top Logo & Title */}
          <div className="flex flex-col items-center text-center mb-5">
            <Link
              href="/"
              className="inline-block transition-transform hover:scale-105 focus:outline-none focus:ring-1 focus:ring-[#C8A96B] rounded-xl p-1"
            >
              <img
                src="/brand/flowstate-logo.png"
                alt="FlowState"
                className="h-14 sm:h-16 w-auto max-h-16 object-contain mx-auto drop-shadow-md"
              />
            </Link>

            <h1 className="text-base sm:text-lg font-extrabold tracking-[0.25em] text-[#F5F1E8] mt-2 uppercase">
              {mode === 'login' ? 'LOGIN' : 'SIGN UP'}
            </h1>
          </div>

          {/* Form Content with Smooth Transitions */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
