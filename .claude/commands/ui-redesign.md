---
description: Redesign the Vue 3 app from a horizontal top-nav layout to a modern SaaS-style vertical sidebar layout
---

Redesign the application shell from a horizontal sticky header with top navigation to a fixed left sidebar with vertical navigation. The goal is a standard SaaS layout: dark sidebar on the left, scrollable content area on the right.

## Phase 1: Discovery

Before writing any code, read and understand these files:
- `client/src/App.vue` — current layout root, global styles, modal state
- `client/src/components/FilterBar.vue` — sticky filter bar (currently offset by top-nav height)
- `client/src/components/ProfileMenu.vue` — avatar + dropdown with profile/tasks/logout actions
- `client/src/components/LanguageSwitcher.vue` — EN/JA switcher with dropdown
- `client/src/main.js` — router configuration and all route paths

Identify every router-link and its corresponding route path. Note any i18n keys used for nav labels. Note what events ProfileMenu emits (`show-profile-details`, `show-tasks`) — these must continue to work.

## Phase 2: Create Sidebar.vue

Delegate to vue-expert to create `client/src/components/Sidebar.vue`.

The sidebar must:
- Be a fixed-width (240-260px) component, dark slate background (`#0f172a`)
- Display brand/logo at the top (replicate the current `.logo` markup using the same i18n keys)
- Render one vertical nav link per route using `<router-link>`. For each link:
  - Show an inline SVG icon (16-20px) + text label side by side
  - Use `$route.path === '/'` style exact-match for Dashboard, prefix-match for all others
  - Active state: left border `3px solid #2563eb`, background `rgba(255,255,255,0.08)`, text `#ffffff`
  - Inactive state: text `#94a3b8`, border `3px solid transparent` (prevents reflow on activate)
  - Hover (non-active): background `rgba(255,255,255,0.05)`, text `#cbd5e1`, transition `150ms ease`
- Pin a bottom section to the sidebar foot (`margin-top: auto`) containing:
  - `LanguageSwitcher` component
  - `ProfileMenu` component (forward its two emits up to App.vue)
- Nav link padding: `0.75rem 1.25rem`, icon gap: `0.75rem`
- Root element: `display: flex; flex-direction: column; height: 100vh; overflow: hidden; flex-shrink: 0;`

Suggested simple inline SVGs per route (no external icon library):
- Dashboard: grid/squares icon
- Inventory: box/package icon
- Orders: list/clipboard icon
- Spending: chart-bar icon
- Demand: trend/arrow-up icon
- Reports: document icon

Emit `show-profile-details` and `show-tasks` from ProfileMenu through Sidebar via `defineEmits`.

## Phase 3: Restructure App.vue

Delegate to vue-expert to modify `client/src/App.vue`:

**Template changes:**
- Remove the entire `<header class="top-nav">` block (logo, nav-tabs, LanguageSwitcher, ProfileMenu)
- Add `<Sidebar @show-profile-details="showProfileDetails = true" @show-tasks="showTasks = true" />` as first child of `.app`
- Wrap `<FilterBar />` and `<main class="main-content">` in `<div class="content-area">`
- Remove `ProfileMenu` and `LanguageSwitcher` from imports and components

**Style changes:**
- `.app`: `display: flex; flex-direction: row; height: 100vh; overflow: hidden;`
- Delete all `.top-nav`, `.nav-container`, `.nav-tabs` CSS blocks
- `.content-area`: `flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc;`
- `.main-content`: remove `max-width: 1600px; margin: 0 auto;`; set `flex: 1; overflow-y: auto; padding: 24px;`
- `.card`: add `box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);`
- `.stat-card:hover`: upgrade shadow to `0 4px 12px rgba(0,0,0,0.08)`

**Script changes:**
- Import `Sidebar`, remove `ProfileMenu` and `LanguageSwitcher` imports
- Register `Sidebar` in components

## Phase 4: Update FilterBar.vue

Delegate to vue-expert to modify `client/src/components/FilterBar.vue`:

- `.filters-bar`: change `top: 70px` → `top: 0`; add `z-index: 50`; add `box-shadow: 0 1px 0 #e2e8f0`
- `.filters-container`: remove `max-width: 1600px; margin: 0 auto;`; replace with `width: 100%; padding: 0 24px;`

No filter logic or dropdown styles change.

## Phase 5: Visual Verification

Use Playwright MCP tools against `http://localhost:3000`:

1. Navigate and take a full-page screenshot — confirm dark sidebar on left, no horizontal top bar, FilterBar at top of white content area
2. Verify active nav state for the default route (Dashboard link shows left-border accent)
3. Click each route link in sequence, screenshot each — confirm only the current route nav item is active
4. Click the profile avatar in the sidebar footer — confirm dropdown opens and is not viewport-clipped
5. Click the language switcher — confirm dropdown opens upward without clipping
6. Set viewport to 1280x900 — confirm no horizontal scrollbar appears

Report any overflow, clipping, or z-index issues with screenshot references.

## Design Tokens Reference

| Token | Value |
|-------|-------|
| Sidebar bg | `#0f172a` |
| Active nav bg | `rgba(255,255,255,0.08)` |
| Active nav border | `3px solid #2563eb` |
| Active nav text | `#ffffff` |
| Inactive nav text | `#94a3b8` |
| Hover nav bg | `rgba(255,255,255,0.05)` |
| Hover nav text | `#cbd5e1` |
| Content area bg | `#f8fafc` |
| Content padding | `24px` |
| Card shadow | `0 1px 3px rgba(0,0,0,0.08)` |
| Accent blue | `#2563eb` |
| Transition | `all 150ms ease` |
