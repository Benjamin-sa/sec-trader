# Design System & Style Guide

## 🎨 Design Philosophy

Our platform embodies **sophisticated simplicity** - inspired by Apple's design language. Every element should feel premium, smooth, and intentional. We prioritize clarity and elegance over decoration.

### Core Principles

1. **Smooth & Curved**: No sharp edges. Everything flows.
2. **Subtle & Refined**: Muted colors, gentle gradients, soft shadows
3. **Spacious**: Generous whitespace, breathing room
4. **Premium Feel**: High-quality micro-interactions and animations
5. **Clarity First**: Beauty serves function, never obscures it

---

## 🎨 Color Palette

### Primary Colors (Brand Identity)

```css
/* Deep Blue - Primary brand color */
--primary-50:  rgb(239, 246, 255);   /* Lightest background */
--primary-100: rgb(219, 234, 254);   /* Light background */
--primary-200: rgb(191, 219, 254);   /* Subtle accents */
--primary-300: rgb(147, 197, 253);   /* Borders, dividers */
--primary-400: rgb(96, 165, 250);    /* Disabled states */
--primary-500: rgb(59, 130, 246);    /* Primary actions */
--primary-600: rgb(37, 99, 235);     /* Hover states */
--primary-700: rgb(29, 78, 216);     /* Active states */
--primary-800: rgb(30, 64, 175);     /* Text on light */
--primary-900: rgb(30, 58, 138);     /* Darkest */

/* Usage */
Primary buttons, links, important accents
Tailwind: blue-500, blue-600, blue-700
```

### Semantic Colors

```css
/* Success - For positive actions (buying, gains) */
--success-50:  rgb(240, 253, 244);
--success-100: rgb(220, 252, 231);
--success-500: rgb(34, 197, 94);     /* Primary success */
--success-600: rgb(22, 163, 74);     /* Hover */
--success-700: rgb(21, 128, 61);     /* Active */

/* Tailwind: emerald-500, emerald-600 */

/* Warning - For important information */
--warning-50:  rgb(255, 251, 235);
--warning-100: rgb(254, 243, 199);
--warning-500: rgb(245, 158, 11);    /* Primary warning */
--warning-600: rgb(217, 119, 6);     /* Hover */

/* Tailwind: amber-500, amber-600 */

/* Danger - For selling, losses, destructive actions */
--danger-50:  rgb(254, 242, 242);
--danger-100: rgb(254, 226, 226);
--danger-500: rgb(239, 68, 68);      /* Primary danger */
--danger-600: rgb(220, 38, 38);      /* Hover */
--danger-700: rgb(185, 28, 28);      /* Active */

/* Tailwind: red-500, red-600 */
```

### Neutral Colors (The Foundation)

```css
/* Gray Scale - Most used colors in the app */
--gray-50:  rgb(249, 250, 251);      /* Backgrounds */
--gray-100: rgb(243, 244, 246);      /* Light backgrounds */
--gray-200: rgb(229, 231, 235);      /* Borders */
--gray-300: rgb(209, 213, 219);      /* Disabled borders */
--gray-400: rgb(156, 163, 175);      /* Disabled text */
--gray-500: rgb(107, 114, 128);      /* Secondary text */
--gray-600: rgb(75, 85, 99);         /* Body text */
--gray-700: rgb(55, 65, 81);         /* Headings */
--gray-800: rgb(31, 41, 55);         /* Important text */
--gray-900: rgb(17, 24, 39);         /* Primary text */

/* Tailwind: gray-50 through gray-900 */
```

### Accent Colors (Sparingly)

```css
/* Purple - For special features, premium elements */
--purple-50:  rgb(250, 245, 255);
--purple-500: rgb(168, 85, 247);
--purple-600: rgb(147, 51, 234);

/* Indigo - For data visualization */
--indigo-50:  rgb(238, 242, 255);
--indigo-500: rgb(99, 102, 241);
--indigo-600: rgb(79, 70, 229);

/* Teal - For secondary actions */
--teal-50:  rgb(240, 253, 250);
--teal-500: rgb(20, 184, 166);
--teal-600: rgb(13, 148, 136);
```

### ⚠️ Deprecated Colors (DO NOT USE)

```css
/* Yellow is banned - too harsh, not elegant */
❌ yellow-*, yellow-400, yellow-500, etc.

/* Use amber instead for warnings: */
✅ amber-500, amber-600
```

---

## 🔤 Typography

### Font Family

```css
/* System font stack - Fast, native, beautiful */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Helvetica Neue', Arial, sans-serif;

/* For code/monospace */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace;
```

### Font Scale

```css
/* Display - Hero sections */
text-5xl: 3rem (48px)     /* font-bold */
text-4xl: 2.25rem (36px)  /* font-bold */

/* Headings */
text-3xl: 1.875rem (30px) /* font-bold, section headers */
text-2xl: 1.5rem (24px)   /* font-bold, card headers */
text-xl:  1.25rem (20px)  /* font-semibold, subsections */
text-lg:  1.125rem (18px) /* font-semibold, card titles */

/* Body */
text-base: 1rem (16px)    /* font-normal, primary body */
text-sm:   0.875rem (14px) /* font-normal, secondary text */
text-xs:   0.75rem (12px)  /* font-medium, labels */

/* Fine print */
text-2xs: 0.625rem (10px)  /* font-medium, micro text */
```

### Font Weights

```css
font-normal: 400   /* Body text */
font-medium: 500   /* Emphasis, labels */
font-semibold: 600 /* Subheadings, important text */
font-bold: 700     /* Headings, numbers */
font-extrabold: 800 /* Display text, hero */
```

### Line Height

```css
leading-none: 1        /* Tight headings */
leading-tight: 1.25    /* Headings */
leading-snug: 1.375    /* Subheadings */
leading-normal: 1.5    /* Body text */
leading-relaxed: 1.625 /* Comfortable reading */
```

---

## 📐 Spacing & Layout

### Border Radius (Smooth Curves)

```css
/* Never use sharp corners! */
❌ rounded-none, rounded-sm, rounded-md

/* Always use generous curves */
✅ rounded-lg:   0.5rem (8px)   /* Buttons, small cards */
✅ rounded-xl:   0.75rem (12px)  /* Cards, containers */
✅ rounded-2xl:  1rem (16px)     /* Large cards, modals */
✅ rounded-3xl:  1.5rem (24px)   /* Hero sections */
✅ rounded-full: 9999px          /* Pills, badges, avatars */
```

### Spacing Scale

```css
/* Use consistent spacing */
space-1:  0.25rem (4px)
space-2:  0.5rem (8px)
space-3:  0.75rem (12px)
space-4:  1rem (16px)      /* Base unit */
space-5:  1.25rem (20px)
space-6:  1.5rem (24px)
space-8:  2rem (32px)
space-10: 2.5rem (40px)
space-12: 3rem (48px)
space-16: 4rem (64px)
space-20: 5rem (80px)
space-24: 6rem (96px)
```

### Container Widths

```css
max-w-7xl: 80rem (1280px)  /* Main content area */
max-w-6xl: 72rem (1152px)  /* Comfortable reading width */
max-w-4xl: 56rem (896px)   /* Forms, articles */
max-w-2xl: 42rem (672px)   /* Narrow content */
```

---

## ✨ Effects & Interactions

### Shadows (Subtle Depth)

```css
/* Layering - Use sparingly, build depth gradually */
shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05)          /* Subtle lift */
shadow:     0 1px 3px rgba(0, 0, 0, 0.1)           /* Card default */
shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1)     /* Hover state */
shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1)   /* Modal, dropdown */
shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1)   /* Important elements */
shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25) /* Hero, special */

/* Custom shadows for importance */
Important shadow: 0 8px 24px -4px rgba(59, 130, 246, 0.2)  /* Blue glow */
Success shadow:   0 8px 24px -4px rgba(34, 197, 94, 0.2)   /* Green glow */
Danger shadow:    0 8px 24px -4px rgba(239, 68, 68, 0.2)   /* Red glow */
```

### Transitions (Smooth Motion)

```css
/* All interactions should feel premium */

/* Duration */
duration-75:  75ms    /* Instant feedback */
duration-100: 100ms   /* Quick response */
duration-150: 150ms   /* Snappy */
duration-200: 200ms   /* Default - Most common */
duration-300: 300ms   /* Smooth */
duration-500: 500ms   /* Dramatic */
duration-700: 700ms   /* Slow reveal */

/* Easing */
ease-in:     cubic-bezier(0.4, 0, 1, 1)
ease-out:    cubic-bezier(0, 0, 0.2, 1)        /* Default - Best for UI */
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)      /* Smooth both ways */

/* Standard transition */
transition-all duration-200 ease-out
```

### Hover States

```css
/* Buttons */
hover:bg-primary-600 hover:shadow-md hover:scale-[1.02]

/* Cards */
hover:shadow-lg hover:-translate-y-1 hover:border-gray-300

/* Links */
hover:text-primary-600 hover:underline

/* Icons */
hover:text-primary-500 hover:scale-110
```

### Focus States

```css
/* Always visible for accessibility */
focus-visible:outline-2 
focus-visible:outline-offset-2 
focus-visible:outline-primary-500
focus-visible:ring-2
focus-visible:ring-primary-500
```

---

## 🎭 Component Patterns

### Buttons

```tsx
/* Primary Button - Main actions */
className="
  px-6 py-3 
  bg-gradient-to-r from-primary-600 to-primary-700
  text-white font-semibold 
  rounded-xl 
  shadow-sm hover:shadow-md 
  transition-all duration-200 
  hover:scale-[1.02] hover:-translate-y-0.5
  focus-visible:outline-2 focus-visible:outline-primary-500
"

/* Secondary Button - Alternative actions */
className="
  px-6 py-3 
  bg-white border-2 border-gray-300
  text-gray-700 font-semibold 
  rounded-xl 
  shadow-sm hover:shadow-md hover:border-gray-400
  transition-all duration-200
"

/* Ghost Button - Tertiary actions */
className="
  px-4 py-2 
  text-primary-600 font-medium 
  rounded-lg 
  hover:bg-primary-50 
  transition-all duration-150
"
```

### Cards

```tsx
/* Standard Card */
className="
  bg-white 
  border border-gray-200/60 
  rounded-xl 
  shadow-sm hover:shadow-lg 
  transition-all duration-300 
  hover:-translate-y-1
  p-6
"

/* Important Card (for high-priority trades) */
className="
  bg-gradient-to-br from-blue-50/50 to-indigo-50/30 
  border border-blue-200/60 
  rounded-xl 
  shadow-md hover:shadow-xl 
  transition-all duration-300 
  hover:-translate-y-1 hover:scale-[1.01]
  p-6
  relative overflow-hidden
  backdrop-blur-sm
"

/* Glass Card (premium feel) */
className="
  bg-white/80 backdrop-blur-lg 
  border border-white/20 
  rounded-2xl 
  shadow-xl 
  p-8
"
```

### Badges & Pills

```tsx
/* Status Badge - Smooth, rounded */
className="
  inline-flex items-center gap-1.5 
  px-3 py-1.5 
  bg-gradient-to-r from-emerald-100 to-emerald-50 
  text-emerald-800 text-xs font-bold uppercase tracking-wider 
  rounded-full 
  shadow-sm 
  transition-all duration-200 
  hover:shadow-md hover:scale-105
"

/* Role Badge */
className="
  inline-block 
  px-2.5 py-1 
  bg-gradient-to-r from-blue-100 to-blue-50 
  text-blue-800 text-xs font-medium 
  rounded-full 
  shadow-sm
"
```

### Inputs

```tsx
/* Text Input */
className="
  w-full 
  px-4 py-3 
  bg-white 
  border-2 border-gray-300 
  rounded-xl 
  text-gray-900 
  placeholder-gray-400
  transition-all duration-200
  focus:border-primary-500 
  focus:ring-4 focus:ring-primary-100
  focus:outline-none
"

/* Select Dropdown */
className="
  w-full 
  px-4 py-3 
  bg-white 
  border-2 border-gray-300 
  rounded-xl 
  text-gray-900
  transition-all duration-200
  focus:border-primary-500 
  focus:ring-4 focus:ring-primary-100
  cursor-pointer
"
```

### Tables

```tsx
/* Table Container */
className="
  overflow-hidden 
  rounded-xl 
  border border-gray-200 
  shadow-sm
"

/* Table Row Hover */
className="
  group 
  transition-all duration-300 ease-in-out 
  hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/50 
  hover:shadow-sm 
  cursor-pointer
"

/* Important Table Row */
className="
  group 
  bg-gradient-to-r from-blue-50/60 to-indigo-50/40 
  border-l-4 border-l-blue-500
  hover:from-blue-50/90 hover:to-indigo-50/70 
  hover:shadow-md 
  hover:scale-[1.002]
  transition-all duration-300
"
```

---

## 🚦 Trade Importance Indicators

### High Importance (Buys & Sells)

```tsx
/* Visual Treatment */
- Background: gradient-to-br from-blue-50/50 to-indigo-50/30
- Border: border-blue-400/60 with 4px left accent
- Badge: "Important" with subtle glow
- Shadow: Custom blue-tinted shadow on hover
- Animation: Subtle pulse effect

/* Colors */
- Buy (P+A): emerald-500, emerald-600
- Sell (S+D): red-500, red-600
```

### Medium Importance

```tsx
/* Visual Treatment */
- Background: white
- Border: border-gray-200
- No special badge
- Standard shadow
- No animation

/* Colors */
- Neutral: gray-600, gray-700
```

### Low Importance (Grants, Awards)

```tsx
/* Visual Treatment */
- Background: white
- Border: border-gray-200/60
- Muted text colors
- Subtle presence
- No emphasis

/* Special handling for grants */
- Price: Show "Grant" instead of N/A
- Value: Show share count with "Compensation grant" subtitle
- Italicized secondary text
```

---

## 🎬 Animations

### Keyframe Animations

```css
/* Subtle Pulse (for important items) */
@keyframes subtleGlow {
  0%, 100% {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08),
                0 0 0 1px rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35),
                0 2px 8px rgba(37, 99, 235, 0.2),
                0 0 0 1px rgba(59, 130, 246, 0.2);
  }
}

/* Shimmer Loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Micro-interactions

```css
/* Hover lift */
hover:-translate-y-1 hover:shadow-lg

/* Scale on hover */
hover:scale-[1.02] transition-transform duration-200

/* Slide on hover */
hover:translate-x-1 transition-transform duration-200

/* Glow on hover */
hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]
```

---

## 📱 Responsive Design

### Breakpoints

```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops */
```

### Mobile-First Patterns

```tsx
/* Stack on mobile, grid on desktop */
className="
  grid grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4
"

/* Hide on mobile, show on desktop */
className="hidden lg:block"

/* Responsive padding */
className="px-3 sm:px-4 lg:px-8"

/* Responsive text */
className="text-base sm:text-lg lg:text-xl"
```

---

## ♿ Accessibility

### ARIA Labels

```tsx
<button aria-label="View filing details">
<div role="alert" aria-live="polite">
<nav aria-label="Main navigation">
```

### Keyboard Navigation

```tsx
/* All interactive elements must be keyboard accessible */
tabIndex={0}
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleAction();
  }
}}
```

### Color Contrast

```
Minimum contrast ratios:
- Normal text: 4.5:1
- Large text (18px+): 3:1
- Interactive elements: 3:1
```

---

## 🎨 Example Component

```tsx
// TradeCard with proper styling
<div className="
  group relative 
  bg-white/95 backdrop-blur-sm 
  border border-gray-200/60 
  rounded-xl 
  p-5 
  shadow-sm hover:shadow-xl 
  transition-all duration-300 ease-in-out 
  hover:-translate-y-1 hover:scale-[1.01] 
  cursor-pointer
">
  {/* Gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-gray-50/30 rounded-xl pointer-events-none" />
  
  {/* Content */}
  <div className="relative space-y-4">
    {/* Header */}
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm font-bold text-gray-900 tracking-tight">
        {date}
      </div>
      <span className="
        inline-flex items-center gap-1.5 
        px-3 py-1.5 
        bg-gradient-to-r from-blue-50 to-indigo-50 
        border border-blue-200/60 
        text-blue-900 text-xs font-bold uppercase tracking-wider 
        rounded-full 
        shadow-sm animate-subtle-glow
      ">
        ⭐ Important
      </span>
    </div>
    
    {/* Body */}
    <div className="transition-transform duration-200 group-hover:translate-x-1">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
        Insider
      </div>
      <div className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
        {name}
      </div>
    </div>
    
    {/* Footer */}
    <div className="pt-3 border-t border-gray-200/60">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
        Total Value
      </div>
      <div className="text-xl font-extrabold text-gray-900 tracking-tight">
        {value}
      </div>
    </div>
  </div>
</div>
```

---

## 🚫 Don'ts

### Never Do These:

```css
❌ Use yellow-* colors (harsh, unprofessional)
❌ Use sharp corners (rounded-sm, rounded-md, or no rounding)
❌ Use heavy shadows everywhere (shadow-2xl should be rare)
❌ Use bright, saturated colors (looks cheap)
❌ Mix too many colors in one view (3-4 max)
❌ Use animations longer than 700ms (feels slow)
❌ Forget hover states (everything interactive should respond)
❌ Skip loading states (users need feedback)
❌ Use pure black (#000000) - use gray-900 instead
❌ Use pure white borders - use gray-200 or white/20
```

---

## ✅ Best Practices Summary

1. **Colors**: Blue primary, emerald success, red danger, amber warnings
2. **Curves**: Always rounded-xl or more, never sharp
3. **Shadows**: Start subtle, enhance on hover
4. **Transitions**: 200ms duration, ease-out easing
5. **Spacing**: Generous whitespace, minimum p-4 or p-6
6. **Typography**: Clear hierarchy, semibold headings, normal body
7. **Gradients**: Subtle, from-to pattern, same color family
8. **Animations**: Smooth, purposeful, under 500ms
9. **Responsive**: Mobile-first, test all breakpoints
10. **Accessibility**: Keyboard nav, ARIA labels, contrast

---

**Remember**: Every pixel should feel intentional. Every interaction should feel smooth. Every color should feel sophisticated. This is a premium financial platform - the design should reflect that.
