# DESIGN.md — Neon Reliquary Design System

## 1. Visual World & Direction

- **Concept**: *Cyber Dark Glassmorphism* (inspired by modern cyber terminal dashboards and Impeccable standards).
- **Core Aesthetic**: Deep obsidian/void dark canvas (`#0a0a12`), illuminated by electric cyan (`#00f0ff`) primary accents, electric violet/magenta (`#d946ef`) secondary accents, frosted glass panels (`backdrop-blur-md`), and balanced ambient lighting.
- **Anti-Pattern Ban**: Strictly avoids muddy yellow/gold palettes, dirty yellow halo glows, harsh 0px brutalist sharp cuts on cards, and low-contrast grey text.

---

## 2. Color Palette & Semantic Roles

| Role | Color Token | Hex | WCAG AA Ratio vs Background | Usage |
|---|---|---|---|---|
| Canvas / Void | `background` / `surface` | `#0a0a12` | — | Root viewport background |
| Surface Low | `surface-container-low` | `#0e0f1a` | — | Recessed zones |
| Surface Mid | `surface-container` | `#121424` | — | Cards, dashboard panels, tables |
| Surface High | `surface-container-high` | `#1a1c32` | — | Hover states, elevated cards |
| Surface Highest | `surface-container-highest` | `#242745` | — | Dropdowns, popovers, active tabs |
| Primary Accent | `primary` | `#00f0ff` | 13.8:1 | Primary actions, HP vitality, active pills |
| Secondary Accent | `secondary` | `#d946ef` | 6.8:1 | Category headers, spell levels, buffs |
| Tertiary / Muted | `tertiary` | `#94a3b8` | 6.9:1 | Labels, subtitles, inactive indicators |
| Error / Danger | `error` | `#ff4b60` | 5.2:1 | Damage taken, nonlethal, lethal alerts |
| Text Primary | `on-surface` | `#f1f5f9` | 15.6:1 | High-contrast body, stats, titles |
| Text Secondary | `on-surface-variant` | `#cbd5e1` | 11.2:1 | Descriptions, table details |

---

## 3. Typography & Hierarchy

- **Headline**: `Noto Serif, serif` — used for major section titles and character names.
- **Body**: `Manrope, Inter, sans-serif` — fluid, readable prose for spell descriptions, abilities, and chat logs.
- **Label / Data**: `Space Grotesk, JetBrains Mono, monospace` — tactical, high-legibility numbers, dice outputs, tags, and stats.
- **Micro-copy**: Tracked uppercase with letter-spacing `0.1em` to `0.2em`, font-weight 600+.

---

## 4. Surfaces, Depth & Geometry

- **Border Radius**:
  - Small chips / badges: `rounded-md` (8px) or `rounded-full` (9999px)
  - Buttons / controls: `rounded-xl` (12px)
  - Cards / panels: `rounded-xl` (14-16px) or `rounded-2xl` (20-24px)
  - Modals / drawers: `rounded-2xl` / `rounded-3xl` (24-32px)
- **Glassmorphism**:
  - Background: `rgba(255, 255, 255, 0.03)` to `rgba(255, 255, 255, 0.05)`
  - Backdrop Blur: `backdrop-filter: blur(16px)`
  - Borders: `1px solid rgba(255, 255, 255, 0.08)` with hover transition to `rgba(0, 240, 255, 0.3)`
- **Atmosphere & Lighting**:
  - Ambient Orbs: Dual blur orbs (Cyan top-right `#00f0ff` at 12-15% opacity, Magenta bottom-left `#d946ef` at 10-12% opacity with blur ≥ 100px).
  - Glowing Text: `.neon-glow` (cyan) and `.neon-glow-accent` (magenta), never zero-offset opaque haloes.

---

## 5. Interaction States

- **Hover**: Subtle background brightening, luminous border highlight (`rgba(0, 240, 255, 0.35)`), soft depth shadow.
- **Active**: Scale down `active:scale-[0.98]` or `active:scale-95`.
- **Focus**: Visible cyan focus ring `focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none`.
