'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, ChevronLeft, ChevronRight, AlertCircle, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks';
import { useAppStore } from '@/lib/store';
import { TimeBlockModal } from './modals/timeblock-modal';
import type { TimeBlock } from '@/types/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

export function TimetableView() {
  const { data: tasks } = useTasks();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [view, setView] = useState<'day' | 'week'>('week');
  const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [currentTime, setCurrentTime] = useState(new Date());

  const timeBlocks = useAppStore(state => state.timeBlocks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour;
    return `${h}:00 ${ampm}`;
  };

  const getCurrentHourDecimal = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours + minutes / 60;
  };

  const currentHour = getCurrentHourDecimal();
  const showCurrentTimeLine = currentHour >= 6 && currentHour <= 23;
  const timeLineTop = (currentHour - 6) * 64; // 64px per hour

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timetable</h1>
          <p className="text-muted-foreground mt-1">Your CEO Operating Manual Schedule</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-accent rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setView('day')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                view === 'day' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                view === 'week' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Week
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center bg-card border border-border rounded-lg p-1 w-full sm:w-auto justify-between">
            <button
              onClick={() => {
                if (view === 'day') {
                  setCurrentDayIndex(prev => prev === 0 ? 6 : prev - 1);
                } else {
                  setCurrentWeekOffset(prev => prev - 1);
                }
              }}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm font-medium min-w-[100px] text-center">
              {view === 'day' ? DAYS[currentDayIndex] : currentWeekOffset === 0 ? 'This Week' : `${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset} Week`}
            </span>
            <button
              onClick={() => {
                if (view === 'day') {
                  setCurrentDayIndex(prev => prev === 6 ? 0 : prev + 1);
                } else {
                  setCurrentWeekOffset(prev => prev + 1);
                }
              }}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => { setSelectedBlock(null); setIsModalOpen(true); }}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>
        </div>
      </div>

      {/* Alert for overlapping tasks */}
      <div className="bg-muted border border-border rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Market vs Classes Balance</p>
          <p className="opacity-90 mt-1">Remember your principle: Online Classes (8:30-5:30) are Primary. Market (9:15-3:30) is Secondary. Set alerts for key levels instead of constant chart watching.</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[700px] shadow-sm">
        {/* Days Header */}
        <div className={cn(
          "grid border-b border-border bg-muted/50 sticky top-0 z-20",
          view === 'week' ? "grid-cols-8" : "grid-cols-[80px_1fr]"
        )}>
          <div className="p-3 border-r border-border flex items-center justify-center">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          {view === 'week' ? DAYS.map((day, idx) => (
            <div key={day} className={cn(
              "p-3 border-r border-border text-center last:border-r-0",
              idx === currentDayIndex && currentWeekOffset === 0 ? "bg-primary/5" : ""
            )}>
              <span className={cn(
                "text-sm font-medium",
                idx === currentDayIndex && currentWeekOffset === 0 ? "text-primary" : ""
              )}>{day}</span>
            </div>
          )) : (
            <div className="p-3 text-center bg-primary/5">
              <span className="text-sm font-medium text-primary">{DAYS[currentDayIndex]}</span>
            </div>
          )}
        </div>

        {/* Time Slots */}
        <div className="flex-1 overflow-y-auto relative" ref={containerRef}>
          <div className={cn(
            "grid min-w-[800px] sm:min-w-0 relative",
            view === 'week' ? "grid-cols-8" : "grid-cols-[80px_1fr]"
          )}>
            {/* Time Column */}
            <div className="border-r border-border flex flex-col bg-card z-10 sticky left-0">
              {HOURS.map(hour => (
                <div key={hour} className="h-16 border-b border-border flex items-start justify-center p-2 relative">
                  <span className="text-xs text-muted-foreground font-medium bg-card px-1 -mt-3">{formatHour(hour)}</span>
                </div>
              ))}
            </div>

            {/* Current Time Indicator Line (spans across all day columns) */}
            {showCurrentTimeLine && currentWeekOffset === 0 && (
              <div 
                className="absolute left-[80px] right-0 z-30 pointer-events-none flex items-center"
                style={{ top: `${timeLineTop}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
                <div className="h-[2px] flex-1 bg-red-500/50 shadow-sm" />
              </div>
            )}

            {/* Days Columns */}
            {(view === 'week' ? DAYS : [DAYS[currentDayIndex]]).map((day, colIdx) => {
              const actualDayIdx = view === 'week' ? colIdx : currentDayIndex;
              const isToday = actualDayIdx === currentDayIndex && currentWeekOffset === 0;

              return (
                <div key={day} className={cn(
                  "border-r border-border last:border-r-0 flex flex-col relative",
                  isToday ? "bg-primary/[0.02]" : ""
                )}>
                  {HOURS.map(hour => (
                    <div key={hour} className="h-16 border-b border-border hover:bg-accent/40 transition-colors group relative border-dashed border-border/50 cursor-pointer">
                      <button 
                        onClick={() => { setSelectedBlock(null); setIsModalOpen(true); }}
                        className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}

                  {timeBlocks.filter(b => b.days.includes(actualDayIdx === 0 ? 0 : actualDayIdx)).map(block => (
                    <Block 
                      key={block.id}
                      startHour={block.startHour} 
                      durationHours={block.durationHours} 
                      color={block.color} 
                      title={block.title} 
                      onClick={() => { setSelectedBlock(block); setIsModalOpen(true); }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <TimeBlockModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} block={selectedBlock} />
    </div>
  );
}

function Block({ startHour, durationHours, color, title, className = '', onClick }: { startHour: number, durationHours: number, color: string, title: string, className?: string, onClick?: () => void }) {
  const topOffset = (startHour - 6) * 64; // 64px per hour (h-16)
  const height = durationHours * 64;
  
  return (
    <div 
      className={cn(
        "absolute inset-x-1.5 rounded-md border p-2 text-xs font-medium overflow-hidden shadow-sm backdrop-blur-sm transition-all hover:shadow-md cursor-pointer", 
        color, 
        className
      )}
      style={{ top: `${topOffset}px`, height: `${height}px` }}
      onClick={onClick}
    >
      <div className="flex flex-col h-full pointer-events-none">
        <span className="font-semibold leading-tight">{title}</span>
        {durationHours >= 1 && (
          <span className="text-[10px] opacity-80 mt-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {durationHours}h
          </span>
        )}
      </div>
    </div>
  );
}
