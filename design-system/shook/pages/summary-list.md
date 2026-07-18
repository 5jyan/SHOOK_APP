# Summary List Page Overrides

> **PROJECT:** Shook
> **Generated:** 2026-07-17 14:37:15
> **Page Type:** Blog / Article

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/MASTER.md`).
> Only deviations from the Master are documented here. For all other rules, refer to the Master.

---

## Page-Specific Rules

### Layout Overrides

- **Max Width:** 800px (narrow, focused)
- **Layout:** Single column, centered
- **Sections:** 1. Hero with video background, 2. Key features overlay, 3. Benefits section, 4. CTA

### Spacing Overrides

- **Content Density:** Low — focus on clarity

### Typography Overrides

- No overrides — use Master typography

### Color Overrides

- **Strategy:** Dark overlay 60% on video. Brand accent for CTA. White text on dark.

### Component Overrides

- Avoid: Desktop-first causing mobile issues
- Avoid: Auto-play high-res video loops
- Avoid: Div soup with no semantics

---

## Page-Specific Components

- No unique components for this page

---

## Recommendations

- Effects: KPI value animations (count-up), trend arrow direction animations, metric card hover lift, alert pulse effect
- Responsive: Start with mobile styles then add breakpoints
- Sustainability: Click-to-play or pause when off-screen
- Accessibility: Use semantic HTML and ARIA properly
- CTA Placement: Overlay on video (center/bottom) + Bottom section
