# TimeSheetPro: 50 Improvements Backlog (UX/UI Audit)

Based on the audit of the current codebase and your preferences for a **Manual Matrix**, **Rule-Based Categorization**, and **Web Dashboard Focus**, here is the 50-item improvement list categorized by impact.

---

### 🟢 Category A: Matrix & "Last-Mile" Export (Klient Alignment)
*Goal: Making the copy-paste into Salesforce Klient as frictionless as possible.*

1.  **Smart Row Formatting:** Format the "Copy to Excel" output specifically to match the Klient "Add Multiple Rows" clipboard format.
2.  **Billable Toggle on Matrix:** Add a column in the Weekly Matrix to toggle Billable/Non-Billable status for the whole row.
3.  **Color-Coded Billability:** Highlight non-billable rows (e.g., Internal/Admin) in light gray to distinguish them from client work.
4.  **Gap Detector:** Highlight cells in the matrix where daily totals are under 7.5 hours (or your standard day) to spot missing tracking.
5.  **Multi-Select Approve:** Add checkboxes to the "Pending Drafts" list to approve 20+ drafts at once.
6.  **Daily Note Concatenator:** Option to merge all notes for a single task/day into one bulleted list or a single professional paragraph.
7.  **Overtime Indicator:** Visual warning if a daily total exceeds 10 hours.
8.  **Holiday Overlay:** Integrate a bank holiday API to pre-fill or skip tracking for holidays.
9.  **Decimal Precision Toggle:** Switch between 2 decimal places (0.25) and minutes (15m) for review.
10. **Excel Template Download:** Generate a pre-formatted `.xlsx` file that matches the Klient import schema exactly.

### 🔵 Category B: Task Categorization & Rules
*Goal: Reducing the manual effort of selecting tasks for every draft.*

11. **Regex Pattern Rules:** Create a "Rules Manager" UI where you can map `Process: "Code.exe"` + `Title: "*ProjectX*"` -> `Task: "Development"`.
12. **Keyword Auto-Assign:** If a draft note contains a specific keyword (e.g., "Meeting"), auto-assign it to the "Internal Meetings" task.
13. **"Default Project" by Time:** Set a default project for specific hours of the day (e.g., 9:00-9:30 is always "Admin").
14. **Rule Impact Preview:** When creating a rule, show how many "Pending Drafts" it would have solved.
15. **URL-Based Rules:** If "github.com/org/repo" is in the activity, map it to a specific client project.
16. **Exclude List (Global):** A list of apps/titles that should *never* generate a draft (e.g., Spotify, Personal Email).
17. **Client/Project Pinning:** Pin your "Top 3" projects to the top of every selection list.
18. **Activity Clustering:** Group very short activities (under 2 mins) into a single "Misc Tasks" draft automatically.
19. **Conflict Resolution:** If two rules match a draft, provide a "Match Score" UI to show why one was picked.
20. **Rule Export/Import:** Backup your categorization rules to a JSON file.

### 🟡 Category C: Draft Review & Interaction Design
*Goal: Improving the speed of the "Review -> Approve" loop.*

21. **In-Line Note Editing:** Click directly on a note in the list to edit it without opening a modal or drawer.
22. **Hover OCR Preview:** Hover over a draft to see a small tooltip with the 5 most frequent OCR words captured during that hour.
23. **Keyboard Shortcuts:** `A` to approve, `E` to edit, `Esc` to cancel, `J/K` to navigate.
24. **Drag-and-Drop Tasking:** Drag a draft entry onto a "Project Sidebar" to assign it.
25. **Undo Action:** A 5-second "Undo" toast after approving a draft in case of a mistake.
26. **Split Draft:** A button to split a 1-hour draft into two 30-min entries for different tasks.
27. **Merge Drafts:** Select two drafts and merge them into a single entry with combined notes.
28. **Screenshot Gallery:** A lightbox view for the screenshots associated with a draft to verify work visually.
29. **Timeline View:** A visual "Day Timeline" (Gantt style) showing the gaps between tracked activities.
30. **Status Pulse:** A small "Live" indicator in the dashboard showing that the Windows Client is currently sending heartbeats.

### 🔴 Category D: Visual Polish & Aesthetics
*Goal: Making the tool feel modern, professional, and "alive".*

31. **Dark Mode Transitions:** Smooth CSS transitions when switching between components.
32. **Glassmorphism:** Use `backdrop-filter: blur` on sidebars and modals for a modern "Windows 11" feel.
33. **Micro-Animations:** Small bounce/scale effects on button clicks and hover states.
34. **Skeleton Loaders:** Use skeleton screens while fetching drafts instead of a generic spinning wheel.
35. **Custom Font:** Switch to a high-readability UI font like Inter or Segoe UI Variable.
36. **Empty State Illustrations:** Add stylized icons/graphics for the "All Caught Up" state.
37. **GPU Usage Graphs:** Beautiful SVG line charts for the System Monitor instead of raw numbers.
38. **Project Icons:** Support for small client logos or colored initials (Avatar style) in lists.
39. **Toast Notifications:** Professional notification system for success/error messages.
40. **Density Toggle:** A "Compact" vs "Comfortable" view toggle for the Matrix table.

### 🟣 Category E: Reliability & Maintenance
*Goal: Ensuring the data is accurate and the system is stable.*

41. **Database Vacuum:** Auto-run `VACUUM` on SQLite once a week to keep the file size small.
42. **OCR Confidence Filter:** Only show OCR text if the engine is >80% confident to reduce junk text.
43. **Auto-Backup:** Daily zip of the `timesheet.sqlite` file to a backup folder.
44. **Health Check API:** A dedicated endpoint for the UI to verify Ollama and the DB are responsive.
45. **Conflict Highlighting:** Mark entries that overlap in time with a red border.
46. **Export History:** A log of when "Copy to Excel" was clicked to track your submission history.
47. **Version Checker:** Check for updates to the Windows Client from the Dashboard.
48. **Environment Variable Editor:** A UI to change settings like `OLLAMA_MODEL` without touching `.env`.
49. **Log Viewer:** A "Developer" tab in the UI to see server logs for debugging.
50. **Onboarding Tour:** A 3-step "First Run" guide for new users to explain the flow.

### 🟠 Category F: Next-Gen UX & Dashboard (Expanded)
*Goal: Elevating the dashboard from a utility to a high-end command center.*

51. **Deep Linking to Activities:** Click a draft note to jump to the exact minute in the activity feed or timeline.
52. **AI "Draft Polisher":** A button to let AI rephrase a messy note into a professional Klient-ready bullet point.
53. **Contextual Help Tooltips:** Hover over metrics like "Ollama VRAM" to see explanations of how it impacts performance.
54. **Task Usage Heatmap:** A GitHub-style calendar heatmap showing activity intensity across the month.
55. **Sticky Matrix Headers:** Keep task names and dates visible while scrolling through long weekly lists.
56. **Tab Badging:** Use the browser Badging API to show the count of "Pending Drafts" directly on the tab icon.
57. **Bulk Edit Actions:** Select multiple drafts to batch-assign projects or append tags.
58. **Interactive "Journey" Map:** An SVG-based visual flow showing transitions between tasks throughout the day.
59. **Global Search:** A unified search bar to find past activities, tasks, or approved notes instantly.
60. **Accent Theme Picker:** Support for curated accent colors (e.g., "Cobolt Blue", "Emerald", "Cyberpunk Pink").

---

## 🎨 Immediate UX/UI Fixes (Identified during Audit)

- **Fix NaN Metrics:** Resolve `NaNGB / NaNGB` display in the System Monitor when hardware stats fail to load.
- **Status Sync:** Ensure "Client: Active" in the sidebar matches the "Windows Client" status in the health check.
- **Tailwind Integration:** Finalize the transition to Tailwind CSS to avoid broken layout issues on production builds.
- **Empty State Polish:** Add a "Create Your First Task" CTA to the Task Management screen when the list is empty.
- **Keyboard Focus:** Ensure the "Active" tab in the sidebar is visually distinct and focusable for keyboard navigation.
