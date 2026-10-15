'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Clock,
  Globe,
  User,
  Palette,
  Save,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { supabaseBrowser } from '@/lib/supabase';
import { useAuth, useLogout, useUpdateProfile } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function SettingsView({ defaultTab }: { defaultTab?: string }) {
  const { data: user } = useAuth();
  const storeUser = useAppStore((state) => state.user);
  const activeUser = user || storeUser;
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  // Determine initial tab: prop -> URL query param -> 'profile' default
  const [activeSection, setActiveSection] = useState(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (paramTab) return paramTab;
    }
    return 'profile';
  });

  const addToast = useAppStore((state) => state.addToast);

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your FlowState experience</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                activeSection === section.id
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}

          <div className="pt-4 border-t border-border mt-4">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {activeSection === 'appearance' && <AppearanceSettings theme={theme} setTheme={setTheme} />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'profile' && <ProfileSettings user={user} />}
          {activeSection === 'preferences' && <PreferenceSettings />}
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings({ theme, setTheme }: { theme?: string; setTheme: (t: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-lg font-semibold">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-3 block">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                  mounted && theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <option.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NotificationSettings() {
  const [morningTime, setMorningTime] = useState('08:00');
  const [eveningTime, setEveningTime] = useState('18:00');
  const [habitReminders, setHabitReminders] = useState(true);
  const [goalReminders, setGoalReminders] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-lg font-semibold">Notifications</h2>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Morning Reminder</p>
                <p className="text-sm text-muted-foreground">Daily planning ritual</p>
              </div>
            </div>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="font-medium">Evening Reminder</p>
                <p className="text-sm text-muted-foreground">Daily reflection</p>
              </div>
            </div>
            <input
              type="time"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Habit Reminders</p>
              <p className="text-sm text-muted-foreground">Remind about daily habits</p>
            </div>
            <button
              onClick={() => setHabitReminders(!habitReminders)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                habitReminders ? "bg-primary" : "bg-accent"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
                habitReminders ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Goal Reminders</p>
              <p className="text-sm text-muted-foreground">Upcoming goal deadlines</p>
            </div>
            <button
              onClick={() => setGoalReminders(!goalReminders)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                goalReminders ? "bg-primary" : "bg-accent"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
                goalReminders ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const storeUser = useAppStore((state) => state.user);
  const effectiveUser = user || storeUser;

  const [name, setName] = useState(effectiveUser?.full_name || effectiveUser?.name || '');
  const [username, setUsername] = useState(effectiveUser?.username || '');
  const [email, setEmail] = useState(effectiveUser?.email || '');
  const [timezone, setTimezone] = useState(effectiveUser?.timezone || 'UTC');
  const updateProfile = useUpdateProfile();
  const logout = useLogout();

  // Keep state in sync whenever user object is loaded or updated
  useEffect(() => {
    const active = user || storeUser;
    if (active) {
      if (active.full_name || active.name) setName(active.full_name || active.name);
      if (active.username) setUsername(active.username);
      if (active.email !== undefined) setEmail(active.email || '');
      if (active.timezone) setTimezone(active.timezone);
    }
  }, [user, storeUser]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      full_name: name,
      username,
      email: email.trim() || undefined,
      timezone,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Profile Details</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your personal FlowState identity and account settings
        </p>
      </div>

      <div className="space-y-6">
        {/* User Badge Overview */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#C8A96B]/15 border-2 border-[#C8A96B]/30 flex items-center justify-center text-2xl font-black text-[#C8A96B] shrink-0">
            {(name?.charAt(0) || username?.charAt(0) || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-foreground truncate leading-tight">
              {name || username || 'FlowState Member'}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              @{username || 'user'} {email ? `· ${email}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#C8A96B]/15 text-[#C8A96B] font-bold border border-[#C8A96B]/25">
                Level {effectiveUser?.level || 1}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {effectiveUser?.xp || 0} XP
              </span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              disabled={updateProfile.isPending}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/40 focus:border-[#C8A96B] transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your unique handle"
              disabled={updateProfile.isPending}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/40 focus:border-[#C8A96B] transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              disabled={updateProfile.isPending}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/40 focus:border-[#C8A96B] transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={updateProfile.isPending}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C8A96B]/40 focus:border-[#C8A96B] transition-all"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-6 py-2.5 bg-[#C8A96B] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider hover:bg-[#d8bc7f] active:bg-[#b89859] transition-all flex items-center gap-2 shadow-md shadow-[#C8A96B]/20 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {updateProfile.isPending ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* Security & Explicit Sign Out Section */}
        <div className="pt-6 border-t border-border">
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-foreground">Sign Out of FlowState</p>
              <p className="text-xs text-muted-foreground mt-0.5">End your session securely on this browser</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PreferenceSettings() {
  const [weeklyReviewDay, setWeeklyReviewDay] = useState(0);
  const [xpCap, setXpCap] = useState(500);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-lg font-semibold">Preferences</h2>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium mb-3 block">Weekly Review Day</label>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => setWeeklyReviewDay(i)}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium transition-colors",
                  weeklyReviewDay === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium mb-3 block">Daily XP Cap</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={xpCap}
              onChange={(e) => setXpCap(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-16 text-right">{xpCap} XP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
