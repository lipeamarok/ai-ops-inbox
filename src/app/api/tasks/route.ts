import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolveUserId, parseTagsFromDb } from "@/lib/user-utils";
import { Task, TaskStep } from "@/types";

// ============================================
// Helper: JSON Response com UTF-8 explícito
// ============================================
function jsonResponse(data: unknown, status: number = 200): NextResponse {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// ============================================
// POST /api/tasks - Criar nova task
// ============================================

const CreateTaskSchema = z.object({
  identifier: z.string().min(1, "identifier is required"),
  request_raw: z.string().min(1, "request_raw is required"),
  source: z.string().optional().default("web"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateTaskSchema.safeParse(json);

    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid body", details: parsed.error.flatten() },
        400
      );
    }

    const { identifier, request_raw, source } = parsed.data;

    // Resolver user_id a partir do identifier
    const user = await resolveUserId(identifier);

    // Inserir task no Supabase
    const { data: taskData, error } = await supabaseAdmin
      .from("tasks")
      .insert([
        {
          user_id: user.id,
          user_key: user.identifier, // Compatibilidade legado
          request_raw,
          source,
          status: "open",
          // tags será preenchido pelo enrichment
        },
      ])
      .select("*")
      .single();

    if (error || !taskData) {
      console.error("Supabase insert error:", error);
      return jsonResponse(
        { error: "Failed to insert task", details: error },
        500
      );
    }

    // Formatar task para resposta (converter tags para array)
    const task: Task = {
      ...taskData,
      tags: parseTagsFromDb(taskData.tags),
      steps: [],
    };

    // Disparar webhook do n8n para enriquecimento (fire-and-forget)
    const n8nUrl = process.env.N8N_TASK_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          identifier: user.identifier,
          request_raw,
          source,
          app_base_url: process.env.APP_BASE_URL || "https://ai-ops-inbox.vercel.app",
        }),
      }).catch((err) => {
        console.error("n8n webhook error (non-blocking):", err);
      });
    }

    return jsonResponse({ task }, 201);
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse(
      { error: "Internal server error", details: String(err) },
      500
    );
  }
}

// ============================================
// GET /api/tasks?identifier=... - Listar tasks do usuário
// ============================================

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const identifier = url.searchParams.get("identifier");

    if (!identifier) {
      return jsonResponse(
        { error: "identifier query parameter is required" },
        400
      );
    }

    // Resolver user_id
    const user = await resolveUserId(identifier);

    // Buscar tasks do usuário
    const { data: tasksData, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("Supabase select error:", tasksError);
      return jsonResponse(
        { error: "Failed to fetch tasks", details: tasksError },
        500
      );
    }

    const tasks = tasksData || [];

    // Se não há tasks, retornar lista vazia
    if (tasks.length === 0) {
      return jsonResponse({ tasks: [], user }, 200);
    }

    // Buscar steps de todas as tasks
    const taskIds = tasks.map((t) => t.id);
    const { data: stepsData, error: stepsError } = await supabaseAdmin
      .from("task_steps")
      .select("*")
      .in("task_id", taskIds)
      .order("step_order", { ascending: true });

    if (stepsError) {
      console.error("Supabase steps error:", stepsError);
    }

    // Agrupar steps por task_id
    const stepsByTaskId: Record<string, TaskStep[]> = {};
    (stepsData || []).forEach((step) => {
      if (!stepsByTaskId[step.task_id]) {
        stepsByTaskId[step.task_id] = [];
      }
      stepsByTaskId[step.task_id].push(step as TaskStep);
    });

    // Formatar tasks para resposta
    const formattedTasks: Task[] = tasks.map((t) => ({
      ...t,
      tags: parseTagsFromDb(t.tags),
      steps: stepsByTaskId[t.id] || [],
    }));

    return jsonResponse({ tasks: formattedTasks, user }, 200);
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse(
      { error: "Internal server error", details: String(err) },
      500
    );
  }
}
