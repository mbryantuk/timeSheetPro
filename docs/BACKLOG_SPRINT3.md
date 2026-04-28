# TimeSheetPro - Sprint 3 Backlog (UI Overhaul)

## Goal
Replace the EJS-based UI with a modern, reactive React/Tailwind frontend to provide a professional, highly usable interface for the Solution Architect persona, incorporating all requested features.

## Sprint 3 Plan

### Task 3.1: Frontend Scaffolding (Dev)
- Initialize React project using Vite.
- Configure Tailwind CSS.
- Setup routing (e.g., react-router-dom) for navigation.
- Implement sidebar navigation layout with clear "Architect" aesthetics.

### Task 3.2: Dashboard Core (Dev)
- **Pending Drafts:** Editable cards with task selection dropdowns.
- **Weekly Export:** Professional data table for end-of-week entry.
- **Task Management:** Table view of imported Klient tasks (Project Name, Task Name, Owner, Status, etc.).
- **Live Activity Feed:** Expandable rows showing time, process, window title, OCR text, and a modal viewer for screenshots.

### Task 3.3: AI & Status Monitoring (Dev)
- **AI Personality Editor:** Large, high-visibility text area for managing system prompts.
- **Status Monitoring:** Real-time AI status indicators (e.g., "Summarizing...", "Idle").
- **Manual Summary Trigger:** Input field for hours ago + trigger button + clear progress status.
- **Abort Switch:** "Cancel AI Summary" button for active summarization jobs.
- **Sensor Indicator:** Real-time network status indicator for the Windows client sensor.
- **Ollama Hardware Monitor:** Tab displaying loaded models, VRAM usage, and expiry times.

### Task 3.4: Packaging & Integration (Architect)
- Integrate frontend build with server (Vite build -> serve static assets).
- Ensure 100% responsiveness and full-width layout (remove max-width constraints).
- Remove deprecated/cluttering views and enforce sidebar navigation.

---

## User Stories for Sprint 3
- **STORY-3.1:** High-performance, full-width dashboard with vertical sidebar navigation.
- **STORY-3.2:** "Snappy" reactive UI; no page reloads when approving/syncing.
- **STORY-3.3:** Professional dark mode theme with expandable screenshot/OCR viewing and data tables.
- **STORY-3.4:** Real-time monitoring of AI activity, model memory status, and sensor heartbeat connectivity.
- **STORY-3.5:** Ability to trigger/cancel manual summaries for arbitrary time ranges with clear status feedback.
