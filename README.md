<div align="center">

# FlowCraft

**Visual workflow automation — design, execute, and monitor multi-step workflows from your browser.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.5-764ABC?style=flat&logo=redux&logoColor=white)](https://redux-toolkit.js.org)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/github/license/pradhankukiran/visual-workflow-builder?style=flat)](LICENSE)

[Live Demo](https://visual-workflow-builder-sable.vercel.app) &bull; [Report Bug](https://github.com/pradhankukiran/visual-workflow-builder/issues) &bull; [Request Feature](https://github.com/pradhankukiran/visual-workflow-builder/issues)

<br />

https://github.com/user-attachments/assets/placeholder

</div>

---

## About

FlowCraft is a browser-based workflow automation platform with a drag-and-drop canvas for building complex pipelines. Connect triggers, logic nodes, and actions into directed graphs that execute in topological order — with conditional branching, loops, retries, and real-time progress tracking.

### Key Features

- **Visual Canvas** — Drag-and-drop workflow editor powered by React Flow with snap-to-grid, auto-layout, and live connection validation
- **14 Node Types** — HTTP requests, conditional branches, loops, delays, JavaScript code execution, JSON transforms, variables, webhooks, scheduled triggers, LLM integration, and more
- **Dual Execution Engine** — Run workflows client-side for instant feedback or server-side via Vercel Serverless Functions for production reliability
- **Real-Time Execution** — Watch nodes light up as they execute with live logs, timing data, and output inspection
- **Workflow Library** — Save, version, and reuse workflow templates across projects
- **Webhook & Schedule Triggers** — Start workflows from external HTTP calls or on a cron schedule
- **Credential Management** — Securely store and inject API keys and tokens into workflow nodes
- **Authentication** — User auth with Clerk, scoped workflows and execution history per user

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Redux Toolkit, RTK Query, Tailwind CSS 4 |
| **Workflow Canvas** | React Flow (`@xyflow/react`) |
| **Build** | Vite 6 |
| **Backend** | Vercel Serverless Functions (Node.js) |
| **Database** | Upstash Redis |
| **Queue** | Upstash QStash + Upstash Workflow |
| **Auth** | Clerk |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Canvas   │  │  Redux   │  │  Client Engine    │  │
│  │ (xyflow)  │  │  Store   │  │  (WorkflowExec)   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │ RTK Query
                     ▼
┌─────────────────────────────────────────────────────┐
│              Vercel Serverless API                    │
│  /api/workflows  /api/executions  /api/webhooks      │
│  /api/proxy      /api/schedules   /api/credentials   │
│  ┌───────────────────────────────────────────────┐   │
│  │         Server Execution Engine               │   │
│  │  (isolated, no React/Redux dependencies)      │   │
│  └───────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
     ┌────────┐ ┌────────┐ ┌───────┐
     │ Upstash│ │ QStash │ │ Clerk │
     │ Redis  │ │        │ │       │
     └────────┘ └────────┘ └───────┘
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- Accounts for [Vercel](https://vercel.com), [Upstash](https://upstash.com), and [Clerk](https://clerk.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/pradhankukiran/visual-workflow-builder.git
cd visual-workflow-builder

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Clerk, Upstash Redis, and QStash credentials

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `QSTASH_TOKEN` | QStash token for scheduled workflows |

## Node Types

| Node | Description |
|---|---|
| **Webhook Trigger** | Start workflows from external HTTP requests |
| **Schedule Trigger** | Run workflows on a cron schedule |
| **HTTP Request** | Make API calls with configurable method, headers, and body |
| **JSON Transform** | Transform data with JSONPath expressions |
| **Conditional Branch** | Route execution based on conditions |
| **Loop** | Iterate over arrays or repeat N times |
| **Merge** | Combine outputs from parallel branches |
| **Delay** | Pause execution for a specified duration |
| **Code** | Execute custom JavaScript with access to node inputs |
| **Variable Set / Get** | Store and retrieve workflow variables |
| **Console Output** | Log data for debugging |
| **LLM** | Integrate language model calls into workflows |

## Project Structure

```
├── api/                    # Vercel Serverless Functions
│   ├── _lib/               # Shared server utilities
│   │   └── engine/         # Server-side execution engine
│   ├── credentials/        # Credential management API
│   ├── executions/         # Execution history API
│   ├── webhooks/           # Webhook receiver endpoints
│   ├── workflows/          # Workflow CRUD API
│   └── proxy.ts            # HTTP proxy with SSRF protection
├── src/
│   ├── app/                # Redux store configuration
│   ├── components/         # Shared UI components
│   ├── engine/             # Client-side execution engine
│   ├── features/           # Feature modules
│   │   ├── workflow/       # Canvas, nodes, edges
│   │   ├── execution/      # Run & monitor workflows
│   │   ├── credentials/    # Secret management
│   │   ├── versions/       # Workflow versioning
│   │   └── workflowLibrary/ # Template library
│   ├── hooks/              # Custom React hooks
│   └── types/              # Shared TypeScript types
└── vercel.json             # Vercel deployment config
```

## Deployment

The app deploys to **Vercel** with zero configuration:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set your environment variables in the Vercel dashboard under **Settings > Environment Variables**.

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

**[FlowCraft](https://visual-workflow-builder-sable.vercel.app)** — Built with React Flow, Redux Toolkit, and Vercel Serverless

</div>
