export interface Task {
  id: string;
  user_key: string;
  source: string;
  request_raw: string;
  title_enhanced: string | null;
  priority: string;
  tags: string[];
  next_action: string | null;
  status: string;
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface EnrichmentPayload {
  title_enhanced: string;
  priority: "low" | "medium" | "high";
  tags: string[];
  next_action?: string;
  steps: string[];
}
