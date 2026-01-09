import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolveUserId, isValidUUID } from "@/lib/user-utils";

interface RouteContext {
  params: Promise<{ id: string; stepId: string }>;
}

// ============================================
// PATCH /api/tasks/[id]/steps/[stepId] - Toggle step done
// ============================================

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id: taskId, stepId } = await context.params;
    const url = new URL(req.url);
    let identifier = url.searchParams.get("identifier");

    // Também aceitar identifier no body
    if (!identifier) {
      const json = await req.json().catch(() => null);
      identifier = json?.identifier;
    }

    if (!identifier) {
      return NextResponse.json(
        { error: "identifier is required (query param or body)" },
        { status: 400 }
      );
    }

    if (!isValidUUID(taskId) || !isValidUUID(stepId)) {
      return NextResponse.json(
        { error: "Invalid task ID or step ID format" },
        { status: 400 }
      );
    }

    const user = await resolveUserId(identifier);

    // Verificar se a task pertence ao usuário
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Buscar status atual do step
    const { data: currentStep, error: stepError } = await supabaseAdmin
      .from("task_steps")
      .select("done")
      .eq("id", stepId)
      .eq("task_id", taskId)
      .single();

    if (stepError || !currentStep) {
      return NextResponse.json(
        { error: "Step not found" },
        { status: 404 }
      );
    }

    // Toggle done status
    const newDone = !currentStep.done;

    const { data: updatedStep, error: updateError } = await supabaseAdmin
      .from("task_steps")
      .update({ done: newDone })
      .eq("id", stepId)
      .eq("task_id", taskId)
      .select("*")
      .single();

    if (updateError || !updatedStep) {
      return NextResponse.json(
        { error: "Failed to update step", details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({ step: updatedStep }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
