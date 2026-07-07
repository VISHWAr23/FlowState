'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Star,
  Zap,
  Flame,
  Crown,
  Award,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useUserBadges, useAuth } from '@/hooks';
import { cn, getToday } from '@/lib/utils';
import { xpProgressInLevel, getLevelTitle } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  consistency: 'from-orange-500 to-red-500',
  milestone: 'from-blue-500 to-cyan-500',
  explorer: 'from-green-500 to-emerald-500',
  master: 'from-purple-500 to-violet-500',
};

export function AchievementsView() {
  const { data: userBadges, isLoading } = useUserBadges();
  const { data: user } = useAuth();

  const earnedBadges = userBadges?.filter(ub => ub.badge) || [];
  const totalXP = user?.xp || 0;
  const level = user?.level || 1;
  const progress = xpProgressInLevel(totalXP, level);

  // Group badges by category
  const groupedBadges = earnedBadges.reduce((acc, ub) => {
    const cat = ub.badge?.category || 'milestone';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ub);
    return acc;
  }, {} as Record<string, typeof earnedBadges>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Achievements</h1>
        <p className="text-muted-foreground mt-1">Your journey of growth and mastery</p>
      </div>

      {/* Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-8"
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-16 h-16 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {level}
            </div>
          </div>

          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold">Level {level} {getLevelTitle(level)}</h2>
            <p className="text-muted-foreground mt-1">
              {totalXP.toLocaleString()} total XP earned
            </p>

            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress to Level {level + 1}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-3 bg-accent rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-card rounded-xl p-4">
              <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{earnedBadges.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div className="bg-card rounded-xl p-4">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{user?.current_streak || 0}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Badge Categories */}
      {Object.entries(groupedBadges).map(([category, badges], catIndex) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: catIndex * 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", CATEGORY_COLORS[category])} />
            {category} Badges
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(badges as any[]).map((ub, index) => (
              <motion.div
                key={ub.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl border border-border p-5 text-center hover:shadow-md transition-shadow"
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center",
                    "bg-gradient-to-br",
                    CATEGORY_COLORS[category]
                  )}
                >
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-sm">{ub.badge?.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ub.badge?.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3" />
                  +{ub.badge?.xp_reward} XP
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {earnedBadges.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No badges yet</p>
          <p className="text-sm mt-1">Complete tasks, habits, and goals to earn your first badge</p>
        </div>
      )}
    </div>
  );
}
