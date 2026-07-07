'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Target,
  Repeat,
  Timer,
  TrendingUp,
  Trophy,
  Settings,
  Menu,
  X,
  Flame,
  Star,
  Zap,
  Briefcase,
  BookOpen,
  Dumbbell,
  Wallet,
  Heart,
  Lightbulb,
  ChevronLeft,
  Clock,
  Map,
  LineChart,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';

import { QuickCapture } from './quick-capture';
import { AssistantChat } from './assistant-chat';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily', label: 'Today', icon: Calendar },
  { href: '/timetable', label: 'Timetable', icon: Clock },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/habits', label: 'Habits', icon: Repeat },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
];

const areaIcons: Record<string, React.ElementType> = {
  career: Briefcase,
  learning: BookOpen,
  fitness: Dumbbell,
  finance: Wallet,
  relationships: Heart,
  'personal-projects': Lightbulb,
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: user } = useAuth();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border transition-transform duration-300 hidden lg:block",
        !sidebarOpen && "-translate-x-full"
      )}>
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Menu Overlay */}
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
              className="p-2 rounded-lg hover:bg-accent"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg">FlowState</span>
            <div className="w-9" /> {/* Spacer for balance */}
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
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

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-md border-t border-border lg:hidden pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
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
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">FlowState</h1>
            <p className="text-xs text-muted-foreground">Goals into Actions</p>
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
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
