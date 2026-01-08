"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, Loader2 } from "lucide-react";

interface AddTaskFormProps {
  onAddTask: (text: string) => Promise<void>;
  isDisabled?: boolean;
}

export function AddTaskForm({ onAddTask, isDisabled }: AddTaskFormProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onAddTask(text.trim());
    setText("");
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`relative group transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl opacity-0 blur transition-opacity duration-300 ${isFocused ? 'opacity-40' : 'group-hover:opacity-20'}`} />
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="What needs to be done? (e.g., 'Schedule dentist appointment in Chicago')"
            className="w-full p-5 pr-32 bg-white/[0.03] border border-white/[0.08] rounded-xl resize-none focus:outline-none focus:bg-white/[0.05] disabled:opacity-50 text-white placeholder:text-white/25 transition-all duration-300"
            rows={3}
            disabled={isDisabled || isSubmitting}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!text.trim() || isDisabled || isSubmitting}
            className="absolute right-3 bottom-3 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Add Task</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-white/30">
        <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-lg shadow-amber-500/20">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span>AI will automatically enhance your task with steps, priority, and tags</span>
      </div>
    </form>
  );
}
