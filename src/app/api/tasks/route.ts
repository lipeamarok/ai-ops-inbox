import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// Schema de validação para criar task
const CreateTaskSchema = z.object({
  user_key: z.string().min(1, "user_key is required"),
  request_raw: z.string().min(1, "request_raw is required"),
  source: z.string().optional().default("web"),
});

// POST /api/tasks - Criar nova task
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateTaskSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user_key, request_raw, source } = parsed.data;

    // Inserir task no Supabase
    const { data: task, error } = await supabase
      .from("tasks")
      .insert([{ user_key, request_raw, source, status: "open" }])
      .select("*")
      .single();

    if (error || !task) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert task", details: error },
        { status: 500 }
      );
    }

    // Disparar webhook do n8n para enriquecimento (fire-and-forget)
    const n8nUrl = process.env.N8N_TASK_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          user_key,
          request_raw,
          source,
          app_base_url: process.env.APP_BASE_URL,
        }),
      }).catch((err) => {
        console.error("n8n webhook error (non-blocking):", err);
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tasks?user_key=... - Listar tasks do usuário
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_key = url.searchParams.get("user_key");

    if (!user_key) {
      return NextResponse.json(
        { error: "user_key query parameter is required" },
        { status: 400 }
      );
    }

    // Buscar tasks
    const { data: tasks, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_key", user_key)
      .order("created_at", { ascending: false });

    if (taskErr) {
      console.error("Supabase fetch error:", taskErr);
      return NextResponse.json(
        { error: "Failed to fetch tasks", details: taskErr },
        { status: 500 }
      );
    }

    const taskList = tasks ?? [];
    const taskIds = taskList.map((t) => t.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepsByTask: Record<string, any[]> = {};

    // Buscar steps se houver tasks
    if (taskIds.length > 0) {
      const { data: steps, error: stepsErr } = await supabase
        .from("task_steps")
        .select("*")
        .in("task_id", taskIds)
        .order("step_order", { ascending: true });

      if (!stepsErr && steps) {
        for (const s of steps) {
          if (!stepsByTask[s.task_id]) {
            stepsByTask[s.task_id] = [];
          }
          stepsByTask[s.task_id].push(s);
        }
      }
    }

    // Combinar tasks com seus steps
    const enrichedTasks = taskList.map((t) => ({
      ...t,
      steps: stepsByTask[t.id] ?? [],
    }));

    return NextResponse.json({ tasks: enrichedTasks });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
