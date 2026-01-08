# AI Ops Inbox 🚀

> Transform messy requests into actionable tasks with AI-powered enhancement

A modern task management application that uses AI to automatically enhance your tasks with better titles, priority levels, relevant tags, and step-by-step breakdowns.

![AI Ops Inbox](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![n8n](https://img.shields.io/badge/n8n-Automation-EA4B71?style=flat-square&logo=n8n)

## ✨ Features

- **AI-Enhanced Tasks**: When you add a task, AI automatically generates:
  - Clear, actionable title
  - Priority level (low/medium/high)
  - Relevant tags
  - Next action suggestion
  - Step-by-step breakdown

- **CRUD Operations**: Full task management
  - ✅ Create tasks
  - ✏️ Edit tasks
  - ✔️ Mark as complete
  - 🗑️ Delete tasks

- **Chatbot Interface**: Manage tasks via conversational commands
  - `add: [task]` - Create a new task
  - `list` - Show recent tasks
  - `done: [task_id]` - Mark complete

- **Persistent Storage**: All data stored in Supabase (PostgreSQL)

- **Real-time Updates**: Polling for AI enrichment updates

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (Vercel)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   UI ToDo   │  │  UI Chat    │  │      API Routes         │  │
│  │   List      │  │  Bot        │  │  /api/tasks             │  │
│  └─────────────┘  └─────────────┘  │  /api/tasks/[id]        │  │
│                                     │  /api/tasks/[id]/done   │  │
│                                     │  /api/tasks/[id]/enrich │  │
│                                     │  /api/chat              │  │
│                                     └───────────┬─────────────┘  │
└─────────────────────────────────────────────────┼───────────────┘
                      │                           │
         ┌────────────┴────────────┐              │
         ▼                         ▼              ▼
┌─────────────────┐      ┌─────────────────┐    ┌─────────────────┐
│   SUPABASE      │      │    n8n Cloud    │    │   OpenAI API    │
│   (PostgreSQL)  │◄─────│   (Workflows)   │───►│   (GPT-4o-mini) │
│   - tasks       │      │   - Enrichment  │    └─────────────────┘
│   - task_steps  │      │   - Chat Bot    │
└─────────────────┘      └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- n8n cloud account
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ai-ops-inbox.git
cd ai-ops-inbox
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema (see below)
3. Copy your project URL and anon key

### 3. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `N8N_TASK_WEBHOOK_URL` - n8n webhook for task enrichment
- `N8N_CHAT_WEBHOOK_URL` - n8n webhook for chatbot
- `APP_BASE_URL` - Your app URL (localhost or Vercel)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  source text not null default 'web',
  request_raw text not null,
  title_enhanced text,
  priority text default 'medium',
  tags text[] default array[]::text[],
  next_action text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task steps table
create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_order int not null,
  step_text text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tasks_user_key on public.tasks(user_key);
create index if not exists idx_steps_task_id on public.task_steps(task_id);

-- Auto-update timestamp trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
```

**Important:** Disable RLS for testing (Table Editor → tasks → RLS: OFF)

## 🔧 n8n Workflows

### Workflow A: Task Enrichment

**Trigger:** Webhook `POST /webhook/task-created`

**Flow:**
1. Receive task data (task_id, request_raw, app_base_url)
2. Call OpenAI to generate enhanced task data
3. POST result to `/api/tasks/{task_id}/enrichment`

**OpenAI Prompt:**
```
You are an assistant that converts raw task requests into actionable tasks.
Return ONLY valid JSON with:
- title_enhanced: clear, actionable title
- priority: low, medium, or high
- tags: 2-6 relevant tags
- next_action: immediate next step
- steps: 3-7 actionable steps
```

### Workflow B: Chatbot

**Trigger:** Webhook `POST /webhook/chat`

**Flow:**
1. Receive message and user_key
2. Parse command (add:/list/done:)
3. Call appropriate API endpoint
4. Return response

## 📁 Project Structure

```
ai-ops-inbox/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts          # GET/POST tasks
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # GET/PUT/DELETE task
│   │   │   │       ├── done/
│   │   │   │       │   └── route.ts  # PATCH mark done
│   │   │   │       └── enrichment/
│   │   │   │           └── route.ts  # POST enrichment
│   │   │   └── chat/
│   │   │       └── route.ts          # POST chat message
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Main app page
│   │   └── globals.css
│   ├── components/
│   │   ├── AddTaskForm.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskList.tsx
│   │   └── UserKeyInput.tsx
│   ├── lib/
│   │   └── supabase.ts
│   └── types/
│       └── index.ts
├── .env.example
├── .env.local
├── package.json
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks?user_key=...` | List user's tasks |
| `POST` | `/api/tasks` | Create new task |
| `GET` | `/api/tasks/:id` | Get single task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `PATCH` | `/api/tasks/:id/done` | Mark task complete |
| `POST` | `/api/tasks/:id/enrichment` | Receive AI enrichment |
| `POST` | `/api/chat` | Send chat command |

## 🚢 Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

After first deploy, update `APP_BASE_URL` with your Vercel URL.

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Automation:** n8n
- **AI:** OpenAI GPT-4o-mini
- **Hosting:** Vercel

## 📝 License

MIT

---

Built with ❤️ for the AI Automation Developer Challenge
