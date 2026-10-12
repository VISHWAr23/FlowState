'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Timer,
  TrendingUp,
  Clock,
  Target,
  Repeat,
  Settings,
  Menu,
  X,
  Zap,
  ChevronLeft,
  MoreHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';
import { QuickCapture } from './quick-capture';
import { AssistantChat } from './assistant-chat';

const primaryNavItems = [
  { href: '/', label: 'Today', icon: Calendar },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/analytics', label: 'Review', icon: TrendingUp },
];

const secondaryNavItems = [
  { href: '/timetable', label: 'Timetable', icon: Clock },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/habits', label: 'Habits', icon: Repeat },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { data: user } = useAuth();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-300 hidden lg:block",
        !sidebarOpen && "-translate-x-full"
      )}>
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border lg:hidden"
            >
              <SidebarContent user={user} onNavigate={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 lg:ml-64",
        !sidebarOpen && "lg:ml-0"
      )}>
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border lg:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-base tracking-tight">FlowState</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Floating Toggle Button (Desktop only, when sidebar is closed) */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex fixed left-4 top-4 z-40 p-2.5 bg-card border border-border shadow-md rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-300 cursor-pointer"
          title="Expand Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Bottom Sheet for More Options */}
      <AnimatePresence>
        {mobileMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-16 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-4 lg:hidden shadow-xl"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Planning & Routines</p>
              <div className="grid grid-cols-2 gap-2">
                {secondaryNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border bg-background hover:bg-accent text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 text-primary" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border lg:hidden pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {primaryNavItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' || pathname === '/daily' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-colors",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className="text-[11px]">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={cn(
              "flex flex-col items-center gap-1 py-1.5 px-3 rounded-lg transition-colors",
              mobileMoreOpen ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px]">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile padding for bottom nav */}
      <div className="h-16 lg:hidden" />

      {/* Quick Capture Floating Action Button */}
      <QuickCapture />
      
      {/* AI Assistant Chat Widget */}
      <AssistantChat />
    </div>
  );
}

function SidebarContent({ user, onNavigate }: { user?: any; onNavigate?: () => void }) {
  const pathname = usePathname();
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">FlowState</h1>
            <p className="text-xs text-muted-foreground">Focus · Execute · Review</p>
          </div>
        </Link>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Primary Daily Execution */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Daily Execution
          </p>
          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' || pathname === '/daily' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Secondary Planning & Routines */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Planning & Routines
          </p>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{user.full_name || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">Level {user.level || 1} · {user.xp || 0} XP</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
