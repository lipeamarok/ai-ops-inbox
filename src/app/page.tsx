"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { RefreshCw, LogOut, Clock } from "lucide-react";
import { Task } from "@/types";
import { UserKeyInput } from "@/components/UserKeyInput";
import { AddTaskForm } from "@/components/AddTaskForm";
import { TaskList } from "@/components/TaskList";

export default function Home() {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Verificar se há identifier na URL ou localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlIdentifier = params.get("user");
      const storedIdentifier = localStorage.getItem("identifier");

      if (urlIdentifier) {
        setIdentifier(urlIdentifier);
        localStorage.setItem("identifier", urlIdentifier);
      } else if (storedIdentifier) {
        setIdentifier(storedIdentifier);
        // Atualizar URL
        window.history.replaceState({}, "", `?user=${encodeURIComponent(storedIdentifier)}`);
      }
    }
  }, []);

  // Buscar tasks quando identifier muda
  const fetchTasks = useCallback(async () => {
    if (!identifier) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks?identifier=${encodeURIComponent(identifier)}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [identifier]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Polling para buscar atualizações (enriquecimento da IA)
  useEffect(() => {
    if (!identifier) return;

    // Verificar se há tasks não enriquecidas
    const hasUnenrichedTasks = tasks.some(
      (t) => !t.title_enhanced && t.status !== "done"
    );

    if (hasUnenrichedTasks) {
      const interval = setInterval(fetchTasks, 5000); // Poll a cada 5 segundos
      return () => clearInterval(interval);
    }
  }, [identifier, tasks, fetchTasks]);

  // Handlers
  const handleIdentifierSubmit = (key: string) => {
    setIdentifier(key);
    localStorage.setItem("identifier", key);
    window.history.replaceState({}, "", `?user=${encodeURIComponent(key)}`);
  };

  const handleAddTask = async (text: string) => {
    if (!identifier) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier,
          request_raw: text,
          source: "web",
        }),
      });

      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleEditTask = async (id: string, newText: string) => {
    if (!identifier) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_raw: newText, identifier }),
      });

      const data = await res.json();
      if (data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data.task } : t))
        );
      }
    } catch (err) {
      console.error("Failed to edit task:", err);
    }
  };

  const handleToggleDone = async (id: string) => {
    if (!identifier) return;
    try {
      const res = await fetch(`/api/tasks/${id}/done`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (data.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data.task } : t))
        );
      }
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!identifier) return;
    try {
      await fetch(`/api/tasks/${id}?identifier=${encodeURIComponent(identifier)}`, {
        method: "DELETE",
      });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleToggleStep = async (taskId: string, stepId: string) => {
    if (!identifier) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (data.step) {
        // Atualizar o step específico dentro da task
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              steps: t.steps?.map((s) =>
                s.id === stepId ? { ...s, done: data.step.done } : s
              ),
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to toggle step:", err);
    }
  };

  const handleLogout = () => {
    setIdentifier(null);
    setTasks([]);
    localStorage.removeItem("identifier");
    window.history.replaceState({}, "", window.location.pathname);
  };

  // Se não há identifier, mostrar formulário de entrada
  if (!identifier) {
    return <UserKeyInput onSubmit={handleIdentifierSubmit} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="overflow-visible">
              <Image
                src="/logo.png"
                alt="AI Ops Inbox"
                width={200}
                height={50}
                className="h-12 w-auto scale-150 origin-left"
                priority
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-sm text-white/40">{identifier}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1"
          >
            <button
              onClick={fetchTasks}
              className="p-2.5 text-white/40 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-3xl mx-auto px-4 py-8 pb-24">
        {/* Add Task Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 mb-8 shadow-xl"
        >
          <AddTaskForm onAddTask={handleAddTask} />
        </motion.div>

        {/* Task List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onEdit={handleEditTask}
            onToggleDone={handleToggleDone}
            onDelete={handleDeleteTask}
            onToggleStep={handleToggleStep}
          />
        </motion.div>

        {/* Last Refresh */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-white/20 mt-8 flex items-center justify-center gap-2"
        >
          <Clock className="w-3.5 h-3.5" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </motion.div>
      </main>
    </div>
  );
}