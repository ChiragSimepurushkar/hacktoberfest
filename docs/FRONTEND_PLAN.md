# Lab Twin — Frontend Plan (Dev C)

> Companion to `LAB_TWIN_PLAN.md`, `IMPLEMENTATION_PLAN.md` and `ROADMAP.md`.
> This file covers the whole frontend: design direction, screens, design system,
> architecture, build order and QA. It is written so Dev C can start building
> immediately and Dev A / Dev B know exactly what the UI expects from them.

---

## 0. TL;DR

- **One job per screen.** Home picks an action, Upload takes a photo, Analyzing waits, Simulation lets you play, Analysis explains. Nothing is crammed together.
- **Look:** warm paper background, editorial italic serif headlines, mono orange eyebrows, navy ink buttons, hairline borders, soft large-radius cards. Our own twist: a faint **graph-paper grid** on the simulation stage so the product feels like a lab notebook that came alive.
- **Stack:** Vite + React + TypeScript + React Router, Tailwind v4, Radix primitives (shadcn-style), Framer Motion, Zustand, TanStack Query, zod. Deployed as a **Render Static Site**.
- **Simulation stage** is an abstraction (`SimController`) that Dev B implements per engine. The UI never knows which engine is running.
- **Honest states everywhere:** unsupported, needs clarification, low confidence, timeout, API cold start. Each has its own calm, designed screen.
- **Demo safety:** a bundled-example mode that runs from fixtures with zero network, so a dead Wi-Fi or API never kills the demo.

---

## 1. Design Direction

### What we take from the reference screens
| Observed in references | Principle we adopt |
|---|---|
| Large italic serif headline over a quiet subline | Typography does the branding, not gradients or illustrations |
| Small mono uppercase orange eyebrow ("NEW ANALYSIS") | A consistent label voice for section starts |
| Warm off-white page, white cards, hairline borders | Calm, paper-like, low contrast chrome so content stands out |
| One dark navy primary button per view | Exactly one primary action per screen |
| Collapsible slim left sidebar | Navigation is present but quiet |
| Generous whitespace, 3 equal capability cards | Never more than 3 things competing for attention |
| Stepper (Upload, Analyze, Simulate) | The user always knows where they are in the flow |
| Analysis on its own page | Detail lives behind a deliberate click |

### What is ours (so it does not look like a copy or a template)
- **Graph-paper stage:** 24px grid, 4% ink opacity, subtle margin line on the left. Only on the simulation stage and the upload drop zone.
- **Ink-and-annotation language:** inferred values get a small hand-drawn-style dot marker; issues get a margin-note style callout.
- **Domain colour system for vectors** (gravity, normal, applied, friction, net) used consistently across stage, results and analysis.
- **Photo peek:** the original handwritten page can slide in beside the simulation. Proof that the sim came from the notebook.
- **No stock gradients, no glassmorphism, no emoji, no purple.**

---

## 2. Flow and Routes

```
Home  ──►  Upload  ──►  Analyzing  ──►  Simulation  ──►  Analysis
 │                                          ▲
 ├──► Examples (run a bundled sample) ──────┘
 └──► History (reopen a saved run) ─────────┘
```

| Route | Screen | Single job | Primary action |
|---|---|---|---|
| `/` | Home | Explain the product, start | "Upload a page" |
| `/new` | Upload | Get one clean photo | "Analyze" |
| `/analyze` | Analyzing | Wait with confidence | (none, "Cancel" secondary) |
| `/sim/:id` | Simulation | Play with the model | Play / Step |
| `/sim/:id/analysis` | Analysis | Understand Gemma's reasoning | "Back to simulation" |
| `/examples` | Examples | Try without a photo | Open a sample |
| `/history` | History | Reopen past runs | Open |

Sidebar items: **Home, Examples, History**; **Settings** in the footer. "New" button pinned at the bottom of the sidebar.

---

## 3. Screens

### 3.1 Home `/`
Purpose: say what it is in 3 seconds, offer one big action.

```
┌────────┬──────────────────────────────────────────────────┐
│ ◇ Lab  │  TURN YOUR NOTES INTO                            │
│  Twin  │  Live Simulations.            (italic serif 64px)│
│        │  Photograph a handwritten diagram and watch it   │
│ Home   │  come to life.                                   │
│ Examples│ [ Upload a page ]  Try an example →             │
│ History│                                                  │
│        │  ┌ Free-body ┐ ┌ Circuit ┐ ┌ State machine ┐     │
│ Settings│ │ Physics   │ │ Electr. │ │ CS / Algorithms│    │
│ [New]  │  │ drag forces│ │ edit    │ │ step through   │    │
│        │  └───────────┘ └─────────┘ └───────────────┘     │
└────────┴──────────────────────────────────────────────────┘
```
- Right side of the hero: a slightly rotated photo of a real notebook page (static asset) fading into the grid. Decorative, not interactive.
- The three cards open **instant bundled examples** of that type (fixture-driven, no network). This gives judges an immediate "wow" and doubles as the offline demo path.
- Nothing else on the page. No recent runs, no stats.

### 3.2 Upload `/new`
Purpose: get one good photo.

```
┌──────── stepper: ① Upload ── ② Analyze ── ③ Simulate ───────┐
│ ┌───────────────────────────────┐   Try an example          │
│ │  ⌓ cloud icon                 │   ▢ Free-body        ›    │
│ │  Upload your notebook page    │   ▢ Circuit          ›    │
│ │  Drag & drop, paste, or browse│   ▢ State machine    ›    │
│ │  JPG, PNG or HEIC             │                           │
│ │  [ Choose image ]  [ Camera ] │                           │
│ └───────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```
After a file is chosen, the same card switches to a **preview state**: image fills the card, with `Rotate`, `Retake`, and a navy **Analyze** button. Nothing else.

Behaviours:
- Drag and drop, click to browse, **paste from clipboard**, and `<input type="file" accept="image/*" capture="environment">` for mobile camera.
- HEIC support through lazy-loaded `heic2any` (only if the file is HEIC).
- Client-side normalisation before upload: respect EXIF orientation (`createImageBitmap` with `imageOrientation: "from-image"`), resize longest side to ~1600px, JPEG at ~0.85. Target under 1.5 MB. Keeps latency low and avoids backend size errors.
- **Quick quality check** (cheap canvas maths): blur estimate (variance of Laplacian) and brightness. Show a soft inline hint such as "This looks a bit dark. Retake for better results?" It never blocks the user.
- Validation messages are inline and plain: wrong file type, over size, unreadable file.

### 3.3 Analyzing `/analyze`
Purpose: make the 3 to 8 second wait feel intentional.

```
        [ uploaded photo thumbnail with a soft scan line ]
              Analyzing your diagram…
   Gemma 4 is reading your notes and extracting structure.
        ◉ Classifying diagram type
        ◉ Extracting elements and values
        ○ Validating structure
        ○ Preparing simulation
                 This usually takes a few seconds
                         [ Cancel ]
```
- **Real progress if possible:** ask Dev A to emit Server-Sent Events (`classified`, `extracted`, `validated`) from `/extract`. Each event ticks a real step. If SSE is not ready, fall back to a single request and an indeterminate shimmer with time-based step labels, and do not show checkmarks that claim completion before the response arrives.
- `AbortController` for Cancel. Back button returns to the preview with the photo kept.
- On success: short 300 ms fade then route to `/sim/:id`.
- On failure: this same screen morphs into the matching error state (see section 7).

### 3.4 Simulation `/sim/:id`
Purpose: play. The stage is the hero; everything else is secondary.

```
┌ ← Back    Free-body diagram    [1 issue found]   [View Analysis →]┐
│ Interactive simulation based on your handwritten diagram.        │
│ ┌──────────── STAGE (graph paper) ────────────┐ ┌ Parameters ───┐ │
│ │      N = 42.4 N      F = 40 N               │ │ Mass (kg) 5   │ │
│ │          ↑          ↗                       │ │ ━━●━━━━━━━    │ │
│ │        ▭ block                              │ │ Applied F  40 │ │
│ │   f ↙        ↓ mg = 49 N                    │ │ Angle     30° │ │
│ │ ────────────  30°                           │ │ Friction μ .2 │ │
│ │                          [📷 Original photo]│ ├ Results ──────┤ │
│ └─────────────────────────────────────────────┘ │ Net 31.1 N    │ │
│ [ ▶ Play ] [ Step ] [ Reset ]      Speed 1×      │ Accel 6.22m/s²│ │
└──────────────────────────────────────────────────┴───────────────┘
```
Rules to keep it clean:
- Two columns on desktop (stage ~65%, side panel ~35%). **Side panel has two cards only: Parameters and Results.**
- The analysis is **not** shown here. A small amber pill in the header ("1 issue found") and a **View Analysis** button open the Analysis page. Zero issues shows a quiet green "No issues found".
- `inference_trace` appears as a tiny blue dot next to a control label. Hover or focus shows a tooltip: "Inferred from arrow length, not labelled in your photo."
- **Photo peek:** a small button on the stage opens a slide-over with the original photo, so the user can compare. Close with Esc.
- Per-type content below.

**Free-body**
- Draggable force arrows on the stage (pointer events, touch friendly). Dragging updates magnitude and angle live.
- Parameters: mass, surface angle, friction μ, and a collapsed "Forces" list (one row per force: magnitude and angle).
- Results: net force (parallel), acceleration, direction. Overlay toggles: components, net vector.
- Transport: Play, Step, Reset, Speed.

**Circuit**
- Click a component to edit its value in a small popover (number + unit stepper, e.g. 220 Ω).
- Results: total current, voltage and current per component, shown in a compact table.
- Toggle: animated current flow.
- No transport bar. Simulation is continuous.

**State machine**
- Input field for a string, plus a visual **tape** that shows the input with a moving head.
- Buttons: Step, Run, Reset. The current state glows; taken transition highlights.
- Result chip at the end: Accepted or Rejected. A trace list sits under it, collapsed by default.

### 3.5 Analysis `/sim/:id/analysis`
Purpose: show that Gemma understood, not just parsed.

Layout, single readable column (max 720px), cards stacked:
1. **Concept explanation**: 2 to 3 sentences.
2. **Detected issues**: one card per issue with a severity icon (not colour alone), a `location` chip, the issue text, the suggested fix, and a **Show on diagram** link that returns to the simulation with `?focus=<field path>` so the stage highlights it. Empty state: "No issues found. Everything checks out."
3. **Extracted values**: table with value, unit and a badge: `Read directly`, `Inferred`, or `Computed` (computed means derived by the engine, not stated in the JSON). Hovering `Inferred` shows Gemma's reasoning.
4. **Original photo** thumbnail (click to enlarge).
5. **Raw extracted JSON**: collapsed accordion with a Copy button.

Stretch (M4+): **Apply suggested fix** button that patches the parameter in the simulation and returns the user there. High demo value if time allows.

### 3.6 Examples `/examples`
Grid grouped by type, 2 to 3 samples each (thumbnail, title, type chip). Click runs the sample from fixtures instantly and opens the simulation.

### 3.7 History `/history`
List of past runs: thumbnail, type chip, title, time. Search box, delete action, reopen on click. Stored client-side (IndexedDB), because the backend is stateless. Friendly empty state with a link to Upload. A storage adapter interface (`HistoryStore`) lets us swap IndexedDB for Backboard later without touching UI.

### 3.8 Settings (small modal, not a page)
- **Demo mode** switch: use bundled fixtures instead of the API.
- Backend status indicator (online, warming up, offline).
- Clear history.
- Keyboard shortcuts list (`?` opens it).

---

## 4. Design System

### 4.1 Tokens (light theme first; dark is optional later)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FAF8F4` | App background |
| `--surface` | `#FFFFFF` | Cards |
| `--sunken` | `#F3F0EA` | Inputs, tab tracks, tables |
| `--line` | `#E7E2D9` | Hairline borders |
| `--ink` | `#14181F` | Primary text |
| `--ink-2` | `#4A5160` | Secondary text |
| `--muted` | `#8A8F99` | Placeholders, hints |
| `--navy` | `#0B1B3A` | Primary button |
| `--accent` | `#D9531E` | Mono eyebrows |
| `--info` | `#2F5FD0` | Inferred dot, links |
| `--ok` | `#1F8A4C` | Read directly, success |
| `--warn` | `#B7791F` | Warnings |
| `--err` | `#C0392B` | Errors |
| Vector colours | gravity `#D9531E`, normal `#2F5FD0`, applied `#C0392B`, friction `#1F8A4C`, net `#14181F` | Stage and results |

Stage background: `linear-gradient` grid lines every 24px at about 4% ink, plus a faint vertical margin line at 32px.

### 4.2 Typography
| Role | Font | Notes |
|---|---|---|
| Display | **Instrument Serif** (italic) | Headlines only; 44 to 64px |
| UI | **Geist Sans** or Inter | 13/14/16px body |
| Mono | **JetBrains Mono** or Geist Mono | Eyebrows (11px, 0.12em tracking, uppercase), numbers (`tabular-nums`) |

Self-host through Fontsource so fonts never depend on a CDN. `font-display: swap` plus preload for the display font to avoid layout jump.

### 4.3 Shape, depth, motion
- Radius: 8 (controls), 12 (inputs, chips), 20 (cards, drop zone).
- Shadow: two-layer soft (`0 1px 2px rgba(20,24,31,.04), 0 8px 24px rgba(20,24,31,.04)`). Borders do most of the work.
- Motion: 150 to 250 ms ease-out for hover and fades; spring (stiffness ~300, damping ~30) for slide-overs and sheets. Page transitions are a quick fade and 8px rise. All motion respects `prefers-reduced-motion`.
- Do **not** animate live simulation numbers; update them directly so they never lag the physics.

### 4.4 Component inventory
`AppShell`, `Sidebar`, `TopBar`, `Button` (primary / secondary / ghost / icon), `Card`, `Eyebrow`, `TypeChip`, `Dropzone`, `ImagePreview`, `Stepper`, `ProgressSteps`, `ParamSlider` (slider + numeric field + inferred dot), `NumberField`, `ResultStat`, `Badge` (read directly / inferred / computed), `IssueCard`, `Tooltip`, `Popover`, `Sheet` (mobile bottom sheet), `SlideOver` (photo peek), `Tabs` / `Segmented`, `Toast`, `EmptyState`, `ErrorState`, `Skeleton`, `Kbd`, `TransportBar`, `StateTape`.

Build these once, then screens become composition. A hidden `/dev/kit` route renders every component and state as a living style guide (cheaper than Storybook for a hackathon).

---

## 5. Simulation Stage and the Mount Contract

The stage is the only place where engines appear. The frontend talks to a typed interface that Dev B implements per engine.

```ts
// agree on this with Dev B at the next checkpoint
export interface SimController {
  mount(container: HTMLElement): void;           // idempotent, StrictMode safe
  destroy(): void;                                // frees engine, listeners, RAF
  getParams(): ParamDef[];                        // drives the control panel
  setParam(path: string, value: number): void;    // e.g. "forces[2].magnitude"
  onResults(cb: (r: ResultMap) => void): Unsubscribe;
  onSelect?(cb: (path: string | null) => void): Unsubscribe;  // click on stage
  highlight?(path: string | null): void;          // used by "Show on diagram"
  transport?: { play(): void; pause(): void; step(): void; reset(): void;
                setSpeed(x: number): void; state(): "idle" | "running" | "paused" };
}

export interface ParamDef {
  path: string;            // field path, matches audit.inference_trace[].field
  label: string;
  unit?: string;
  min: number; max: number; step: number;
  value: number;
  group?: string;          // e.g. "Forces"
}
```
- **Path-based params** are the key. The same `path` string links a slider, an `inference_trace` entry, an issue location and a stage highlight. One `FIELD_META` map gives each path its label, unit and group.
- `ParamDef[]` makes the Parameters card generic: the frontend renders sliders from data and never hard-codes per-type forms (except the state-machine tape).
- Engines are **lazy-loaded per type** (`import()` inside the route) so the bundle stays small.

Engine notes for rendering:
- **Free-body:** Matter.js on canvas, with an **SVG overlay** for vectors (crisp at any zoom, easy pointer dragging). `react-three-fiber` is kept **off the critical path**: a 3D scaffold adds bundle size and risk for a 2D problem. Keep it only if the team wants a 3D stretch. Flag this at the next checkpoint since the earlier plan mentions it.
- **Circuit:** CircuitJS runs in an iframe or via its JS API. Dev B confirms which embed options hide its menus and sidebar. We style around it with our own readout panel fed from the API values. Fallback: our own SVG schematic renderer driven by Dev B's solved values.
- **State machine:** Cytoscape.js themed with our tokens (node fill white, 1.5px ink stroke, current state navy with soft ring, accepting states double border).

---

## 6. Frontend Architecture

### 6.1 Stack
| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 18 + TypeScript | Fast, simple static deploy |
| Routing | React Router | Plain SPA routes |
| Styling | Tailwind v4 + CSS variables | Tokens map directly |
| Primitives | Radix UI (shadcn-style, copied in) | Accessible by default |
| Motion | Framer Motion | Page and panel transitions |
| Client state | Zustand | Current run, settings |
| Server state | TanStack Query | `/extract` mutation, retries, abort |
| Validation | zod | Mirrors pydantic schema on the client |
| Persistence | `idb-keyval` | History in IndexedDB |
| Icons | lucide-react | Consistent line icons |
| Toasts | sonner | Minimal toasts |
| Tests | Vitest + Testing Library; Playwright smoke | Fixture-driven |

### 6.2 Folder structure
```
src/
  app/            router, providers, AppShell
  pages/          Home, Upload, Analyzing, Simulation, Analysis, Examples, History
  components/
    ui/           Button, Card, Badge, Slider, Tooltip, Sheet, ...
    domain/       Dropzone, ProgressSteps, ParamPanel, ResultsCard, IssueCard, StateTape
  sim/
    types.ts      SimController, ParamDef, ResultMap
    registry.ts   diagram_type -> lazy loader
    free_body/    (Dev B)   circuit/   (Dev B)   state_machine/   (Dev B)
  api/
    client.ts     extract(image, signal) -> ExtractResponse
    fixtures.ts   fixture adapter (same interface as client)
    schema.ts     zod schemas mirroring the contract
  lib/            image.ts (normalize, blur check), fieldMeta.ts, format.ts
  store/          run.ts, settings.ts, history.ts
  styles/         tokens.css, fonts.css
public/fixtures/  free_body.json, circuit.json, state_machine.json (+ sample photos)
```

### 6.3 Data layer
- `ExtractClient` interface with two implementations: `HttpClient` and `FixtureClient`. Chosen by `VITE_USE_FIXTURES` or the Demo mode switch. Swapping fixtures for live data is a one-line change.
- Every response is parsed with zod. A parse failure becomes a designed error state, never a crash.
- The current run (image, response, params) lives in Zustand and is saved to IndexedDB on success, so `/sim/:id` survives a refresh.
- Direct links to `/sim/:id` load from history; unknown ids show a "Run not found" state.

### 6.4 Interaction rules
- Pointer events only (one code path for mouse, touch, pen).
- `ResizeObserver` on the stage container; engines resize without re-extraction.
- Slider changes call `setParam` directly (throttled to animation frames) and never trigger re-render of the whole page.
- Cleanup on unmount: `destroy()`, cancel RAF, remove listeners. Guard against React StrictMode double mounting.

---

## 7. Empty, Error and Edge States

Each is a designed full-card state with an icon, one sentence, and one clear action.

| Situation | Trigger | Message (tone: calm, specific) | Action |
|---|---|---|---|
| Unsupported diagram | `status: "unsupported"` | "We couldn't find a free-body, circuit or state-machine diagram on this page." | Try another photo, See examples |
| Needs clarification | `needs_clarification` set | "Part of this page is hard to read: {description}." | Retake photo |
| Extraction failed | `status: "error"` | "We couldn't read this page reliably." | Try again, Retake |
| Blurry / dark photo | client check or low confidence | "This looks a bit dark. A brighter photo reads better." | Retake, Continue anyway |
| Timeout / network | request fails | "That took too long." | Retry, Switch to demo mode |
| Backend warming up | health check slow | "Waking up the server. This can take up to a minute the first time." | Wait (auto retry) |
| Schema mismatch | zod parse fails | "We got an unexpected response." | Retry |
| File too large / wrong type | client | Inline under drop zone | Choose another file |
| Unknown run id | route | "We couldn't find that run." | Go to History |
| No history | empty | "Nothing here yet." | Upload a page |

---

## 8. Responsive and Accessibility

**Breakpoints:** mobile `<640`, tablet `640 to 1024`, desktop `>=1024`.
- **Mobile:** sidebar becomes a top bar with a menu sheet. Upload is camera-first (large Camera button). Simulation: stage on top at ~60vh, controls in a **bottom sheet** that snaps between a collapsed handle and half height. Analysis is a single column. Add a web manifest so it can be installed to the home screen (nice for a desk camera workflow).
- **Tablet:** collapsible sidebar, stage and panel stacked or side by side depending on width.

**Accessibility baseline**
- All controls keyboard operable; visible 2px focus ring in `--info`.
- Sliders are real `role="slider"` with arrow-key steps and an adjacent numeric field.
- Results region uses `aria-live="polite"`, throttled so screen readers are not flooded.
- Severity is communicated with icon plus text, not colour alone.
- Contrast AA for body text on `--paper` and `--surface`.
- Stage has a text summary alternative ("Block of 5 kg on a 30° incline with 4 forces").
- Reduced motion: disable scan line, springs and page transitions.

---

## 9. Performance and Reliability

- **Code splitting:** each engine is a lazy chunk. Target under 250 KB gzip for the initial route.
- **Preload** the display font and the Home hero image; lazy load everything else.
- **Cold start on Render:** the free web service can sleep when idle. On app load, ping `/health`; if slow, show the "warming up" state and keep the Upload page usable. Before the live demo, hit the API once manually.
- **Offline demo mode:** all three examples and their photos are bundled. If the API fails, offer "Switch to demo mode" in one click.
- **Error boundary** around the stage so an engine crash shows a friendly state and a Reset button, never a white screen.
- **Image pipeline** runs in the main thread with `createImageBitmap`; fine at 1600px. Move to a worker only if it janks.

---

## 10. Deployment (Render only)

- **Static Site** on Render: build `npm run build`, publish `dist`.
- SPA rewrite: `/*` to `/index.html`.
- Env var `VITE_API_URL` pointing to the backend web service; backend enables CORS for the static site origin and the `.tech` domain.
- `render.yaml` Blueprint (frontend part):

```yaml
services:
  - type: web
    name: labtwin-web
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: VITE_API_URL
        value: https://labtwin-api.onrender.com
```
- Stand this up in **hour 0 with a placeholder page** so deployment is never a last-minute scramble. Enable PR preview deploys if available.
- Add the `.tech` domain after the first successful deploy; verify HTTPS and the SPA refresh on a deep link.

---

## 11. Build Order for Dev C

Aligned with M0 to M5. Everything through hour 3 runs on fixtures only.

| Time | Deliverable | Priority |
|---|---|---|
| 0:00 to 0:30 | Contract lock with team; **agree on `SimController`**; Render placeholder deployed | P0 |
| 0:30 to 1:15 | Vite project, tokens, fonts, `AppShell` (sidebar + top bar), Button/Card/Badge, router skeleton | P0 |
| 1:15 to 2:15 | Home, Upload (drop, paste, preview, normalise, quality hint), `FixtureClient`, Examples | P0 |
| 2:15 to 3:15 | Simulation page shell: stage host, ParamPanel from `ParamDef[]`, ResultsCard, TransportBar, inferred-dot tooltips. Mount Dev B's free-body first (**Checkpoint 2**) | P0 |
| 3:15 to 4:00 | Analyzing screen + `HttpClient` + error states, swap fixtures for live data for one type (**Checkpoint 3**) | P0 |
| 4:00 to 4:45 | Analysis page (concept, issues, values table, raw JSON), header issue pill, `Show on diagram` deep link | P0 |
| 4:45 to 5:30 | History (IndexedDB), photo peek slide-over, mobile bottom sheet, Settings modal with Demo mode | P1 |
| 5:30 to 6:00 | Polish pass, a11y check, 3-type smoke test, demo rehearsal, record video | P0 |

**Cut line if behind:** drop History, Settings, mobile sheet, photo peek and Apply-fix; keep Home, Upload, Analyzing, Simulation, Analysis, Examples and the three error states.

**Stretch (only after M5):** Apply suggested fix, shareable links, dark theme, PWA install, voice narration hook.

---

## 12. QA and Demo Checklist

Visual
- [ ] One primary button per screen
- [ ] No screen shows more than one card group above the fold
- [ ] Headline font loads without a jump; numbers use tabular figures
- [ ] Stage grid, vectors and labels crisp on retina and at 125% zoom

Behaviour
- [ ] Upload via drop, browse, paste and mobile camera
- [ ] HEIC from an iPhone converts correctly
- [ ] Each of the 7 error states reachable and readable
- [ ] Back button always returns somewhere sensible, with the photo preserved
- [ ] Refresh on `/sim/:id` restores the run
- [ ] Slider drag stays at 60 fps on a mid laptop

Demo
- [ ] Demo mode works with Wi-Fi off
- [ ] API warmed up 5 minutes before presenting
- [ ] One live photo prepared per type plus 2 backups
- [ ] Browser zoom and window size fixed for the projector

---

## 13. Decisions to Confirm at the Next Sync

1. **`SimController` and `ParamDef` shape** with Dev B (section 5). This is the biggest unblocker.
2. **Path-based field naming** (`forces[2].magnitude`) shared across `inference_trace`, issues and params, with Dev A.
3. **SSE progress events** from `/extract` (`classified`, `extracted`, `validated`). If not feasible, we use the timed fallback.
4. **Optional `confidence` (0 to 1) per inferred field** in the schema, so the UI can show confidence. If it is absent, the UI simply omits it.
5. **No react-three-fiber on the critical path**: Matter.js canvas plus SVG overlay instead. Agree to drop or keep as stretch.
6. **CircuitJS embedding method** and which options hide its chrome, with Dev B.
