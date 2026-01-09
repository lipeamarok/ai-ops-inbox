"use client";

import { Task } from "@/types";
import { TaskItem } from "./TaskItem";
import { Loader2, Inbox, CircleDot, CheckCircle2 } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (id: string, newText: string) => Promise<void>;
  onToggleDone: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleStep?: (taskId: string, stepId: string) => Promise<void>;
}

export function TaskList({ tasks, isLoading, onEdit, onToggleDone, onDelete, onToggleStep }: TaskListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
        <p className="text-sm text-white/30">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-5 bg-white/[0.03] rounded-2xl flex items-center justify-center border border-white/[0.06]">
          <Inbox className="w-10 h-10 text-white/20" />
        </div>
        <h3 className="text-xl font-semibold text-white/60">No tasks yet</h3>
        <p className="text-white/30 mt-2">Add your first task to get started!</p>
      </div>
    );
  }

  // Separar tasks abertas e concluídas
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-8">
      {/* Open Tasks */}
      {openTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-violet-400" />
            Open ({openTasks.length})
          </h2>
          <div className="space-y-4">
            {openTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEdit}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                onToggleStep={onToggleStep}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white/30 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Completed ({doneTasks.length})
          </h2>
          <div className="space-y-4">
            {doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEdit}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                onToggleStep={onToggleStep}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
