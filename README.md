# Reframe

AI image generation is incredibly powerful, but there’s still one fundamental problem.

When we generate an image with AI, the result is usually one flattened image. If I want to change just one object, I often have to regenerate the whole image and that can change things I actually wanted to keep.

Reframe changes that. Reframe is an AI creative workspace that turns generated images into editable scenes.

## What you can do

- Generate scenes with Hy Image 3.5 Preview through GMI Cloud.
- Add PNG, JPEG, or WebP images as editable Canvas layers.
- Inspect objects with names, descriptions, depth, relationships, and approximate regions.
- Review localized edits before rendering and protect pixels outside the approved rectangle.
- Edit one image layer while leaving other Canvas layers untouched.
- Compare original and current versions with a slider.
- Explore a spatial Scene map for crowded compositions.
- Use text, shape, component, move, scale, arrange, opacity, rotation, and filter tools.
- Restore versions, undo changes, and export the composed Canvas as PNG.

## Product flow

1. **Create** — Start with a prompt or upload an image.
2. **Understand** — Analyze the scene and assign persistent entity IDs.
3. **Select** — Choose an object from the layer column, artwork, or Scene map.
4. **Reframe** — Describe the change, review its region, and apply it.
5. **Verify** — Use Inspect and Compare to check the result.
6. **Store** — Keep the original, edit history, entity snapshot, and versions together.

## Architecture

| Area | Implementation |
| --- | --- |
| Client | React 19 + Vite canvas editor |
| API | Express 5 with validated inputs, provider orchestration, jobs, and scene routes |
| Understanding | MiniMax M3 through the Anthropic SDK interface |
| Generation/editing | Hy Image 3.5 Preview adapter through GMI Cloud |
| Processing | Sharp for normalization, crops, and rectangular recomposition |
| Storage | Atomic JSON metadata and immutable local PNG versions; optional Cloudinary copies |

The localized edit pipeline sends a crop with reference context to the image provider, then copies only the approved rectangle back into the stored original. Entity regions are approximate rectangles, not segmentation masks.

## Run locally

Requires Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env
# Add server-side provider values to .env
npm run dev
```

Open http://127.0.0.1:5173. The Vite client runs on port 5173 and the API on port 3001.

```powershell
npm run check   # server syntax checks
npm run build   # production client build
npm start       # built client and API together
```

## Configuration

Keep credentials on the server. Never prefix secrets with `VITE_` or commit `.env`.

| Variable | Purpose |
| --- | --- |
| `GMI_API_KEY` | Hy Image credential |
| `ANTHROPIC_BASE_URL` | `https://api.minimax.io/anthropic` for MiniMax |
| `ANTHROPIC_API_KEY` | MiniMax M3 credential |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for reference crops |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset, commonly `reframe` |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Signed upload credentials when needed |
| `DATA_DIR` | Persistent scene and PNG storage; defaults to `./data` |
| `PORT` | Server port; defaults to `3001` |

Generation requires Hy configuration. Analysis and edit planning require MiniMax. Cloudinary is required when edit orchestration needs a public reference crop URL.

## Data and versioning

Each entity receives a persistent UUID. Versions record the rendered image, entity snapshot, instruction, region, parent version, and provider provenance. Removing an entity marks it removed so its history remains available. Restoring an older version preserves the other saved versions; a later edit creates a new branch.

## Reliability boundaries

Reframe validates model output, edit boxes, instructions, provider responses, and stale plans. It preserves the previous scene when an edit or upload fails and reports safe user-facing errors.

This is an open hackathon demo without authentication or multi-tenant isolation. Job records are in memory; saved scenes and PNG files are durable on disk. Use one Railway replica. The Hy adapter is strict about its external contract and does not simulate unavailable generation results.

## Deployment

The repository includes `Dockerfile` and `railway.json` for Railway.

1. Push without `.env` or private `data/` files.
2. Create a Railway service and attach a persistent volume at `/data`.
3. Set `DATA_DIR=/data` and provider variables.
4. Keep one replica and expose the HTTPS domain.
5. Verify `/api/health`, generation, analysis, localized edits, Compare, restore, and export with real credentials.


## Demo presentation script

### Opening

AI image generation is incredibly powerful, but there’s still one fundamental problem.

When we generate an image with AI, the result is usually one flattened image. If I want to change just one object, I often have to regenerate the whole image and that can change things I actually wanted to keep.

Reframe changes that. Reframe is an AI creative workspace that turns generated images into editable scenes.

“I’ll use a futuristic amusement-park scene as the example. Watch how the interface keeps the image editable and the change bounded.”

### Layer column

“On the left is the layer column. It is the scene’s table of contents. Reframe lists image layers and the objects detected in the generated scene. Each row has a name and type, and the selected row stays synchronized with the canvas.”

“I can click an object directly in the artwork or choose it from the column. For regular Canvas layers, this area also supports selecting, moving, duplicating, arranging, and opening layer properties.”

### Inspect

“Next I’ll switch to Inspect. Hovering highlights an object’s approximate region. Clicking opens the right inspector with its name, type, description, depth estimate, relationships, and persistent identity.”

“I’ll select the Ferris wheel and describe the change in plain language. Reframe prepares the edit before rendering and shows the proposed instruction and approved rectangle. I can adjust that rectangle for context, shadows, or a new position. Pixels outside the approved region remain protected.”

### Compare

“After applying the edit, I’ll open Compare. This is a before-and-after slider: the original stays on one side, the current version on the other, and the handle lets me inspect the boundary.”

“I can confirm that the Ferris wheel changed while the rest of the park stayed stable. Compare is also useful for subtle changes because I do not have to remember the original.”

### Scene map

“Scene map gives me the spatial overview. Detected entities are laid out according to their positions in the image, and selecting a map item selects the same entity in the canvas and inspector.”

“This is useful for crowded scenes: it helps me find a distant sign, person, or garden quickly and understand foreground and background relationships before editing.”

### Store

“Reframe stores a scene rather than one disposable export. The original is saved first, every successful edit becomes a new immutable version, and the entity snapshot and instruction travel with that version.”

“Version History shows the original and each reframe. I can restore any version or undo the current edit. If I continue after restoring an older version, Reframe preserves the saved history and creates a new branch. When finished, I can export the composed Canvas as a PNG.”

### Closing

“That is the Reframe workflow: the layer column organizes the scene, Inspect explains what can be edited, Compare verifies the result, Scene map provides spatial context, and Store preserves the creative history. Together, these views turn image generation into a controlled, iterative design process.”

## Design foundation

This is the imported Claude design reference used as the visual foundation. References to Claude and Anthropic describe that source design system, rather than Reframe branding.

### Design tokens

```yaml
version: alpha
name: Claude-design-analysis
description: A warm-canvas editorial interface for Anthropic's Claude product. The system anchors on a tinted cream canvas with serif display headlines, warm coral CTAs, and dark navy product surfaces (code editor mockups, model showcase cards). Brand voltage comes from the cream/coral pairing — deliberately warm and humanist where most AI brands use cool blue + slate. Type voice runs a slab-serif display ("Copernicus" / Tiempos Headline) for h1/h2 and a humanist sans for body. The signature Anthropic black-radial-spike mark anchors the wordmark.

colors:
  primary: "#cc785c"
  primary-active: "#a9583e"
  primary-disabled: "#e6dfd8"
  ink: "#141413"
  body: "#3d3d3a"
  body-strong: "#252523"
  muted: "#6c6a64"
  muted-soft: "#8e8b82"
  hairline: "#e6dfd8"
  hairline-soft: "#ebe6df"
  canvas: "#faf9f5"
  surface-soft: "#f5f0e8"
  surface-card: "#efe9de"
  surface-cream-strong: "#e8e0d2"
  surface-dark: "#181715"
  surface-dark-elevated: "#252320"
  surface-dark-soft: "#1f1e1b"
  on-primary: "#ffffff"
  on-dark: "#faf9f5"
  on-dark-soft: "#a09d96"
  accent-teal: "#5db8a6"
  accent-amber: "#e8a55a"
  success: "#5db872"
  warning: "#d4a017"
  error: "#c64545"

typography:
  display-xl:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  button:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 36px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 96px
  hero-illustration-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  feature-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  code-window-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 24px
  model-comparison-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  connector-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  cookie-consent-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    padding: 8px 14px
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  cta-band-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  cta-band-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
    typography: "{typography.body-sm}"
    padding: 64px
```

### Overview

Claude.com is the warmest, most editorial interface in the AI-product category. The base atmosphere is a **tinted cream canvas** (`{colors.canvas}` — #faf9f5) — distinctly warm, deliberately not the cool gray-white that every other AI brand uses. Headlines run a **slab-serif display** ("Copernicus" / Tiempos Headline) at weight 400 with negative letter-spacing, paired with **StyreneB / Inter** body sans. The combination feels like a literary publication, not a SaaS marketing page.

Brand voltage comes from the **cream + coral pairing** — coral (`{colors.primary}` — #cc785c) is the signature Anthropic accent, used on every primary CTA, on the brand wordmark, and on full-bleed callout cards. The coral is warm, slightly muted, never cyan/blue — a deliberate counter-positioning against OpenAI's cool slate, Google's saturated blue, and Microsoft's corporate cyan.

The system has three surface modes that alternate page-by-page:
1. **Cream canvas** (`{colors.canvas}`) — default body floor
2. **Light cream cards** (`{colors.surface-card}`) — feature card backgrounds
3. **Dark navy product surfaces** (`{colors.surface-dark}`) — code editor mockups, model showcase cards, pre-footer CTAs, footer itself

The dark surfaces are where Claude shows its product chrome — code blocks, terminal output, model comparison tables, agentic-flow diagrams. The cream-to-dark contrast is the page's pacing rhythm.

**Key Characteristics:**
- Warm cream canvas (`{colors.canvas}` — #faf9f5) with dark warm-ink text (`{colors.ink}` — #141413). The brand's defining color choice.
- Coral primary CTA (`{colors.primary}` — #cc785c). Used scarcely on individual buttons, generously on full-bleed coral callout cards.
- Slab-serif display headlines via Copernicus / Tiempos Headline at weight 400 with negative letter-spacing. Pairs with humanist sans body for a literary editorial voice.
- Dark navy product mockup cards (`{colors.surface-dark}` — #181715) carrying code blocks, terminal panels, model comparison data — the brand shows the product chrome at scale rather than abstract marketing illustrations.
- Light cream feature cards (`{colors.surface-card}` — #efe9de) — slightly darker than canvas, used for content-driven feature explanations.
- Anthropic radial-spike mark — a small black asterisk-like glyph (4-spoke radial) — appears as the brand wordmark prefix and as a content marker.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content + product cards, `{rounded.xl}` (16px) for the hero illustration container, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard. Internal card padding stays generous at `{spacing.xl}` (32px).

### Colors

#### Brand & Accent
- **Coral / Primary** (`{colors.primary}` — #cc785c): The signature Anthropic warm coral. Used on every primary CTA background, on full-bleed coral callout cards, on the brand wordmark accent. The most-recognized Anthropic color outside of the spike-mark logo.
- **Coral Active** (`{colors.primary-active}` — #a9583e): The press / hover-darker variant.
- **Coral Disabled** (`{colors.primary-disabled}` — #e6dfd8): A desaturated cream-tinted disabled state.
- **Accent Teal** (`{colors.accent-teal}` — #5db8a6): Used sparingly on secondary product surfaces (terminal status indicators, "active connection" dots in connectors page).
- **Accent Amber** (`{colors.accent-amber}` — #e8a55a): A small companion warm-tone used on category badges and inline highlights.

#### Surface
- **Canvas** (`{colors.canvas}` — #faf9f5): The default page floor. Tinted cream — warm, deliberately not pure white.
- **Surface Soft** (`{colors.surface-soft}` — #f5f0e8): Section dividers, very-soft band backgrounds.
- **Surface Card** (`{colors.surface-card}` — #efe9de): Feature cards, content cards. One step darker than canvas.
- **Surface Cream Strong** (`{colors.surface-cream-strong}` — #e8e0d2): A strongest-cream variant used on selected category tabs and emphasized section bands.
- **Surface Dark** (`{colors.surface-dark}` — #181715): Code editor mockups, model showcase cards, footer. The dominant dark surface.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #252320): Elevated cards inside dark bands (settings panels in mockups).
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #1f1e1b): Slightly lighter dark, used for code block backgrounds inside larger dark cards.
- **Hairline** (`{colors.hairline}` — #e6dfd8): The 1px border tone on cream surfaces. Same hex as `{colors.primary-disabled}` — borders feel like one elevation step rather than ink lines.
- **Hairline Soft** (`{colors.hairline-soft}` — #ebe6df): Barely-visible divider used inside the same band.

#### Text
- **Ink** (`{colors.ink}` — #141413): All headlines and primary text. Warm dark, slightly off-pure-black.
- **Body Strong** (`{colors.body-strong}` — #252523): Emphasized paragraphs, lead text.
- **Body** (`{colors.body}` — #3d3d3a): Default running-text color.
- **Muted** (`{colors.muted}` — #6c6a64): Sub-headings, breadcrumbs, footer-adjacent secondary text.
- **Muted Soft** (`{colors.muted-soft}` — #8e8b82): Captions, fine-print, copyright lines.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on coral buttons.
- **On Dark** (`{colors.on-dark}` — #faf9f5): Cream-tinted white used on dark surfaces (echoes the canvas tone).
- **On Dark Soft** (`{colors.on-dark-soft}` — #a09d96): Footer body text, secondary labels in dark mockups.

#### Semantic
- **Success** (`{colors.success}` — #5db872): Green status dots, "available" indicators.
- **Warning** (`{colors.warning}` — #d4a017): Warning callouts (rare on marketing surfaces).
- **Error** (`{colors.error}` — #c64545): Validation errors.

### Typography

#### Font Family
The system runs **Copernicus** (or **Tiempos Headline** as substitute) as the slab-serif display face for headlines, and **StyreneB** (or **Inter** as substitute) as the humanist sans for body, navigation, and UI labels. **JetBrains Mono** handles code blocks. The fallback stack walks `Tiempos Headline, Garamond, "Times New Roman", serif` for display and `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` for body.

The display/body split is editorial:
- Copernicus serif (weight 400, negative tracking) → h1, h2, h3, hero display
- StyreneB sans (weight 400-500) → body, navigation, buttons, captions, labels
- JetBrains Mono → all code blocks and terminal text

#### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | Homepage h1 ("Meet your thinking partner") — Copernicus serif |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | Section heads — Copernicus |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | Sub-section heads, model names — Copernicus |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | Pricing tier names, callout headlines — Copernicus |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Pricing plan size labels — StyreneB |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | Connector tile titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Default running-text — StyreneB |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | Code blocks — JetBrains Mono |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

#### Principles
Display sizes use weight 400 (regular), never bold. Negative letter-spacing (-0.3 to -1.5px) is essential — Copernicus without it reads as off-brand. The serif character is what gives Anthropic its literary, considered voice; switching to a sans-serif display would make Claude feel like every other AI tool.

Body type stays at weight 400 for paragraphs, weight 500 for labels and emphasized phrases. The sans body is humanist (StyreneB) — never geometric. Inter is an acceptable substitute because of its similar humanist proportions; Helvetica or Arial would be too neutral and break the warm-editorial feel.

#### Note on Font Substitutes
If Copernicus / Tiempos Headline is unavailable, **Cormorant Garamond** at weight 500 with -0.02em letter-spacing is the closest open-source approximation. **EB Garamond** is a fallback. For StyreneB, **Inter** is the closest match — both are humanist sans designed for screen reading. **Söhne** is another close alternative if licensed.

### Layout

#### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards, model comparison cards; `{spacing.lg}` (24px) for code-window cards and connector tiles.
- **Callout / CTA bands:** `{spacing.xxl}` (48px) inside coral callout cards; 64px inside the larger dark CTA band.

#### Grid & Container
- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often uses 6/6 split (h1 left, illustration right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop (Free / Pro / Team / Enterprise often), 1-up at mobile.

#### Whitespace Philosophy
The cream canvas + serif display + generous internal padding create an editorial pacing — Claude reads like a long-form magazine column rather than a marketing template. Whitespace between bands stays uniform at 96px; whitespace inside cards is generous (32px), letting type breathe.

### Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, top nav, hero bands |
| Soft hairline | 1px `{colors.hairline}` border | Inputs, sub-nav, occasionally on cards |
| Cream card | `{colors.surface-card}` background — no shadow | Feature cards, content cards |
| Dark surface card | `{colors.surface-dark}` background — no shadow | Code editor mockups, model showcase cards |
| Subtle drop shadow | Faint shadow at low alpha | Hover-elevated states (the system uses `0 1px 3px rgba(20,20,19,0.08)` rarely) |

The elevation philosophy is **color-block first, shadow rare**. Most depth comes from the cream-vs-dark surface contrast. Shadows are minimal. The dark surface mockups have their own internal product chrome (code editor scrollbars, line numbers, syntax highlighting) which adds detail without needing external shadows.

#### Decorative Depth
- The Anthropic spike-mark glyph (4-spoke radial asterisk) appears as a small black mark in the brand wordmark and inline as a content marker.
- Code editor mockups carry their own internal depth: syntax-highlighted text in muted blues / oranges / grays, line numbers in `{colors.muted-soft}`, status bars at the bottom in `{colors.surface-dark-elevated}`.
- Some hero illustrations use simple line-art with coral and dark-navy strokes on cream — minimal, hand-drawn-feeling, never photorealistic.

### Shapes

#### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved for badge accents and tiny dropdowns |
| `{rounded.sm}` | 6px | Small inline buttons, dropdown items |
| `{rounded.md}` | 8px | Standard CTA buttons, text inputs, category tabs |
| `{rounded.lg}` | 12px | Content cards (feature, pricing, code-window, model-comparison) |
| `{rounded.xl}` | 16px | Hero illustration container, the larger marquee components |
| `{rounded.pill}` | 9999px | Badge pills, "NEW" tags |
| `{rounded.full}` | 9999px / 50% | Avatar substitutes, icon buttons |

#### Photography & Illustrations
Claude's hero rarely uses photography. Instead it uses:
- Simple line-art illustrations with coral + dark-navy strokes on the cream canvas
- Code editor mockups (the dominant "hero" treatment on developer-focused pages)
- Terminal output mockups with monospace text on dark
- Model comparison cards (Opus / Sonnet / Haiku) with abstract geometric thumbnails

When photography is used (rare — mostly testimonials), avatars crop to perfect circles at 40px diameter.

### Components

#### Top Navigation

**`top-nav`** — Cream nav bar pinned to the top of every page. 64px tall, `{colors.canvas}` background. Carries the Anthropic spike-mark + "Claude" wordmark at left, primary horizontal menu (Product, Solutions, Use Cases, Pricing, Research, Company) center-left, right-side cluster with "Sign in" text-link, "Try Claude" `{component.button-primary}` (coral). Menu items in `{typography.nav-link}` (StyreneB 14px / 500).

#### Buttons

**`button-primary`** — The signature coral CTA. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), type `{typography.button}` (StyreneB 14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Active state `button-primary-active` darkens to `{colors.primary-active}` (#a9583e).

**`button-secondary`** — Cream button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}` (#252320), text `{colors.on-dark}`. Stays dark — the system never inverts to a light secondary on dark surfaces.

**`button-text-link`** — Inline text button, no background. Used for "Sign in" in the top nav and inline CTA links.

**`button-icon-circular`** — 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-color icon. Used for carousel arrows, share, "view more".

**`text-link`** — Inline body links in `{colors.primary}` (the coral). Underlined on press; the coral inline link is one of the system's most distinctive small details.

#### Cards & Containers

**`hero-band`** — Cream-canvas hero with a 6-6 grid: h1 + sub-headline + button row on the left, hero illustration card or product mockup card on the right. Vertical padding `{spacing.section}` (96px).

**`hero-illustration-card`** — A larger card holding the hero's right-side artifact — sometimes a coral-stroke line illustration on cream background, sometimes a dark code editor mockup. Background `{colors.canvas}` or `{colors.surface-dark}` depending on context, rounded `{rounded.xl}` (16px).

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (#efe9de — slightly darker cream), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Dark navy card showing actual Claude product chrome (chat interface, code editor, agent controls). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries text labels in `{colors.on-dark}` and product UI fragments below.

**`code-window-card`** — A specialized dark card showing a code editor with line numbers, syntax-highlighted code in `{typography.code}` (JetBrains Mono), and sometimes a "Run" button or terminal output panel below. Background `{colors.surface-dark}` with `{colors.surface-dark-soft}` for the inner code block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). The signature visual element of Claude Code product pages.

**`model-comparison-card`** — Used on the homepage's "Which problem are you up against?" section comparing Opus / Sonnet / Haiku. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries the model name, a short capability blurb, and a `{component.text-link}` to learn more.

**`pricing-tier-card`** — Standard tier card. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Carries the plan name in `{typography.title-lg}` (StyreneB), price in `{typography.display-sm}` (Copernicus serif!), feature checklist in `{typography.body-md}`, and a `{component.button-primary}` at the bottom.

**`pricing-tier-card-featured`** — The featured tier (typically "Pro" or "Team"). Background flips to `{colors.surface-dark}`, text inverts to `{colors.on-dark}`. The dark surface IS the featured-tier signal.

**`callout-card-coral`** — A full-bleed coral card carrying a major call-to-action. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px). The coral surface IS the voltage; the CTA inside uses an inverted button style (cream/canvas button on coral).

**`connector-tile`** — Used on the connectors page's integration grid. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding 20px. Each tile carries a logo at top, a `{typography.title-sm}` connector name, and a short description.

#### Inputs & Forms

**`text-input`** — Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`.

**`text-input-focused`** — Focus state. Border thickens or shifts to `{colors.primary}` (coral) for emphasis. Carries a 3px coral-at-15%-alpha outer ring.

**`cookie-consent-card`** — Bottom-right floating dark cookie banner. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). One of the few places dark surface appears at small scale on cream pages.

#### Tags / Badges

**`badge-pill`** — Small pill label used for category tags. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-coral`** — Coral-fill badge for "NEW", "BETA", featured highlights. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

#### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows on solutions / connectors pages. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

#### CTA / Footer

**`cta-band-coral`** — A pre-footer "Try Claude" CTA card. Full-width coral fill, white type, rounded `{rounded.lg}`, padding 64px. Carries an h2 in `{typography.display-sm}` (still serif!), a sub-line, and a cream-button CTA.

**`cta-band-dark`** — Alternative pre-footer band on developer-focused pages. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding 64px. Often pairs with a code-window card.

**`footer`** — Dark navy footer that closes every page. Background `{colors.surface-dark}` (#181715), text `{colors.on-dark-soft}`. 4-column link list at desktop covering Product / Company / Resources / Legal. Vertical padding 64px. The Anthropic spike-mark + "Anthropic" wordmark sits at the top in `{colors.on-dark}`. The footer never inverts.

### Do's and Don'ts

#### Do
- Anchor every page on the cream canvas. Pure white reads as "any other AI tool"; the warm tint is the brand differentiator.
- Use Copernicus serif for every display headline. Pair with StyreneB sans body. Negative letter-spacing on display sizes is non-negotiable.
- Reserve `{colors.primary}` (coral) for primary CTAs and full-bleed `{component.callout-card-coral}` moments. Don't paint accent moments coral elsewhere.
- Use `{component.product-mockup-card-dark}` and `{component.code-window-card}` to show actual Claude product chrome. Don't paint marketing illustrations of code when you can show real code.
- Pair `{component.feature-card}` (cream) with `{component.product-mockup-card-dark}` (navy) in alternating bands. The cream-to-dark rhythm is the brand's pacing mechanism.
- Use the Anthropic spike-mark glyph as the brand wordmark prefix. Never invert the mark to white-on-dark within the wordmark itself.
- Apply `{spacing.section}` (96px) between major bands.

#### Don't
- Don't use cool grays or pure white for canvas. Cream is the brand.
- Don't bold serif display weight. Copernicus at 700 reads as bombastic; the system stays at 400.
- Don't use cool blue or saturated cyan as a brand accent. The coral is the brand voltage.
- Don't put coral everywhere. The coral is scarce on individual elements and generous only on full-bleed coral callout cards.
- Don't use Inter for display headlines. The serif character is the brand voice.
- Don't repeat the same surface mode in two consecutive bands. The pacing alternates: cream → cream-card → dark-mockup → cream → coral-callout → dark-footer.
- Don't add hover state styling beyond what the system already encodes — primary darkens on press; nothing else changes.

### Responsive Behavior

#### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero h1 64→32px; hero-illustration-card stacks below content; feature grids 1-up; connector tiles 2-up; pricing 1-up; footer 4 cols → 1 |
| Tablet | 768–1024px | Top nav stays horizontal but tightens; feature cards 2-up; connector tiles 3-up; pricing 2-up |
| Desktop | 1024–1440px | Full top-nav with all menu items; 3-up feature cards; 4-up or 6-up connector tiles; 3-up pricing tiers |
| Wide | > 1440px | Same as desktop with more outer breathing room; max content width caps at 1200px |

#### Touch Targets
- `{component.button-primary}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36 — slightly under WCAG 44 but visually centered.
- `{component.text-input}` height is 40px.
- Connector tile entire card area is tappable; effective tap area >> 44px.

#### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; menu opens as a full-screen cream sheet.
- Hero band's 6-6 grid collapses to single-column on mobile — h1 + sub-head + buttons first, then the illustration / mockup card below.
- Feature grids reduce columns rather than scaling cards down.
- Pricing tier cards collapse 4 → 2 → 1; featured-tier dark surface stays visually distinct at every breakpoint.
- Code-window cards retain code legibility at every breakpoint by allowing horizontal scroll within the card rather than wrapping code lines.

#### Image Behavior
- Code blocks inside dark mockups stay at fixed font-size; horizontal scroll on mobile rather than wrapping.
- Hero illustrations scale proportionally; line-art strokes thin slightly on mobile.
- Avatar photos in testimonials crop to circles at every breakpoint.

### Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.feature-card}`, `{component.code-window-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay Copernicus serif 400 with negative tracking. Body stays StyreneB / Inter 400. The split is unbreakable.
6. Cream + coral + dark navy is the trinity. Don't introduce a fourth surface tone (no purple cards, no green sections).
7. When in doubt about emphasis: bigger Copernicus serif before bolder weight.

### Known Gaps

- Copernicus and StyreneB are licensed Anthropic typefaces and not available as public web fonts. Substitutes (Tiempos Headline / Cormorant Garamond / EB Garamond for serif; Inter / Söhne for sans) are documented in the typography section.
- The Anthropic radial-spike-mark is a brand glyph rendered as inline SVG; it's not formalized as a system token here. Treat it as a logo asset.
- Animation and transition timings (chat message reveal, code block typewriter effect on the homepage, agentic-flow diagram animations) are not in scope.
- Form validation states beyond `{component.text-input-focused}` are not extracted — error / success states would need a sign-up or feedback flow to confirm.
- The actual Claude product surface (claude.ai chat interface) shares some tokens with the marketing site but adds many product-specific components (chat bubbles, message tools, file upload chips, conversation history sidebar) that are out of scope for this marketing-surface document.
- The "agent" / "computer use" demo cards on certain pages display animated Claude controlling a browser — the static screenshot doesn't fully capture the animation chrome.

## Challenge brief

### 7 Days Free

[Start Generating Free](https://console.gmicloud.ai/?auth=signup) · [Join the Challenge](https://www.gmicloud.ai/hy-week?utm_source=social#challenge)

---

### The Lineup

### Hy Image 3.5 Preview, Unlocked

**Free · Image Generation + Editing**

#### Hy Image 3.5 Preview

Text and image in, up to 4K out. Text rendering and layout that holds together.

**Free for 7 days.** Standard pricing applies afterward.

[Docs](https://docs.gmicloud.ai/) · [Use via MCP Server](https://www.gmicloud.ai/mcp) · [GMI Cloud API](https://console.gmicloud.ai/user-console/ie/model-hub/image/hy-image-v3.5-preview)

| Capability | Details |
|---|---|
| Generation speed | ~20 seconds per image |
| Reference images | 5 per call |
| Output resolution | 1K–4K |

---

### The Hy Image Challenge

#### Join the Challenge

**Three tracks. Three winners. $1,800 in cash and credits.**

[Submit Your Work](https://www.gmicloud.ai/hy-week?utm_source=social#submit)

#### Winner Rewards

Each track has one winner. Every winner receives all four rewards:

| Reward | Details |
|---|---|
| Cash prize | $200 |
| GMI Cloud credits | $200 in credits for any model |
| Hy Image credits | $200 in GMI Cloud credits for Hy Image models only |
| Tech Week feature | Selected work shown at LA and SF Tech Week by the Tencent team |

#### Challenge Tracks

Three tracks, one submission. Pick the one that fits what you’re making.

| Track | Suitable for |
|---|---|
| **Type & Layout** | Posters, infographics, packaging |
| **Commercial** | Product shots, brand systems, ad creative |
| **Game Art** | Full UI screens, character sheets, scene concepts |

---

### What to Know Before You Enter

#### Who and What

##### Who Can Enter

Anyone, anywhere in the world.

##### What You Make

One piece or one set, for one track, made during the seven-day window.

##### Made on GMI

Generation must run on Hy Image 3.5 Preview served through GMI Cloud. Other models can support the workflow.

##### Show Your Work

Include the prompt or a description of the workflow.

#### Dates and Judging

| Item | Details |
|---|---|
| **Deadline** | Submit by October 1, 2026, 11:59 PM PT |
| **Judging** | GMI Cloud and Tencent Hunyuan review every eligible entry together |
| **Winners** | Three winners, one per track, announced October 8, 2026 |
| **One entry** | One submission per person. Pick your track and commit |

---

### Four Steps, Seven Days

#### Step 1 — Create a GMI Account

Free to create. Hy Image 3.5 Preview is unlocked for the week.

#### Step 2 — Make Something

Pick a track. You have seven days.

#### Step 3 — Post and Submit

Share your work on X, tagging [@gmi_cloud](https://x.com/gmi_cloud) and [@TencentHunyuan](https://x.com/TencentHunyuan), then submit through the form on this page.

#### Step 4 — Get Judged

GMI Cloud and Tencent Hunyuan review every entry. Winners are announced after judging.

---

### Links

- [Start Generating Free](https://console.gmicloud.ai/?auth=signup)
- [Join the Challenge](https://www.gmicloud.ai/hy-week?utm_source=social#challenge)
- [Submit Your Work](https://www.gmicloud.ai/hy-week?utm_source=social#submit)
- [Documentation](https://docs.gmicloud.ai/)
- [Use via MCP Server](https://www.gmicloud.ai/mcp)
- [GMI Cloud API](https://console.gmicloud.ai/user-console/ie/model-hub/image/hy-image-v3.5-preview)

## API contract

Source: model documentation supplied by the user in this conversation. This replaces the previous missing-contract blocker.

- Model: hy-image-v3.5-preview.
- Base: https://console.gmicloud.ai.
- POST /api/v1/ie/requestqueue/apikey/requests with Bearer GMI_API_KEY and JSON {model,payload}.
- payload.prompt: required text. payload.image: optional reference image URLs, up to five; each publicly reachable and under 20 MB.
- payload.size: explicit supported dimensions. Reframe generates at 1920x1080 and picks a documented <=2K aspect ratio for context edits.
- Other documented options: generate_max_pixels (1048576,2359296,4194304), seed (0=random). Reframe leaves these at provider defaults.
- Synchronous response usually completes in 10-60 seconds; allow at least 2 minutes. Reframe uses a 3-minute overall deadline.
- GET same path /{request_id} supports pending requests. Reframe polls only if POST reports queued or processing; it never resubmits automatically.
- Terminal statuses: success, failed, cancelled. Failure details: outcome.error.
- Success image: outcome.media_urls[].url. Top-level request_id and outcome.request_id are distinct trace identifiers; both are retained.
- Documented rate: $0.024 per image <=4,194,304 pixels; $0.032 above. Reference images do not affect price.
- No mask parameter is documented. Localization is enforced by Reframe's context-crop and target-rectangle compositor.

Observed initial live response: request 9bd046be-bb82-4c46-a069-a95408f83bd1, upstream 05f415a4-0616-4f66-a7f0-0bbe5cc719c5. Requested 1920x1080; decoded output 1920x1072. The app correctly uses decoded dimensions for regions and compositing.

## Verification notes

Historical record from September 26, 2026. The missing-contract and setup blockers below describe that verification run; the API contract above records the later contract and initial live response. These observations are not a current end-to-end test result.

This is a record of observed checks, not a claim that the full application passed end-to-end testing.

### Observed passing checks

- Read all of challenge.md before project changes.
- Ran npx getdesign@latest add claude; DESIGN.md was installed and read.
- Installed dependencies and generated package-lock.json.
- npm run check: backend syntax passed.
- npm run build: Vite production build passed.
- Upgraded Sharp from 0.34 to 0.35.4 after audit findings; npm reports zero vulnerabilities.
- GET http://127.0.0.1:5173/: HTTP 200 and Reframe title.
- GET /api/health: ok=true.
- GET /api/config: Hy ready=false, MiniMax=false, Cloudinary=false (honest setup state).
- POST /api/scenes with too-short prompt: HTTP 400.
- Valid generation request: job explicitly fails with unverified Hy contract error; no generated image or fake result.
- Existing GMI key authenticated on the documented model-list endpoint; no Hy request made.
- Synthetic pixel-level compositor measurement: source 128×96 RGB; target x=25,y=24,width=46,height=39; all 1,794 target pixels changed; zero of the 10,494 outside pixels changed. Sharp runtime 0.35.4. No synthetic image is stored or displayed as demo artwork.

### User checkpoints

| # | Checkpoint | Status |
| --- | --- | --- |
| 1 | Design system installed/understood | Passed |
| 2 | Hy generates real image | Blocked: exact contract unavailable |
| 3 | Generated image stored/displayed | Pending real image |
| 4 | Entities derived from image | Adapter implemented; live request pending credentials/image |
| 5 | Selection matches real region | UI wired; unverified on real scene |
| 6 | Natural language resolves target | Adapter/schema wired; live request pending |
| 7 | Hy localized edit | Blocked: exact contract unavailable |
| 8 | Edited region recomposited | Synthetic compositor check passed; real Hy result pending |
| 9 | Unaffected areas preserved | Outside-rectangle copy measured; real visual quality pending |
| 10 | Sequential edits | Pending |
| 11 | Undo/revert | Code present; end-to-end verification pending |
| 12 | Production build | Passed |
| 13 | Environment documented | Passed |
| 14 | Challenge requirements satisfied | Not complete |

### Browser and deployment

Installed kane-cli reported expired OAuth credentials and refresh failure. Its setup instructions require local login. Browser tests were not run; no screenshots, visual validation, or successful real interaction evidence is claimed. No alternative browser driver was used.

Docker/Railway configuration is supplied; no cloud deployment was executed.

### Next verification sequence

Once the real Hy contract and credentials are available, connect the adapter, generate the README scene, inspect actual M3 regions, perform the four documented edits, compare original/final, restore a version, restart to check persistence, and check the desktop/mobile browser UI. Record real provider provenance and retain submitted artifacts.

## Credential checks

Historical follow-up to the initial verification run. Account errors and adapter blockers below are observations from that time, not a fresh check of current credentials. The API contract above supersedes the missing-contract blocker.

Follow-up verification after the user populated .env. No secret values were printed or copied into reports.

| Check | Observed result |
| --- | --- |
| Project .env variables | All three providers have nonempty values |
| Local .env precedence | Fixed and verified; inherited GMI key and Anthropic base URL no longer override local project values |
| GMI authentication | HTTP 200 from documented model-list endpoint |
| MiniMax M3 live request | HTTP 402, insufficient_balance_error |
| MiniMax application error | Now explicitly asks for API-account credits |
| Cloudinary account ping | status=ok |
| Cloudinary SDK image upload | HTTP 403, both restricted and escalated execution |
| Cloudinary signed multipart upload | HTTP 403: Request forbidden due to missing permissions (actions=["create"]) |
| Hy generation | Fails explicitly because the required model-specific adapter remains unimplemented |
| Local page / health / config | HTTP 200 |
| Backend syntax / production build | Passed |
| Browser automation | Kane login still expired; browser interactions not verified |

### Changes made

- Added server/config.js: local .env overrides inherited variables in development; production keeps environment injection authoritative.
- Server imports that configuration before provider and storage initialization.
- MiniMax HTTP 402 now produces an actionable balance message.
- Cloudinary HTTP 403 now produces an actionable upload-permission message.

### Required to proceed

1. Add API credits to the MiniMax account associated with ANTHROPIC_API_KEY.
2. Use a Cloudinary key with create/upload permission, or grant that permission to the current key.
3. Obtain the documented Hy Image 3.5 Preview generation/edit contract and implement its adapter. A valid GMI key alone cannot complete this code.
4. Restore browser automation with kane-cli login.

No temporary verification image was successfully uploaded. No real scene generation, analysis, localized editing, or sequential-edit verification succeeded. Earlier verification records describe the previous pre-credential state; this report supersedes their credential findings.

## Compliance notes

Historical submission checklist from the initial implementation. References to missing artwork, provider evidence, and adapter connectivity describe that stage. The API contract above records later provider evidence; submission completion has not been verified here.

Source of truth: ../challenge.md, read completely before project inspection/code changes and reviewed again at handoff.

| Requirement | Status |
| --- | --- |
| One submission per person | No submission made. User must confirm no other entry. |
| One track | Game Art selected. |
| One piece or set made during seven-day window | No generated artwork yet. Public campaign page identifies Sep 25–Oct 1, 2026. |
| Hy Image 3.5 Preview served through GMI | Required; not yet connected or verified. No alternate generation model used. |
| Supporting models identified | MiniMax-M3 adapter for image understanding and edit reasoning; no executed model evidence yet. |
| Prompt or workflow included | Exact planned prompt and edit sequence in README; actual run evidence pending. |
| Suitable final Game Art | Detailed amusement-park concept planned; final artwork pending. |
| X post tagging @gmi_cloud and @TencentHunyuan | Not posted. Prepare only after actual results. |
| Campaign form submission | Not submitted: https://www.gmicloud.ai/hy-week#submit |
| Deadline awareness | Oct 1, 2026, 11:59 PM PT / Oct 2, 12:29 PM IST. |
| Winners | Oct 8, 2026. |
| Generation capability claims | No 4K claim in application; challenge says 4K, live campaign currently says 2K; actual supported parameters pending. |

### Submission material still needed

- Actual original and final Hy-generated images.
- Provider request IDs/timestamps and actual prompt/workflow description.
- Visible entity selection, localized edits and before/after evidence.
- Successful sequential edits and undo verification.
- User's one-entry/window eligibility confirmation.
- X post URL with both required tags.
- Completed campaign submission form.

Do not mark these complete based on a build passing or a polished empty workspace. This repository currently has no generated Game Art submission.
