'use client';

import { useCallback, useMemo } from 'react';
import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useDailyLog, useUpsertDailyLog } from '@/hooks';
import { getToday } from '@/lib/utils';

const SCORECARD_ITEMS = [
  { id: 'score_online_class', label: 'Online Class' },
  { id: 'score_coding', label: 'Coding Practice' },
  { id: 'score_project', label: 'Project Dev' },
  { id: 'score_english', label: 'English Comm' },
  { id: 'score_typewriting', label: 'Typewriting' },
  { id: 'score_market_journal', label: 'Market Journal' },
  { id: 'score_recall', label: 'Recall Session' },
  { id: 'score_exercise', label: 'Exercise / Gym' },
  { id: 'score_sleep', label: 'Sleep before 10:30' },
] as const;

type ScorecardKey = (typeof SCORECARD_ITEMS)[number]['id'];

export function DailyScorecard() {
  const today = getToday();
  const { data: dailyLog } = useDailyLog(today);
  const upsertLog = useUpsertDailyLog();

  // Derive scores from persisted daily log data
  const scores = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const item of SCORECARD_ITEMS) {
      result[item.id] = !!(dailyLog as unknown as Record<string, unknown>)?.[item.id];
    }
    return result;
  }, [dailyLog]);

  const toggleScore = useCallback(
    (id: ScorecardKey) => {
      const newValue = !scores[id];
      upsertLog.mutate({
        log_date: today,
        [id]: newValue,
      });
    },
    [scores, today, upsertLog]
  );

  const currentScore = Object.values(scores).filter(Boolean).length;
  const targetScore = 7;
  const isGoalMet = currentScore >= targetScore;

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Daily Scorecard</h3>
            <p className="text-xs text-muted-foreground">Target: 7-8 checks per day</p>
          </div>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1",
          isGoalMet ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
        )}>
          {currentScore} / {SCORECARD_ITEMS.length}
        </div>
      </div>

      <div className="h-1.5 bg-accent rounded-full overflow-hidden mb-4">
        <motion.div 
          className={cn(
            "h-full rounded-full transition-colors",
            isGoalMet ? "bg-green-500" : "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${(currentScore / SCORECARD_ITEMS.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SCORECARD_ITEMS.map((item) => {
          const isChecked = scores[item.id] || false;
          return (
            <button
              key={item.id}
              onClick={() => toggleScore(item.id)}
              className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-lg transition-colors text-left group"
              role="checkbox"
              aria-checked={isChecked}
              aria-label={item.label}
            >
              <div className="flex-shrink-0">
                {isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground group-hover:border-primary transition-colors" />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium transition-colors",
                isChecked ? "text-muted-foreground" : "text-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
