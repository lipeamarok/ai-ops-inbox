import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// Schema de validação para atualizar task
const UpdateTaskSchema = z.object({
  request_raw: z.string().min(1).optional(),
  title_enhanced: z.string().min(1).optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  next_action: z.string().optional(),
  status: z.string().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Buscar task específica
export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !task) {
      return NextResponse.json(
        { error: "Task not found", details: error },
        { status: 404 }
      );
    }

    // Buscar steps
    const { data: steps } = await supabase
      .from("task_steps")
      .select("*")
      .eq("task_id", id)
      .order("step_order", { ascending: true });

    return NextResponse.json({
      task: { ...task, steps: steps ?? [] },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Atualizar task
export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = UpdateTaskSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update task", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Deletar task
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete task", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
