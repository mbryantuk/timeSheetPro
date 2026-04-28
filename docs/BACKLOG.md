# TimeSheetPro - Project Backlog

## Personas
- **Product Owner (PO):** Focuses on user value, Klient/Salesforce compatibility, and reducing manual effort.
- **Architect:** Focuses on system stability, local privacy (Ollama/SQLite), and cross-platform communication (C# <-> Node).
- **Developer:** Focuses on implementation details, UI/UX (WPF), and API reliability.

## Epic 1: Core Tracking & Data Model
*Goal: Establish the foundation for recording activities and mapping them to Klient hierarchies.*

- **STORY-1.1 (PO):** As a user, I want to define my Account > Project > Task hierarchy manually so that the tool knows where to assign my time.
- **STORY-1.2 (Architect):** As an architect, I want a robust SQLite schema to store raw activity logs and finalized timesheet entries locally.
- **STORY-1.3 (Dev):** As a developer, I want a Node.js API that receives heartbeat snapshots from the Windows client.

## Epic 2: Intelligent Activity Capture (The "Watcher")
*Goal: The Windows client needs to "see" what is happening without being intrusive.*

- **STORY-2.1 (PO):** As a user, I want the tool to capture my active window title and process name so I don't have to remember what I did.
- **STORY-2.2 (Architect):** As an architect, I want to use native `Windows.Media.Ocr` to extract text from screenshots periodically to provide high-fidelity context for the AI.
- **STORY-2.3 (Dev):** As a developer, I want a background service in C# that monitors window focus changes and reports them to the local server.

## Epic 3: AI-Powered Summarization
*Goal: Transform raw logs into professional Klient comments.*

- **STORY-3.1 (PO):** As a user, I want the AI to write a professional "Comment" for my timesheet entry based on the apps I used and the text on my screen.
- **STORY-3.2 (Architect):** As an architect, I want a prompt engineering strategy for Ollama that ensures outputs are consistent with Salesforce/Klient length and tone constraints.

## Epic 4: The UI (Floating Widget & Taskbar)
*Goal: A low-friction way to interact with the tool.*

- **STORY-4.1 (PO):** As a user, I want a floating widget that I can pin to my vertical monitor to see my current active task at a glance.
- **STORY-4.2 (Dev):** As a developer, I want to investigate "DeskBand" or "Taskbar Extensions" to see if a battery-style indicator is feasible on modern Windows.
- **STORY-4.3 (PO):** As a user, I want to manually override or switch tasks via the widget if the AI's "best guess" is wrong.

## Sprint 1 Plan (The Foundation)
### Task 1.0: Infrastructure - Git & Monorepo (Done)
- Initialize Git repository.
- Create comprehensive `.gitignore` for Node and C#.
- Setup directory structure (`/server`, `/client`).

### Task 1.1: Backend - Klient Data Model (Done)
- Create `accounts`, `projects`, and `tasks` tables in SQLite (matching `Krow__` fields).
- Implement API endpoints for CRUD on the hierarchy.
- Add `SalesforceService` for OAuth and `Krow__Timesheet_Split__c` sync.

### Task 1.2: Client - The "Watcher" Service (Done)
- Scaffolding .NET 9 WPF application.
- Implement `ActiveWindowListener` using Win32 `GetForegroundWindow`.
- Periodic screenshot capture (in-memory only) for OCR.

### Task 1.3: Client - Native OCR (Done)
- Integrate `Windows.Media.Ocr`.
- Implement a debounced OCR processor.

### Task 1.4: Backend - Ollama Integration (Done)
- Create the "Klient Comment" prompt template.
- Implement the batching logic to send 1 hour of activity to Ollama.

### Task 1.5: Testing - CI & Unit Tests (Done)
- Setup Jest for the Node.js backend.
- Setup xUnit for the C# client.
- Create an "Activity Mock" script to simulate 8 hours of work for testing the summarizer.

### Task 1.6: Release - Phase 1 Alpha (Done)
- Script to start both Backend and Client in "Dev Mode".
- README instructions for local setup.
- Build the web UI dashboard for reviewing and assigning drafts.

## Sprint 2 Plan (Integration & Automation)
### Task 2.1: Salesforce OAuth & Sync (Dev)
- Implement Salesforce OAuth 2.0 flow.
- Securely store access tokens.
- Implement the actual POST request in `SalesforceService` to sync approved entries to Klient.

### Task 2.2: Refine the UI (Dev)
- Improve the Web Dashboard to show sync status (Draft, Synced, Error).
- Add error handling and user feedback for failed syncs.

### Task 2.3: Packaging (Architect)
- Create a simple script or GitHub action to package the Windows Client into a downloadable `.zip` or `.exe`.
