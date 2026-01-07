# Project Design System (Source of Truth)

## 1. Global Visual Style
**Target Style:** **Soft Neo-Brutalism (软性新粗野主义)**

**Core Philosophy:**
> "Bold, Playful, and Focused."
> High contrast, thick outlines, vibrant colors, and distinct geometry. It combines the rawness of brutalism with the friendliness of rounded corners and soft colors.

**Visual Key Traits (Non-negotiable):**
1.  **Thick Borders:** All containers, buttons, and inputs MUST have a `3px` solid black border (`border-3 border-black`).
2.  **Hard Shadows:** NO blur shadows. Use hard directional shadows (e.g., `4px 4px 0px 0px #000000`).
3.  **Vibrant Colors:** Use the defined Brand Green (#2ECC71) aggressively for actions and highlights.
4.  **Rounded Geometry:** Balance the harsh lines with `rounded-xl` or `rounded-2xl` corners.

## 2. Color System (Tailwind Config)

| Role | Color | Hex | Tailwind Class |
| :--- | :--- | :--- | :--- |
| **Brand** | **Vibrant Green** | `#2ECC71` | `bg-[#2ECC71]` |
| **Canvas** | **Cream White** | `#FDFBF7` | `bg-[#FDFBF7]` |
| **Surface** | **Pure White** | `#FFFFFF` | `bg-white` |
| **Ink** | **Pure Black** | `#000000` | `text-black` / `border-black` |
| **Error** | **Soft Red** | `#FF6B6B` | `bg-[#FF6B6B]` |

## 3. Component Implementation Rules

When generating UI components, apply these specific utility patterns:

### A. Buttons (Primary)
```tsx
/* Bold, interactive, tactile */
<button className="
  bg-[#2ECC71] text-black font-bold
  px-6 py-3 rounded-xl
  border-[3px] border-black
  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
  hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
  transition-all
">
  Action
</button>
```

### B. Cards / Containers
```tsx
/* High visibility, clear separation */
<div className="
  bg-white rounded-2xl
  border-[3px] border-black
  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
  p-6
">
  {/* Content */}
</div>
```

### C. Inputs
```tsx
<input className="
  w-full bg-white rounded-xl
  border-[3px] border-black
  px-4 py-3
  focus:outline-none focus:ring-0 focus:bg-[#FDFBF7]
  placeholder:text-gray-500 font-medium
" />
```

## 4. Layout & Responsiveness (iPad First)
**Priority Device:** iPad / Tablet (Landscape & Portrait)

**Rules:**
1.  **Full-Screen Utilization**: Content must utilize the full width and height of the tablet screen. Avoid narrow centered containers (like `max-w-md`) on tablet breakpoints (`md` and `lg`).
2.  **Touch Targets**: All buttons and interactive elements must be large enough for touch interaction (**min-height: 48px**).
3.  **Grid Layouts**: Use responsive Grids.
    -   **Mobile:** 1 col
    -   **iPad Portrait:** 2 cols
    -   **iPad Landscape:** 3 cols
4.  **Font Sizing**: Base font size should be slightly larger (`text-lg`) for comfortable reading on tablets.

**Implementation Examples (Updated Style):**

```tsx
/* ✅ GOOD - Full-width Grid with Neo-Brutalism Cards */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  {/* Card 1 */}
  <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] rounded-2xl p-6 min-h-[200px]">
    <h3 className="text-2xl font-bold mb-2">Module 1</h3>
  </div>
  {/* Card 2... */}
</div>

/* ❌ BAD - Narrow centered container */
<div className="max-w-md mx-auto">
  {/* Wastes screen space on tablet */}
</div>
```

## 5. Typography
*   **Headings:** Bold / ExtraBold (`font-bold`). Sans-serif.
*   **Body:** Medium / Regular. High readability.
*   **Code/Tags:** Monospace.

## 6. Tech Stack Constraints
-   **Framework:** React / Next.js
-   **Styling:** Tailwind CSS (No arbitrary values for colors if possible, use config)
-   **Icons:** Lucide React (Stroke width: 2.5px or 3px to match design)