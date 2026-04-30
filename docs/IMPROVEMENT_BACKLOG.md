# TimeSheetPro: 50 Improvements Backlog (UX/UI Audit)

Based on the audit of the current codebase and your preferences for a **Manual Matrix**, **Rule-Based Categorization**, and **Web Dashboard Focus**, here is the 50-item improvement list.

---

### 🟢 Category A: Matrix & "Last-Mile" Export (Klient Alignment)
- [x] 1.  **Smart Row Formatting:** Format the "Copy to Excel" output specifically to match the Klient "Add Multiple Rows" clipboard format.
- [x] 2.  **Billable Toggle on Matrix:** Add a column in the Weekly Matrix to toggle Billable/Non-Billable status.
- [x] 3.  **Color-Coded Billability:** Highlight non-billable rows (e.g., Internal/Admin) in light gray to distinguish them.
- [x] 4.  **Gap Detector:** Highlight cells in the matrix where daily totals are under 7.5 hours.
- [x] 5.  **Multi-Select Approve:** Add checkboxes to the "Pending Drafts" list to approve 20+ drafts at once.
- [x] 6.  **Daily Note Concatenator:** Option to merge all notes for a single task/day into one bulleted list.
- [x] 7.  **Overtime Indicator:** Visual warning if a daily total exceeds 10 hours.

- [ ] 8.  **Holiday Overlay:** Integrate a bank holiday API to pre-fill or skip tracking for holidays.
- [ ] 9.  **Decimal Precision Toggle:** Switch between 2 decimal places (0.25) and minutes (15m) for review.
- [ ] 10. **Excel Template Download:** Generate a pre-formatted `.xlsx` file that matches the Klient import schema.

### 🔵 Category B: Task Categorization & Rules
- [x] 11. **Regex Pattern Rules:** Create a "Rules Manager" UI where you can map `Process` + `Title` -> `Task`.
- [x] 12. **Keyword Auto-Assign:** If a draft note contains a specific keyword, auto-assign it.
- [ ] 13. **"Default Project" by Time:** Set a default project for specific hours of the day (e.g., 9:00-9:30 is always "Admin").
- [ ] 14. **Rule Impact Preview:** When creating a rule, show how many "Pending Drafts" it would have solved.
- [ ] 15. **URL-Based Rules:** If "github.com/org/repo" is in the activity, map it to a specific project.
- [x] 16. **Exclude List (Global):** A list of apps/titles that should *never* generate a draft.
- [ ] 17. **Client/Project Pinning:** Pin your "Top 3" projects to the top of every selection list.
- [x] 18. **Activity Clustering:** Group very short activities into a single draft automatically.
- [ ] 19. **Conflict Resolution:** If two rules match a draft, provide a "Match Score" UI.
- [ ] 20. **Rule Export/Import:** Backup your categorization rules to a JSON file.

### 🟡 Category C: Draft Review & Interaction Design
- [x] 21. **In-Line Note Editing:** Click directly on a note in the list to edit it instantly.
- [x] 22. **Hover OCR Preview:** Use visual checkpoints to verify what was on screen.
- [x] 23. **Keyboard Shortcuts:** `A` to approve, `E` to edit, `Esc` to cancel, `J/K` to navigate.
- [ ] 24. **Drag-and-Drop Tasking:** Drag a draft entry onto a "Project Sidebar" to assign it.
- [x] 25. **Undo Action:** Quick recovery for accidental approvals.
- [x] 26. **Split Draft:** A button to split a 1-hour draft into two 30-min entries.
- [x] 27. **Merge Drafts:** Select two drafts and merge them into a single entry.
- [x] 28. **Screenshot Gallery:** A lightbox view for visual verification.
- [x] 29. **Timeline View:** A visual "Daily Journey" showing activity vs approved entries.
- [x] 30. **Status Pulse:** A live indicator in the dashboard showing heartbeat status.

### 🔴 Category D: Visual Polish & Aesthetics
- [x] 31. **Dark Mode Transitions:** Smooth CSS transitions between components.
- [x] 32. **Glassmorphism:** Use `backdrop-filter: blur` for a modern UI.
- [x] 33. **Micro-Animations:** Small bounce/scale effects on clicks and hover.
- [x] 34. **Skeleton Loaders:** Use skeleton screens while fetching data.
- [ ] 35. **Custom Font:** Switch to high-readability 'Inter'.
- [x] 36. **Empty State Illustrations:** Stylized icons for "All Caught Up".
- [x] 37. **GPU Usage Graphs:** SVG progress bars for VRAM monitoring.
- [ ] 38. **Project Icons:** Support for colored initials (Avatar style) in lists.
- [x] 39. **Toast Notifications:** Immediate feedback for actions.
- [x] 40. **Density Toggle:** A "Compact" vs "Comfortable" toggle for the matrix.

### 🟣 Category E: Reliability & Maintenance
- [x] 41. **Database Vacuum:** Auto-run `VACUUM` on SQLite weekly.
- [ ] 42. **OCR Confidence Filter:** Only show OCR text if engine is >80% confident.
- [x] 43. **Auto-Backup:** Daily rolling 7-day backup of the database.
- [x] 44. **Health Check API:** Unified system status telemetry.
- [ ] 45. **Conflict Highlighting:** Mark entries that overlap in time with a red border.
- [ ] 46. **Export History:** A log of when "Copy to Excel" was clicked.
- [ ] 47. **Version Checker:** Check for Windows Client updates.
- [ ] 48. **Environment Variable Editor:** UI for server settings.
- [ ] 49. **Log Viewer:** Developer tab for server logs.
- [ ] 50. **Onboarding Tour:** 3-step "First Run" guide.

---

## 🎨 Next-Gen Features (In Progress)
- [ ] 58. **Interactive "Journey" Map:** An SVG-based visual flow showing transitions between tasks.
