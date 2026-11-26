'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useTasks, useHabits } from '@/hooks/hooks';
import { cn, getToday } from '@/lib/utils';

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Fetch context lazily when chat is open (or read straight from cache)
  const { data: tasks } = useTasks(getToday(), isOpen);
  const { data: habits } = useHabits(isOpen);

  // Memoize context string to prevent unnecessary garbage collection & rerenders
  const contextString = useMemo(() => {
    const pendingTasksStr =
      tasks
        ?.filter((t) => t.status !== 'completed')
        .map((t) => `- ${t.title} (Priority: ${t.priority})`)
        .join('\n') || 'No pending tasks.';

    const habitsStr =
      habits
        ?.map(
          (h) =>
            `- ${h.title} (Target: ${
              h.target_duration_minutes ? h.target_duration_minutes + ' min' : 'completion'
            })`
        )
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

  const initialWelcomeMessage = useMemo(
    () => ({
      id: 'welcome',
      role: 'assistant' as const,
      parts: [
        {
          type: 'text' as const,
          text: "Hi! I'm FlowState AI, your personal productivity coach. What would you like to focus on today?",
        },
      ],
    }),
    []
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
    clearError,
  } = useChat({
    transport,
    messages: [initialWelcomeMessage],
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Load persistent chat history from Supabase on open
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      fetch('/api/chat')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            const formatted = data.messages.map((m: any) => ({
              id: m.id || Math.random().toString(36),
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.content }],
            }));
            setMessages([initialWelcomeMessage, ...formatted]);
          }
          setHistoryLoaded(true);
        })
        .catch(() => {
          setHistoryLoaded(true);
        });
    }
  }, [isOpen, historyLoaded, setMessages, initialWelcomeMessage]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (error) clearError();
    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    if (error) clearError();
    sendMessage({ text: prompt });
  };

  const handleRetry = () => {
    if (regenerate) {
      if (error) clearError();
      regenerate();
    }
  };

  const handleClearChat = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setMessages([initialWelcomeMessage]);
    try {
      await fetch('/api/chat', { method: 'DELETE' });
    } catch {
      // Non-blocking
    }
  };

  // Auto-scroll to bottom on new messages or loading state
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  // Helper to extract message text content cleanly
  const getMessageText = (message: any): string => {
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
            className="fixed bottom-24 right-4 z-50 w-[350px] sm:w-[420px] h-[520px] max-h-[85vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">FlowState AI</h3>
                  <p className="text-xs text-muted-foreground">Productivity & Execution Coach</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1",
                      confirmClear
                        ? "bg-red-500/15 text-red-500"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                    title={confirmClear ? 'Click again to clear chat history' : 'Clear chat history'}
                    aria-label="Clear chat history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmClear && <span>Clear?</span>}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setConfirmClear(false); setIsOpen(false); }}
                  className="p-2 rounded-full hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
                  aria-label="Close Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                      'flex w-full gap-3 text-sm',
                      role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-2xl max-w-[82%] whitespace-pre-wrap leading-relaxed shadow-xs',
                        role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-accent/60 text-foreground border border-border rounded-bl-sm'
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

              {/* Typing / Loading Indicator */}
              {isLoading && (
                <div className="flex w-full gap-3 text-sm justify-start items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-accent/50 text-foreground border border-border rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Thinking...</span>
                  </div>
                </div>
              )}

              {/* Error Message with Retry Button */}
              {error && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Failed to get response. Please try again.</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 font-semibold hover:underline cursor-pointer shrink-0 px-2 py-1 bg-destructive/15 rounded-md"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length < 3 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {[
                  'Review my daily priorities',
                  'Generate a Spring Boot question',
                  'Assess my English paragraph',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-xs bg-accent/80 hover:bg-accent text-foreground px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border border-border cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 bg-accent/50 rounded-full border border-border pl-4 pr-1 py-1 focus-within:border-primary/50 transition-colors"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for advice, priorities, or feedback..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-2"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity cursor-pointer text-primary-foreground shrink-0 shadow-sm"
                  aria-label="Send Message"
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
          className="fixed bottom-36 right-4 lg:bottom-24 lg:right-8 z-40 w-14 h-14 bg-gradient-to-tr from-primary to-purple-600 rounded-full shadow-xl flex items-center justify-center text-white cursor-pointer group"
          title="FlowState AI Assistant"
          aria-label="Open AI Assistant"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageSquare className="w-6 h-6 relative z-10" />
        </motion.button>
      )}
    </>
  );
}
