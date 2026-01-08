import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/tasks/[id]/done - Marcar task como concluída
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to mark task as done", details: error },
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
