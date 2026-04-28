# TimeSheetPro

Automated timesheet generation using local AI (Ollama) and desktop activity monitoring.

## Project Vision
To eliminate the manual burden of timesheet logging by automatically capturing desktop activity, summarizing it via local LLMs, and preparing draft entries for review.

## Architecture
- **Server (Backend):** 
  - Manages the database of activities and timesheet entries.
  - Interfaces with the local Ollama server for summarizing activity logs.
  - Provides an API for the client and a potential web UI for review.
- **Client (Windows Agent):**
  - Lightweight background process.
  - Monitors active window titles, process names, and (optionally) browser URLs.
  - Periodically sends "heartbeats" or activity snapshots to the Server.
- **AI Integration:**
  - Uses Ollama (local) to transform raw activity logs into human-readable task descriptions.

## Tech Stack
- **Backend:** Node.js (Express)
- **Database:** SQLite (Local storage)
- **Windows Client:** C# (.NET Core / WPF)
- **AI:** Ollama (Local: http://10.10.1.168:11434/)
- **OCR:** Windows.Media.Ocr (Native .NET)

## Data Model (Klient/Salesforce Native)
We will align our local SQLite schema with Klient's `Krow__Timesheet_Split__c` object to simplify synchronization.
- **Project ID:** `Krow__Project__c` (Salesforce ID)
- **Task ID:** `Krow__Task__c` (Salesforce ID)
- **Resource ID:** `Krow__Project_Resource__c` (Salesforce ID)
- **Duration:** Decimal hours (`Krow__Hours__c`)
- **Comment:** Professional summary (`Krow__Notes__c`)

## Integration Strategy
- **Authentication:** Salesforce OAuth 2.0 (Stored securely in local system keychain, NOT in `.env`).
- **Sync Method:** POST to `/services/data/vXX.0/sobjects/Krow__Timesheet_Split__c/`.
- **Validation:** Ensure the `Krow__Date__c` matches the work day and falls within an open timesheet period.


## Key Workflows
1. **Context Selection:** The Windows Client allows the user to select the active **Account**, **Project**, and **Task** from a list (synced from Klient or defined locally).
2. **Activity Capture:** While a task is active, the client monitors metadata and OCR context.
3. **AI Summarization:** Ollama processes the raw activity into a professional "Comment" that fits the Klient format.
4. **Validation:** User reviews the AI-generated comment and confirms the time before it is finalized for Klient entry.

## Technical Architecture Deep Dive

### 1. Windows Client (WPF / .NET 9)
- **Floating Widget:** A `Window` with `Topmost="True"`, `WindowStyle="None"`, and `AllowsTransparency="True"`. It will detect the work area using `SystemParameters.WorkArea` to anchor itself to the portrait monitor.
- **Taskbar "Battery Bar" Integration:** 
  - Instead of a complex DeskBand (deprecated), we will use a slim (4-6px high) transparent window positioned at `WorkArea.Bottom`.
  - This "Status Bar" will glow with different colors to indicate tracking state (e.g., Green: Tracking, Pulse: AI Summarizing, Red: Paused).
  - Use `WS_EX_NOACTIVATE` and `WS_EX_TRANSPARENT` via Win32 `SetWindowLong` to ensure it doesn't steal focus or interfere with clicks.

### 2. OCR & Context Capture
- **Native OCR:** Use `Windows.Media.Ocr.OcrEngine`. This is high-performance and local.
- **Privacy Filter:** Implement a "Sensitive Window" list (e.g., banking apps, private chats) where OCR and screenshots are automatically disabled.

### 3. Ollama Prompting (PO Requirement)
- **Klient Persona Prompt:**
  ```text
  You are an expert project manager. Transform these activity logs into a Klient-compatible timesheet comment. 
  Format: "[Task Category] Brief professional description of work performed."
  Constraints: No fluff, max 200 characters, use professional verbs (e.g., 'Analyzed', 'Developed', 'Coordinated').
  ```

## Testing & Quality Assurance Plan
### 1. Unit & Integration Testing
- **Backend (Node.js):** Jest for API endpoint testing and database logic.
- **Client (C#):** xUnit for OCR logic, window title parsing, and API client verification.
- **Integration:** Mock server for the C# client to ensure it handles network failures and server restarts gracefully.

### 2. AI Validation (The "Golden Dataset")
- Create a collection of "Raw Activity vs. Expected Klient Comment" pairs.
- Periodically run these through Ollama to track "Summary Accuracy" and "Professional Tone" (preventing AI hallucinations).

### 3. End-to-End (E2E) Verification
- **Scenario:** Perform a specific 15-minute task (e.g., "Updating project documentation in VS Code").
- **Success Criteria:** Tool captures the activity, OCR extracts "documentation" context, and Ollama generates a comment like "[Admin] Updated project documentation and README."

## Source Control & Git Strategy
### 1. Repository Structure (Monorepo)
We will use a single repository to keep the Server and Client in sync.
- `/server`: Node.js Backend.
- `/client`: C# Windows Client.
- `/docs`: Architectural diagrams and meeting notes.

### 2. Branching Model (GitHub Flow)
- `main`: Production-ready, stable code.
- `feature/*`: Development branches for specific user stories (e.g., `feature/ocr-integration`).
- `fix/*`: Critical bug fixes.

### 3. Commit Conventions (Conventional Commits)
All commits should follow the format: `<type>: <description>`
- `feat`: New feature.
- `fix`: Bug fix.
- `docs`: Documentation changes.
- `chore`: Maintenance (e.g., dependency updates).

### 4. Safety & Privacy (GitIgnore)
Strict `.gitignore` policies to prevent leaking:
- `.env` files (server configuration).
- `*.sqlite` (local activity data).
- `bin/`, `obj/`, `.vs/` (C# build artifacts).
- `node_modules/` (Node.js dependencies).
