"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, User } from "lucide-react";

interface UserKeyInputProps {
  onSubmit: (userKey: string) => void;
}

export function UserKeyInput({ onSubmit }: UserKeyInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-r from-violet-600/30 to-indigo-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 rounded-full blur-3xl"
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-sm"
      >
        {/* Main Card */}
        <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-8 shadow-2xl shadow-black/50">
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Logo Area */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-6"
          >
            <div className="flex justify-center mb-4 overflow-visible">
              <Image
                src="/logo.png"
                alt="AI Ops Inbox"
                width={280}
                height={80}
                className="h-16 w-auto scale-[1.8] origin-center"
                priority
              />
            </div>

            <p className="text-white/40 text-sm mt-6">
              Transform chaos into clarity
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="userKey"
                className="block text-sm font-medium text-white/60 mb-2 ml-1"
              >
                Enter your name or email
              </label>
              <div className={`relative group transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl opacity-0 blur transition-opacity duration-300 ${isFocused ? 'opacity-50' : 'group-hover:opacity-30'}`} />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    id="userKey"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:bg-white/[0.08] transition-all duration-300"
                    autoFocus
                  />
                  <User className="absolute right-4 w-5 h-5 text-white/20" />
                </div>
              </div>
              <p className="mt-2 text-xs text-white/30 ml-1">
                Used to save and sync your tasks
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!value.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center justify-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.form>

          {/* Features - Compact inline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 pt-5 border-t border-white/[0.06]"
          >
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-white/30">
              <span>AI Enhancement</span>
              <span className="text-white/10">•</span>
              <span>Smart Priority</span>
              <span className="text-white/10">•</span>
              <span>Step Breakdown</span>
              <span className="text-white/10">•</span>
              <span>AI Chatbot</span>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-4 text-center"
          >
            <p className="text-[10px] text-white/20">
              Powered by <span className="text-white/30">n8n</span> · <span className="text-white/30">Next.js</span> · <span className="text-white/30">OpenAI</span>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
