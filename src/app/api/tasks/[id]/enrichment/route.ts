import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

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

// POST /api/tasks/[id]/enrichment - Receber enriquecimento do n8n
export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;

    const json = await req.json().catch(() => null);
    console.log("Enrichment received for task:", taskId, json);

    const parsed = EnrichmentSchema.safeParse(json);

    if (!parsed.success) {
      console.error("Enrichment validation failed:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid enrichment body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title_enhanced, priority, tags, next_action, steps } = parsed.data;

    // Atualizar a task com dados enriquecidos
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .update({ title_enhanced, priority, tags, next_action })
      .eq("id", taskId)
      .select("*")
      .single();

    if (taskErr || !task) {
      console.error("Failed to update task:", taskErr);
      return NextResponse.json(
        { error: "Failed to update task", details: taskErr },
        { status: 500 }
      );
    }

    // Deletar steps antigos e inserir novos
    await supabase.from("task_steps").delete().eq("task_id", taskId);

    const stepsPayload = steps.map((stepText, idx) => ({
      task_id: taskId,
      step_order: idx + 1,
      step_text: stepText,
      done: false,
    }));

    const { error: stepsErr } = await supabase
      .from("task_steps")
      .insert(stepsPayload);

    if (stepsErr) {
      console.error("Failed to insert steps:", stepsErr);
      return NextResponse.json(
        { error: "Failed to insert steps", details: stepsErr },
        { status: 500 }
      );
    }

    console.log("Enrichment completed for task:", taskId);
    return NextResponse.json({ ok: true, task_id: taskId });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
