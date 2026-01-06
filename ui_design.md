# Project Design System (Source of Truth)

## 1. Global Visual Style
**Target Style:** [Educational Platform]

**Core Prompt Instruction:**
> [Create a playful educational platform landing page with claymorphism cards, course catalog preview, progress tracking demo, student testimonials, and enrollment CTA. Use vibrant, engaging colors.]

## 2. Implementation Rules (via UI/UX Pro Max)
When generating any UI component or page, you must:
1.  Adhere strictly to the style defined above.
2.  Use the `ui-ux-pro-max` skill logic to resolve any undefined design details (colors, spacing, shadows).
3.  Do NOT deviate from this aesthetic.

## 3. Tech Stack Constraints
- Tailwind CSS
- Shadcn/UI (if applicable)
- [其他你用的库]

## 4. Layout & Responsiveness (iPad First)
**Priority Device:** iPad / Tablet (Landscape & Portrait)

**Rules:**
1. **Full-Screen Utilization**: Content must utilize the full width and height of the tablet screen. Avoid narrow centered containers (like `max-w-md`) on tablet breakpoints (`md` and `lg`).
2. **Touch Targets**: All buttons and interactive elements must be large enough for touch interaction (min-height: 48px).
3. **Grid Layouts**: Use responsive Grids that show 2-3 columns on iPad Landscape, and 1-2 columns on iPad Portrait.
4. **Font Sizing**: Base font size should be slightly larger (e.g., `text-lg` instead of `text-base`) for comfortable reading on tablets.
5. **No Wasted Space**: Backgrounds should be immersive, not just white space.

**Implementation Examples:**

```tsx
/* ✅ GOOD - Full-width on tablet */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards utilize full screen width */}
</div>

/* ❌ BAD - Narrow centered container on tablet */
<div className="max-w-md mx-auto">
  {/* Wastes screen space on tablet */}
</div>

/* ✅ GOOD - Touch-friendly buttons */
<button className="px-6 py-4 min-h-[48px] font-bold">
  Click Me
</button>

/* ❌ BAD - Small touch target */
<button className="px-2 py-1 text-sm">
  Click
</button>
```

**Breakpoint Strategy:**
- Mobile (`< 768px`): 1 column, stacked layout
- Tablet Portrait (`768px - 1024px`): 2 columns
- Tablet Landscape (`1024px - 1280px`): 3 columns
- Desktop (`> 1280px`): 3-4 columns with max-width constraints

**Typography Scale for Tablets:**
- Base: `text-lg` (18px) instead of `text-base` (16px)
- Headings: `text-4xl` or larger for primary headings
- Body text: `text-base` minimum, never smaller
