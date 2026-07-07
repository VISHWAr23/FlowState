'use client';

import { useState } from 'react';
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
import { useAuth } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function SettingsView() {
  const { data: user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('appearance');
  const addToast = useAppStore((state) => state.addToast);



  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
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
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}


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
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  theme === option.value
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
  const [name, setName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const addToast = useAppStore((state) => state.addToast);

  const handleSave = () => {
    addToast({ type: 'success', title: 'Profile updated' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-lg font-semibold">Profile</h2>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-medium">{user?.email}</p>
            <p className="text-sm text-muted-foreground">Level {user?.level} · {user?.xp} XP</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Timezone</label>
            <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option>UTC</option>
              <option>America/New_York</option>
              <option>America/Los_Angeles</option>
              <option>Europe/London</option>
              <option>Asia/Tokyo</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
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
