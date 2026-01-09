import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserId, parseTagsFromDb } from "@/lib/user-utils";
import { supabaseAdmin } from "@/lib/supabase-server";

// Schema de validação para mensagem do chat
const ChatSchema = z.object({
  identifier: z.string().min(1, "identifier is required"),
  message: z.string().min(1, "message is required"),
});

// Helper para formatar task para exibição no chat
function formatTaskForChat(task: { 
  id: string; 
  request_raw: string; 
  title_enhanced?: string | null;
  status: string;
  priority?: string;
}): string {
  const title = task.title_enhanced || task.request_raw;
  const status = task.status === "done" ? "✅" : "⏳";
  const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : "";
  return `${status}${priority} ${title}\n   ID: \`${task.id.slice(0, 8)}...\``;
}

// Processar comandos localmente (fallback)
async function processLocalCommand(
  message: string,
  userId: string,
  identifier: string
): Promise<{ reply: string; handled: boolean; taskCreated?: boolean }> {
  const lowerMessage = message.toLowerCase().trim();

  // Comando: list
  if (lowerMessage === "list" || lowerMessage === "listar" || lowerMessage === "tasks") {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, request_raw, title_enhanced, status, priority")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!tasks || tasks.length === 0) {
      return {
        reply: "📭 You don't have any tasks yet. Try adding one with: **add: your task description**",
        handled: true,
      };
    }

    const taskList = tasks.map(formatTaskForChat).join("\n\n");
    return {
      reply: `📋 **Your recent tasks:**\n\n${taskList}`,
      handled: true,
    };
  }

  // Comando: add
  if (lowerMessage.startsWith("add:") || lowerMessage.startsWith("adicionar:")) {
    const taskText = message.replace(/^(add:|adicionar:)\s*/i, "").trim();
    
    if (!taskText) {
      return {
        reply: "❓ What task would you like to add? Try: **add: your task description**",
        handled: true,
      };
    }

    const { data: newTask, error } = await supabaseAdmin
      .from("tasks")
      .insert([{
        user_id: userId,
        user_key: identifier,
        request_raw: taskText,
        source: "chat",
        status: "open",
      }])
      .select("id")
      .single();

    if (error || !newTask) {
      return {
        reply: "❌ Sorry, I couldn't create that task. Please try again.",
        handled: true,
      };
    }

    // Trigger n8n enrichment (fire-and-forget)
    const n8nTaskUrl = process.env.N8N_TASK_WEBHOOK_URL;
    if (n8nTaskUrl) {
      fetch(n8nTaskUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: newTask.id,
          identifier,
          request_raw: taskText,
          source: "chat",
          app_base_url: process.env.APP_BASE_URL || "https://ai-ops-inbox.vercel.app",
        }),
      }).catch(() => {});
    }

    return {
      reply: `✅ Task created! I'll enhance it with AI shortly.\n\n📝 "${taskText}"`,
      handled: true,
      taskCreated: true,
    };
  }

  // Comando: done
  const doneMatch = message.match(/^(done|concluir|complete)[:\s]+([a-f0-9-]+)/i);
  if (doneMatch) {
    const taskIdPartial = doneMatch[2].trim();
    
    // Buscar task que começa com o ID parcial
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, request_raw, title_enhanced")
      .eq("user_id", userId)
      .ilike("id", `${taskIdPartial}%`)
      .limit(1);

    if (!tasks || tasks.length === 0) {
      return {
        reply: `❓ I couldn't find a task starting with "${taskIdPartial}". Use **list** to see your tasks.`,
        handled: true,
      };
    }

    const task = tasks[0];
    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) {
      return {
        reply: "❌ Sorry, I couldn't mark that task as done. Please try again.",
        handled: true,
      };
    }

    return {
      reply: `🎉 Great job! Task marked as complete:\n\n✅ "${task.title_enhanced || task.request_raw}"`,
      handled: true,
    };
  }

  // Comando: help
  if (lowerMessage === "help" || lowerMessage === "ajuda") {
    return {
      reply: `🤖 **Here's what I can do:**

• **add: [task]** - Create a new task
• **list** - Show your recent tasks  
• **done: [task_id]** - Mark a task complete

Or just chat with me naturally! I'll do my best to help. 💬`,
      handled: true,
    };
  }

  // Não é um comando conhecido
  return { reply: "", handled: false };
}

// POST /api/chat - Enviar mensagem para n8n chatbot
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = ChatSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolver usuário
    const user = await resolveUserId(parsed.data.identifier);
    const message = parsed.data.message;

    // Primeiro, tentar processar comandos localmente
    const localResult = await processLocalCommand(message, user.id, user.identifier);
    
    if (localResult.handled) {
      return NextResponse.json({
        reply: localResult.reply,
        taskCreated: localResult.taskCreated || false,
      });
    }

    // Se não é um comando, enviar para n8n (para resposta com IA)
    const n8nUrl = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!n8nUrl) {
      // Sem n8n configurado, dar resposta amigável
      return NextResponse.json({
        reply: `I understood your message, but I'm not sure how to help with that yet. 🤔

Try one of these commands:
• **add: [task]** - Create a task
• **list** - See your tasks
• **help** - Show all commands`,
      });
    }

    // Chamar webhook do n8n para resposta com IA
    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        identifier: user.identifier,
        message: message,
        app_base_url: process.env.APP_BASE_URL || "https://ai-ops-inbox.vercel.app",
      }),
    });

    if (!resp.ok) {
      console.error("n8n webhook error:", resp.status, resp.statusText);
      return NextResponse.json({
        reply: "I'm having trouble connecting to my AI brain right now. 🧠💤 Try a command like **list** or **add: your task**.",
      });
    }

    const data = await resp.json().catch(() => ({}));
    
    // Verificar se n8n retornou uma resposta válida
    const reply = data.reply ?? data.message ?? data.output ?? data.text;
    
    if (!reply || reply === "Command processed successfully.") {
      // n8n não retornou resposta útil, dar fallback amigável
      return NextResponse.json({
        reply: `I received your message! 📩 However, I'm still learning to answer questions like that.

For now, try these commands:
• **add: [task]** - Create a task
• **list** - See your tasks
• **done: [id]** - Complete a task`,
      });
    }

    return NextResponse.json({ reply, raw: data });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({
      reply: "Oops! Something went wrong. 😅 Please try again.",
    });
  }
}
