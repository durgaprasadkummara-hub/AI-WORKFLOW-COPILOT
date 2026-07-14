# AI Workflow Copilot Backend

A production-inspired backend for an AI workflow automation platform. This service provides:

- REST APIs for workflow creation, updates, validation, explanation, and conversation-driven edits.
- Real-time task event streams via Server-Sent Events.
- Workflow persistence with version history and extensible node catalogs.
- AI orchestration with provider adapters and recoverable validation.
- A task queue abstraction for long-running AI-generated workflow jobs.

## Architecture

- `src/api`: Express routers and realtime endpoints.
- `src/controllers`: Request handling and orchestration.
- `src/services`: Business logic and AI orchestration.
- `src/repositories`: Persistence access for workflows, conversations, nodes, and tasks.
- `src/lib`: Shared utilities, provider adapters, validation, and queue management.
- `prisma`: Database schema and seed script.

## Getting Started

1. Copy `.env.example` to `.env` and set your values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client and migrate schema:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Health Check

Once the backend is running, verify it with one of the following:

- curl:
  ```bash
  curl http://localhost:4000/
  ```
- npm script:
  ```bash
  npm run health-check
  ```

## API Highlights

- `POST /api/workflows`: create workflow from prompt or body.
- `PATCH /api/workflows/:workflowId`: apply AI edits or updates.
- `GET /api/workflows/:workflowId`: get workflow data.
- `GET /api/workflows/:workflowId/explain`: explain the workflow.
- `POST /api/conversations`: start conversation.
- `POST /api/conversations/:id/messages`: send a message.
- `POST /api/workflows/async`: enqueue async workflow generation.
- `GET /api/tasks/:taskId`: inspect task status and result.
- `GET /api/realtime/tasks/:taskId/subscribe`: subscribe to task progress events.
- `GET /api/nodes`: fetch available node definitions.

## Reliability and Extensibility

- All AI-generated workflow mutations are validated before persistence.
- The node catalog is dynamic and can be extended at runtime via persistence.
- AI provider adapters are pluggable.
- Task processing is asynchronous with status tracking and event streaming.
