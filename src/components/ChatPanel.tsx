"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/types";
import { MessageSquare, X, Send, Bot, Sparkles, Loader2 } from "lucide-react";
import clsx from "clsx";

interface ChatPanelProps {
  identifier: string;
  onTaskCreated?: () => void;
}

export function ChatPanel({ identifier, onTaskCreated }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your task assistant. Here's what I can do:

• **add: [task]** - Create a new task
• **list** - Show your recent tasks
• **done: [task_id]** - Mark a task complete
• **help** - Show this message

Try saying "add: Schedule dentist appointment"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier,
          message: input.trim(),
        }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Command processed.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Se foi um comando de adicionar task, notificar para atualizar lista
      if (input.toLowerCase().startsWith("add:") && onTaskCreated) {
        onTaskCreated();
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "fixed bottom-6 right-6 w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 z-50",
          isOpen
            ? "bg-white/10 backdrop-blur-xl border border-white/20"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/40"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <>
            <MessageSquare className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#0a0a0f] animate-pulse" />
          </>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-[400px] h-[520px] bg-[#0d0d14]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/[0.08] flex flex-col z-40 overflow-hidden"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

            {/* Header */}
            <div className="relative px-5 py-4 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-b border-white/[0.05] flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Task Assistant</h3>
                <p className="text-xs text-white/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <Sparkles className="w-3 h-3" />
                  Powered by n8n + AI
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={clsx(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[85%] px-4 py-3 rounded-2xl",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md shadow-lg shadow-violet-500/20"
                        : "bg-white/[0.05] text-white/90 rounded-bl-md border border-white/[0.08]"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p
                      className={clsx(
                        "text-xs mt-2",
                        msg.role === "user" ? "text-violet-200" : "text-white/30"
                      )}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/[0.05] px-5 py-3 rounded-2xl rounded-bl-md border border-white/[0.08]">
                    <div className="flex gap-1.5">
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      <span className="text-sm text-white/50">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="relative p-4 border-t border-white/[0.05]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command..."
                  className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500/50 text-white placeholder:text-white/30 transition-all duration-200"
                  disabled={isLoading}
                />
                <motion.button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/25"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
