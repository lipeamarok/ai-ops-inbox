// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  identifier: string;
  display_name: string | null;
  created_at: string;
}

// ============================================
// Task Types
// ============================================

export interface Task {
  id: string;
  user_id: string;
  user_key?: string; // Legado, mantido para compatibilidade
  source: string;
  request_raw: string;
  title_enhanced: string | null;
  priority: "low" | "medium" | "high";
  tags: string[]; // No frontend sempre é array
  next_action: string | null;
  status: "open" | "done";
  created_at: string;
  updated_at: string;
  steps?: TaskStep[];
}

export interface TaskStep {
  id: string;
  task_id: string;
  step_order: number;
  step_text: string;
  done: boolean;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateTaskRequest {
  identifier: string;
  request_raw: string;
  source?: string;
}

export interface ResolveUserRequest {
  identifier: string;
}

export interface EnrichmentPayload {
  title_enhanced: string;
  priority: "low" | "medium" | "high";
  tags: string[];
  next_action?: string;
  steps: string[];
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  identifier: string;
  message: string;
}
