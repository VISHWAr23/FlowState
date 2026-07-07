'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useTasks, useHabits } from '@/hooks/hooks';
import { cn } from '@/lib/utils';
import { getToday } from '@/lib/utils';

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch context for the AI
  const { data: tasks } = useTasks(getToday());
  const { data: habits } = useHabits();
  
  // Prepare context string
  const contextString = `
Pending Tasks for Today:
${tasks?.filter(t => t.status !== 'completed').map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n') || 'No pending tasks.'}

Active Habits:
${habits?.map(h => `- ${h.title} (Target: ${h.target_duration_minutes ? h.target_duration_minutes + ' min' : 'completion'})`).join('\n') || 'No active habits.'}
  `.trim();

  const { messages, status, sendMessage } = useChat({
    api: '/api/chat',
    body: {
      context: contextString,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: "Hi! I'm FlowState AI, your personal productivity coach. What would you like to focus on today?" }],
      }
    ]
  } as any);

  const [input, setInput] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }],
    });
    setInput('');
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full gap-3 text-sm",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl max-w-[80%]",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-accent/50 text-foreground border border-border rounded-bl-sm"
                    )}
                  >
                    {message.parts?.map((part, i) => part.type === 'text' ? <span key={i}>{part.text}</span> : null)}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
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
                {['Analyze my market journal', 'Generate a Spring Boot question', 'Assess my English paragraph'].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      sendMessage({ role: 'user', parts: [{ type: 'text', text: prompt }] });
                    }}
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
                  value={input || ''}
                  onChange={handleInputChange}
                  placeholder="Ask for advice or motivation..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-2"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !(input || '').trim()}
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
