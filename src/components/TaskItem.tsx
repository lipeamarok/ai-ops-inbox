"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Task, TaskStep } from "@/types";
import { Check, Pencil, Trash2, Globe, Zap, ListChecks, Loader2 } from "lucide-react";
import clsx from "clsx";

interface TaskItemProps {
  task: Task;
  onEdit: (id: string, newText: string) => Promise<void>;
  onToggleDone: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleStep?: (taskId: string, stepId: string) => Promise<void>;
}

export function TaskItem({ task, onEdit, onToggleDone, onDelete, onToggleStep }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.request_raw);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setIsLoading(true);
    await onEdit(task.id, editText);
    setIsEditing(false);
    setIsLoading(false);
  };

  const handleToggleDone = async () => {
    setIsLoading(true);
    await onToggleDone(task.id);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setIsLoading(true);
    await onDelete(task.id);
    setIsLoading(false);
  };

  const isDone = task.status === "done";
  const isEnriching = !task.title_enhanced && !isDone;

  const priorityColors = {
    low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    high: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "relative border rounded-2xl p-5 transition-all duration-300 group",
        isDone
          ? "bg-white/[0.02] border-white/[0.04] opacity-60"
          : "bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/[0.08] hover:border-violet-500/30",
        isLoading && "opacity-50 pointer-events-none"
      )}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={handleToggleDone}
          className={clsx(
            "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-110",
            isDone
              ? "bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-400 text-white"
              : "border-white/20 hover:border-violet-400 hover:bg-violet-500/10"
          )}
        >
          {isDone && <Check className="w-4 h-4" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-3 bg-white/[0.05] border border-white/[0.1] rounded-xl resize-none focus:outline-none focus:border-violet-500/50 text-white placeholder-white/30"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(task.request_raw);
                  }}
                  className="px-4 py-1.5 text-sm bg-white/[0.05] text-white/70 rounded-lg hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <h3
                className={clsx(
                  "font-semibold text-white",
                  isDone && "line-through text-white/40"
                )}
              >
                {task.title_enhanced || task.request_raw}
              </h3>

              {/* Original request (if enhanced) */}
              {task.title_enhanced && (
                <p className="text-sm text-white/30 mt-1 italic">
                  &ldquo;{task.request_raw}&rdquo;
                </p>
              )}

              {/* Enriching badge */}
              {isEnriching && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 mt-3 p-3 bg-violet-500/10 rounded-xl border border-violet-500/20"
                >
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-sm text-violet-300 font-medium">AI is enhancing this task...</span>
                </motion.div>
              )}

              {/* Priority & Tags */}
              {task.title_enhanced && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className={clsx(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg border",
                      priorityColors[task.priority as keyof typeof priorityColors] ||
                        priorityColors.medium
                    )}
                  >
                    {task.priority?.toUpperCase()}
                  </span>
                  {task.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-300 rounded-lg border border-indigo-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Next Action */}
              {task.next_action && (
                <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <p className="text-sm text-amber-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">Next:</span> {task.next_action}
                  </p>
                </div>
              )}

              {/* Steps */}
              {task.steps && task.steps.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-white/60 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Steps ({task.steps.filter(s => s.done).length}/{task.steps.length})
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    {task.steps.map((step: TaskStep, idx: number) => {
                      const isStepLoading = loadingStepId === step.id;
                      return (
                        <li
                          key={step.id || idx}
                          className={clsx(
                            "text-sm text-white/70 flex items-start gap-3 p-2 rounded-lg transition-all",
                            onToggleStep && !isDone ? "cursor-pointer hover:bg-white/[0.05]" : "hover:bg-white/[0.03]",
                            isStepLoading && "opacity-50"
                          )}
                          onClick={async () => {
                            if (!onToggleStep || isDone || isStepLoading) return;
                            setLoadingStepId(step.id);
                            await onToggleStep(task.id, step.id);
                            setLoadingStepId(null);
                          }}
                        >
                          {/* Step checkbox */}
                          <span
                            className={clsx(
                              "w-5 h-5 flex items-center justify-center rounded-md text-xs font-medium border transition-all",
                              step.done
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                : "bg-white/[0.05] border-white/[0.1] text-white/50",
                              onToggleStep && !isDone && "hover:border-emerald-400"
                            )}
                          >
                            {isStepLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : step.done ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              idx + 1
                            )}
                          </span>
                          <span className={clsx(
                            "flex-1",
                            step.done && "line-through text-white/30"
                          )}>
                            {step.step_text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-white/40 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all duration-200 hover:scale-110"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200 hover:scale-110"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer - Timestamp */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex justify-between text-xs text-white/30">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          {task.source}
        </span>
        <span>{new Date(task.created_at).toLocaleString()}</span>
      </div>
    </motion.div>
  );
}
