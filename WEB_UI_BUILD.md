# Web UI Build & Deployment Guide

## Overview
The TimeSheetPro web UI has been completely rebuilt with a modern React + Tailwind CSS stack, replacing the old EJS templates. The new UI provides a professional, responsive dashboard with all Sprint 3 features.

## Architecture

### Tech Stack
- **Frontend:** React 19 + Vite (build tool)
- **Styling:** Tailwind CSS v4
- **Bundling:** Vite with optimized production builds
- **Server Integration:** Express.js serves built static assets

### Directory Structure
```
web-ui/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Main navigation sidebar
│   │   ├── PendingDrafts.jsx    # Draft approval interface
│   │   ├── WeeklyExport.jsx     # Weekly timesheet export table
│   │   ├── TaskManagement.jsx   # Task CRUD + CSV import
│   │   ├── ActivityFeed.jsx     # Live activity display with OCR
│   │   ├── AISettings.jsx       # AI prompt editor & manual triggers
│   │   ├── SystemMonitor.jsx    # Hardware & status monitoring
│   │   └── Dashboard.jsx        # Main router component
│   ├── index.css               # Tailwind styles + components
│   ├── main.jsx                # React entry point
│   └── App.jsx                 # App wrapper
├── index.html                  # HTML template
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
└── dist/                      # Built static assets (generated)

server/
└── Serves web-ui/dist/ as static files
```

## Building the Web UI

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Development Build
```bash
cd web-ui
npm install
npm run dev
```
This starts a local Vite dev server with hot reload on `http://localhost:5173`.

### Production Build
```bash
cd web-ui
npm install
npm run build
```
This creates optimized static files in `web-ui/dist/`.

## Server Integration

The Express server (`server/index.js`) has been updated to:
1. Serve static assets from `web-ui/dist/`
2. Fallback to old EJS UI if dist doesn't exist (backward compatibility)
3. Provide API endpoints required by the new UI

### Required API Endpoints
The following endpoints are used by the new UI and must be implemented:

- **GET /api/drafts** - List pending draft timesheet entries
- **PUT /api/drafts/:id/approve** - Approve a draft with task assignment
- **GET /api/tasks** - List all available tasks
- **POST /api/tasks** - Create a new task
- **POST /api/tasks/import/csv** - Bulk import tasks from CSV
- **GET /api/exports** - Get approved timesheet entries (grouped)
- **GET /api/activities** - Get raw activity logs
- **GET /api/ai-status** - Get current AI summarization status
- **GET /api/ollama-ps** - Get Ollama server hardware metrics
- **POST /api/abort-summary** - Cancel active AI summarization
- **POST /api/ai-prompt** - Save/update AI system prompt
- **GET /api/ai-prompt** - Retrieve current AI prompt
- **POST /api/summarize-manual** - Trigger manual summarization for specific hours

### Serving the UI
```bash
cd server
npm install
npm start
```
The UI will be available at `http://localhost:3000/`

## Docker Deployment

The server includes a Dockerfile that automatically builds and serves the web UI.

### Build & Run
```bash
docker compose up -d --build --force-recreate
```

This will:
1. Install dependencies
2. Build the React UI (`npm run build` in web-ui/)
3. Start the Express server serving the built UI
4. Make it available on port 3000

### Important: Docker Rebuilds
After modifying:
- `web-ui/src/**/*` - web UI components
- `web-ui/package.json` - web UI dependencies
- `server/index.js` - API endpoints
- `.env` - environment variables

**You must rebuild the container:**
```bash
docker compose up -d --build --force-recreate
```

## UI Features

### 1. Pending Drafts
- View AI-generated draft timesheet entries
- Edit notes before approval
- Select/assign tasks to drafts
- One-click approval

### 2. Weekly Export
- Professional data table of approved entries
- Grouped by project/task and date
- Copy-to-clipboard formatting for Salesforce Klient
- Summary statistics (total hours, entry count)

### 3. Task Management
- Import tasks from CSV (bulk)
- Manual task creation form
- View all tasks with metadata
- Status indicators

### 4. Activity Feed
- Real-time activity log display
- OCR text preview (expandable)
- Screenshot previewing with fullscreen modal
- Process/window title tracking

### 5. AI Settings
- Edit Ollama system prompt directly
- Manual summarization triggers with time range
- Cancel active summarization jobs
- Real-time AI status indicators

### 6. System Monitor
- Backend API status
- Windows client connection status
- Ollama server health metrics
- VRAM usage visualization
- Loaded models list
- GPU temperature (if available)
- Auto-refresh toggle

## Styling & Customization

All styles use Tailwind CSS utility classes. Key design patterns:

### Color Scheme
- **Background:** `bg-gray-950` (very dark blue-black)
- **Cards:** `bg-gray-900` with `border-gray-800`
- **Accent:** `blue-600` for primary actions
- **Text:** `text-gray-100` on dark backgrounds

### Reusable Components (in index.css)
```css
.btn-primary    /* Blue action button */
.btn-secondary  /* Gray secondary button */
.btn-danger     /* Red destructive button */
.card           /* Standard card component */
.input-field    /* Styled form input */
.label-text     /* Form label */
```

## Performance Optimizations

- **Code splitting:** Vite automatically code-splits components
- **Tree shaking:** Tailwind purges unused CSS (~25KB gzip)
- **Image optimization:** Vite handles asset inlining
- **Caching:** Static assets have content hashes in filenames

## Troubleshooting

### Build Fails with "Unknown at rule: @tailwind"
Ensure PostCSS config is correct and `@tailwindcss/postcss` is installed.

### Port 3000 Already in Use
Change `PORT` environment variable:
```bash
PORT=3001 npm start
```

### React/Vite Errors
Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Server Not Serving UI
Check that `web-ui/dist/` exists:
```bash
ls web-ui/dist/index.html
```
If missing, run `npm run build` in `web-ui/` directory.

## Development Workflow

1. **Make changes** to React components in `web-ui/src/`
2. **Test locally** with `npm run dev` in web-ui/
3. **Build for production** with `npm run build`
4. **Test with server** by running server locally or via Docker
5. **Commit both** React code and `web-ui/dist/` folder changes

## Future Enhancements

- [ ] Add real-time WebSocket updates for activity feed
- [ ] Implement dark/light mode toggle
- [ ] Add data export (CSV, PDF)
- [ ] Implement timesheet approval workflow
- [ ] Add user authentication/authorization
- [ ] Mobile responsive optimizations
