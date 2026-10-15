'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useTasks, useHabits } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { getToday } from '@/lib/utils';

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  
  // Fetch context for the AI
  const { data: tasks } = useTasks(getToday());
  const { data: habits } = useHabits();
  
  // Memoize context string to prevent unnecessary garbage collection & rerenders
  const contextString = useMemo(() => {
    const pendingTasksStr = tasks
      ?.filter((t) => t.status !== 'completed')
      .map((t) => `- ${t.title} (Priority: ${t.priority})`)
      .join('\n') || 'No pending tasks.';

    const habitsStr = habits
      ?.map((h) => `- ${h.title} (Target: ${h.target_duration_minutes ? h.target_duration_minutes + ' min' : 'completion'})`)
      .join('\n') || 'No active habits.';

    return `Pending Tasks for Today:\n${pendingTasksStr}\n\nActive Habits:\n${habitsStr}`.trim();
  }, [tasks, habits]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          context: contextString,
        },
      }),
    [contextString]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: [
      {
        id: 'welcome',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: "Hi! I'm FlowState AI, your personal productivity coach. What would you like to focus on today?" }],
      }
    ]
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Helper to extract message text content
  const getMessageText = (message: any): string => {
    // Support both formats: message.content (string) and message.parts (array)
    if (typeof message.content === 'string' && message.content) {
      return message.content;
    }
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    return '';
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">FlowState AI</h3>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const text = getMessageText(message);
                if (!text) return null;
                const role = message.role as string;
                
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full gap-3 text-sm",
                      role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "px-4 py-2.5 rounded-2xl max-w-[80%] whitespace-pre-wrap",
                        role === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-accent/50 text-foreground border border-border rounded-bl-sm"
                      )}
                    >
                      {text}
                    </div>

                    {role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
              
              {isLoading && (messages[messages.length - 1]?.role as string) === 'user' && (
                <div className="flex w-full gap-3 text-sm justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-accent/50 text-foreground border border-border rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length < 3 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {['Review my daily priorities', 'Generate a Spring Boot question', 'Assess my English paragraph'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-xs bg-accent hover:bg-accent/80 text-foreground px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border border-border"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 bg-accent/50 rounded-full border border-border pl-4 pr-1 py-1"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for advice or motivation..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-2"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-50 transition-opacity cursor-pointer text-primary-foreground shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-tr from-primary to-purple-600 rounded-full shadow-xl flex items-center justify-center text-white cursor-pointer group"
          title="FlowState AI Assistant"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageSquare className="w-6 h-6 relative z-10" />
        </motion.button>
      )}
    </>
  );
}
