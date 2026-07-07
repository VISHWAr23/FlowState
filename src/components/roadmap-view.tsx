'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Briefcase, Code, MessageCircle, Plus, CheckCircle2, Circle, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RoadmapType = 'placement' | 'coding' | 'english';

interface Block {
  id: string;
  type: 'heading' | 'task' | 'text';
  content: string;
  completed?: boolean;
}

const INITIAL_ROADMAPS: Record<RoadmapType, Block[]> = {
  placement: [
    { id: '1', type: 'heading', content: 'Phase 1: Foundation (Current)' },
    { id: '2', type: 'task', content: 'Complete Core Java Mastery', completed: true },
    { id: '3', type: 'task', content: 'Data Structures in Java (Arrays, Strings, LinkedLists)' },
    { id: '4', type: 'heading', content: 'Phase 2: Backend Development' },
    { id: '5', type: 'task', content: 'SQL Basics & Advanced Queries' },
    { id: '6', type: 'task', content: 'Spring Boot REST APIs' },
    { id: '7', type: 'task', content: 'Microservices Architecture Basics' },
  ],
  coding: [
    { id: 'c1', type: 'heading', content: 'Weekly Rotation Schedule' },
    { id: 'c2', type: 'task', content: 'Monday: Java Core Concepts' },
    { id: 'c3', type: 'task', content: 'Tuesday: Spring Boot Feature Dev' },
    { id: 'c4', type: 'task', content: 'Wednesday: DSA Problem Solving (LeetCode)' },
    { id: 'c5', type: 'task', content: 'Thursday: SQL & Database Design' },
    { id: 'c6', type: 'task', content: 'Friday: Backend APIs Integration' },
    { id: 'c7', type: 'task', content: 'Saturday: Mock Interviews / System Design' },
    { id: 'c8', type: 'task', content: 'Sunday: Revision & Portfolio Building' },
  ],
  english: [
    { id: 'e1', type: 'heading', content: 'Morning Routine (45 mins daily)' },
    { id: 'e2', type: 'task', content: '10 min: Vocabulary building' },
    { id: 'e3', type: 'task', content: '10 min: Active Listening (Podcasts/News)' },
    { id: 'e4', type: 'task', content: '15 min: Speaking aloud (Shadowing)' },
    { id: 'e5', type: 'task', content: '10 min: Writing one paragraph' },
  ]
};

export function RoadmapView() {
  const [activeTab, setActiveTab] = useState<RoadmapType>('placement');
  const [roadmaps, setRoadmaps] = useState(INITIAL_ROADMAPS);
  
  const tabs: { id: RoadmapType, label: string, icon: any }[] = [
    { id: 'placement', label: 'Placement', icon: Briefcase },
    { id: 'coding', label: 'Coding Practice', icon: Code },
    { id: 'english', label: 'English Comm', icon: MessageCircle },
  ];

  const currentBlocks = roadmaps[activeTab];

  const toggleTask = (id: string) => {
    setRoadmaps(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(block => 
        block.id === id ? { ...block, completed: !block.completed } : block
      )
    }));
  };

  const addBlock = (type: 'heading' | 'task') => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === 'heading' ? 'New Section' : 'New Task',
      completed: type === 'task' ? false : undefined,
    };
    setRoadmaps(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newBlock]
    }));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roadmaps</h1>
        <p className="text-muted-foreground mt-1">Your long-term strategic plans</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 p-1 bg-muted/50 rounded-xl w-fit">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="roadmap-tab"
                  className="absolute inset-0 bg-background shadow-sm rounded-lg"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Editor Surface */}
      <div className="bg-card border border-border rounded-2xl shadow-sm min-h-[500px] p-8 md:p-12 relative group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {currentBlocks.map((block, index) => (
              <motion.div 
                key={block.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="group/block flex items-start gap-3 relative"
              >
                {/* Drag handle placeholder */}
                <div className="w-6 flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity absolute -left-8 top-1.5 cursor-grab">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </div>

                {block.type === 'heading' && (
                  <h2 className="text-xl font-bold mt-6 mb-2 outline-none" contentEditable suppressContentEditableWarning>
                    {block.content}
                  </h2>
                )}

                {block.type === 'task' && (
                  <div className="flex items-start gap-3 w-full p-2 hover:bg-accent/50 rounded-lg transition-colors group/task">
                    <button onClick={() => toggleTask(block.id)} className="mt-0.5">
                      {block.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <div 
                      className={cn(
                        "flex-1 outline-none text-base transition-all",
                        block.completed && "line-through text-muted-foreground opacity-70"
                      )}
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {block.content}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            <div className="pt-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => addBlock('task')} className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <button onClick={() => addBlock('heading')} className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-sm rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
