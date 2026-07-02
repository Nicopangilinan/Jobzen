# Responsive UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Jobzen frontend responsive across device sizes while improving perceived smoothness, readability, and interaction quality.

**Architecture:** Keep the existing React + Tailwind structure, but upgrade the shared shell and reusable UI primitives first so individual pages inherit better spacing and responsive behavior. Then refine each major screen for mobile, tablet, and desktop layouts and finish with a production build verification.

**Tech Stack:** React 18, React Router, Tailwind CSS, Vite, Lucide React, Recharts

---

### Task 1: Responsive App Shell

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] Add a mobile top bar and off-canvas navigation pattern.
- [ ] Keep the desktop sidebar persistent on large screens.
- [ ] Add dismiss behavior, overlay, and route-aware header copy.

### Task 2: Shared Visual System

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/Toast.jsx`
- Modify: `frontend/src/components/StatsCard.jsx`

- [ ] Improve core card, button, input, table, focus, and motion styles.
- [ ] Add smoother transitions and reduced-motion fallbacks.
- [ ] Make toast feedback and stat cards adapt better on smaller screens.

### Task 3: Dashboard And Jobs Responsiveness

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/Jobs.jsx`
- Modify: `frontend/src/components/AddJobModal.jsx`

- [ ] Rework headers and action areas to stack cleanly on mobile.
- [ ] Improve chart/list/card density and overflow handling.
- [ ] Add mobile-friendly list rendering and modal form spacing.

### Task 4: Detail, Settings, And Login Polish

**Files:**
- Modify: `frontend/src/pages/JobDetail.jsx`
- Modify: `frontend/src/pages/Settings.jsx`
- Modify: `frontend/src/pages/Login.jsx`

- [ ] Make detail content blocks wrap and stack gracefully on small screens.
- [ ] Normalize Settings and Login onto the same visual system.
- [ ] Improve readability, feedback states, and action sizing.

### Task 5: Verification

**Files:**
- Modify: `frontend/src/*` as needed

- [ ] Run `npm run build` in `frontend`.
- [ ] Fix any compile or Tailwind class issues found during build.
- [ ] Summarize the responsive and UX changes after verification.
