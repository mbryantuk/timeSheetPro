# Weekly Export View: 20 Improvements (UX/Accessibility Audit)

This document outlines 20 proposed improvements for the Weekly Export view in TimeSheetPro, focusing on accessibility, usability, and visual excellence.

## 🚀 UX & Visual Improvements

1.  **Side-Panel Note View (Slide-over):** Replace the centered modal with a side-panel that slides in from the right. This allows users to keep the context of the table while reviewing notes, addressing the "tiny box" complaint.
2.  **In-Line Note Snippets:** Show the first 2 lines of notes directly in the table row. Users shouldn't have to click "View Notes" just to see what the entry is about.
3.  **Project-Based Grouping:** Group entries by Account/Project with collapsible sections and sub-totals for hours. This makes it much easier to digest a week's worth of work.
4.  **Visual Summary Cards:** Add a row of "Stats Cards" at the top showing: Total Week Hours, Most Active Project, and Billable vs. Non-Billable split.
5.  **Interactive Hour Charts:** Include a small bar chart or donut chart showing time distribution across projects for the selected week.
6.  **Quick-Action Row Hover:** On hover, show "Copy Notes" and "Edit" buttons directly on the row to reduce clicks.
7.  **Week Picker / Date Range:** Add a robust date picker or "Previous/Next Week" navigation to view historical data.
8.  **Status Badges with Glow:** Use vibrant, color-coded badges (e.g., Green for 'Exported', Blue for 'Ready', Amber for 'Review Required') with subtle glow effects.
9.  **Glassmorphism Refinement:** Enhance the table background with stronger `backdrop-blur` and a thin, vibrant border to make it feel more premium.
10. **Micro-Animations:** Add subtle entrance animations for table rows (staggered fade-in) and hover scaling for buttons.

## ♿ Accessibility & Inclusivity

11. **Keyboard-First Navigation:** Ensure the entire table and side-panel are navigable via `Tab`. Use `Enter` to open notes and `Esc` to close.
12. **Screen Reader Optimizations:** Add `aria-label` to all buttons (e.g., "View notes for Project X") and use semantic table headers.
13. **High Contrast Focus States:** Implement clear, vibrant focus rings (e.g., `ring-2 ring-blue-400`) for all interactive elements to assist users with visual impairments.
14. **Dynamic Font Sizing:** Ensure the layout remains functional when users increase their browser's base font size (up to 200%).
15. **Color-Blind Friendly Indicators:** Use icons (e.g., Checkmarks, Warning triangles) alongside colors for status indicators.

## 🛠️ Functional & Efficiency Gains

16. **Bulk Export to Clipboard:** Add a "Copy All for Week" button that formats all notes into a single, Klient-compatible list.
17. **Direct "Push to Salesforce" Button:** (From Backlog) Integrate a button to sync the approved week directly with Klient API.
18. **Billable Toggle on Row:** Allow users to toggle the billable status of an entry directly from the export view without going back to drafts.
19. **Search & Filter Bar:** A global search to filter entries by project name, task, or keywords within the notes.
20. **Export History Log:** A small "Last Exported" timestamp to track when the data was last copied or synced.

---

## 🎯 Immediate Priority: Fix "View Notes" Experience
The current modal will be replaced with a premium Side-Panel (Drawer) that provides a much larger, readable area for notes and includes metadata about the entry.
