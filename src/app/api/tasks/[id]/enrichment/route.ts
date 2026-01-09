import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isValidUUID } from "@/lib/user-utils";

// Schema de validação para enriquecimento
const EnrichmentSchema = z.object({
  title_enhanced: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  tags: z.array(z.string()).default([]),
  next_action: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1).max(12),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_METHODS = "POST, PUT, OPTIONS";

async function handleEnrichment(req: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();

  try {
    const { id: taskId } = await context.params;

    // Validar UUID
    if (!isValidUUID(taskId)) {
      return NextResponse.json(
        { error: "Invalid task id format", request_id: requestId },
        { status: 400 }
      );
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json(
        { error: "Invalid enrichment body", request_id: requestId },
        { status: 400 }
      );
    }

    const rawSteps = Array.isArray(json.steps) ? json.steps : [];
    const normalizedSteps = rawSteps
      .map((step: unknown) => (typeof step === "string" ? step.trim() : ""))
      .filter((step: string) => step.length > 0);
    const normalizedPayload = { ...json, steps: normalizedSteps };

    console.log("Enrichment received for task:", taskId, { requestId });

    const parsed = EnrichmentSchema.safeParse(normalizedPayload);

    if (!parsed.success) {
      console.error("Enrichment validation failed:", {
        requestId,
        details: parsed.error.flatten(),
      });
      return NextResponse.json(
        {
          error: "Invalid enrichment body",
          details: parsed.error.flatten(),
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    const { title_enhanced, priority, tags, next_action, steps } = parsed.data;

    // Atualizar a task com dados enriquecidos (tags já é array)
    const { data: task, error: taskErr } = await supabaseAdmin
      .from("tasks")
      .update({
        title_enhanced,
        priority,
        tags, // Banco usa TEXT[], enviamos array diretamente
        next_action,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (taskErr || !task) {
      console.error("Failed to update task:", {
        requestId,
        code: taskErr?.code,
        details: taskErr,
      });
      return NextResponse.json(
        { error: "Failed to update task", request_id: requestId },
        { status: 500 }
      );
    }

    // Deletar steps antigos e inserir novos
    await supabaseAdmin.from("task_steps").delete().eq("task_id", taskId);

    const stepsPayload = steps.map((stepText, idx) => ({
      task_id: taskId,
      step_order: idx + 1,
      step_text: stepText,
      done: false,
    }));

    const { error: stepsErr } = await supabaseAdmin
      .from("task_steps")
      .insert(stepsPayload);

    if (stepsErr) {
      console.error("Failed to insert steps:", {
        requestId,
        code: stepsErr?.code,
        details: stepsErr,
      });
      return NextResponse.json(
        { error: "Failed to insert steps", request_id: requestId },
        { status: 500 }
      );
    }

    // Buscar steps inseridos
    const { data: insertedSteps } = await supabaseAdmin
      .from("task_steps")
      .select("*")
      .eq("task_id", taskId)
      .order("step_order", { ascending: true });

    console.log("Enrichment completed for task:", taskId, { requestId });

    // Retornar task completo com steps
    return NextResponse.json({
      ok: true,
      task_id: taskId,
      task: {
        ...task,
        tags: task.tags || [], // Já vem como array do banco
        steps: insertedSteps || [],
      },
    });
  } catch (err) {
    console.error("Unexpected error:", { requestId, err });
    return NextResponse.json(
      { error: "Internal server error", request_id: requestId },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/enrichment - Receber enriquecimento do n8n
export async function POST(req: Request, context: RouteContext) {
  return handleEnrichment(req, context);
}

// PUT /api/tasks/[id]/enrichment - Aceitar fallback de método do n8n
export async function PUT(req: Request, context: RouteContext) {
  return handleEnrichment(req, context);
}

// OPTIONS /api/tasks/[id]/enrichment - Preflight (quando aplicável)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: ALLOWED_METHODS,
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
