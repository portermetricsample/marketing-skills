---
name: porter-remotion-animation
description: Build Porter Metrics-branded Remotion animations. Use when the user asks to create a video/animation with Remotion for Porter Metrics, or mentions marketing platform icons (Meta Ads, Google Ads, Shopify, HubSpot, Claude, ChatGPT, Gemini, BigQuery, etc.) in a Remotion project. Applies the Porter design system (violet primary, pink accent, dark background) and enforces legibility patterns over the brand video background.
---

# Porter Metrics Remotion Animation

Use this skill whenever you are building a Remotion composition branded for Porter Metrics — typically in projects like `~/Desktop/Porter-MCP/` or any Remotion repo that has `public/Background.mp4` and the Porter platform icons in `public/`.

## 0. Workflow checklist (follow in order)

1. **Scout the assets.** `ls <project>/public/` — confirm `Background.mp4` exists and note the exact icon filenames (e.g. `Meta Logo Icon.png`, `Google Ads Icon.png`, `Shopify Icon.png`, `HubSpot Icon.png`, `Claude Icon.png`, `Chat GPT icon.png`, `Gemini Icon.png`, `BigQuery Icon.png`, etc.). Filenames often contain spaces — use them as-is in `staticFile()`.
2. **Install `@remotion/media`** if not yet installed (required for `<Video>`): `npx remotion add @remotion/media`.
3. **Design the scenes** before writing code. Sketch 2-4 scenes with clear purposes (problem → bridge → solution → outcome works well). Target 12-18 s total at 30 fps, 1920×1080.
4. **Apply the design tokens** from §2 verbatim — do not invent new colors.
5. **Mount the shared `<Background />`** (§3) at the root of the composition; every scene sits on top of it.
6. **Build scenes** using the patterns in §4.
7. **Validate with stills** — render one frame from each scene with `npx remotion still <CompId> out/frameN.png --frame=N --scale=0.4` and read them back. Check alignment and text legibility before declaring done.
8. **Text output must always be in English** (Porter's product language).

## 1. Project conventions

- **Composition size:** 1920×1080 @ 30 fps.
- **File layout:** one file `src/Composition.tsx`, scene components (`Scene1`, `Scene2`, …) inside. Register each top-level composition in `src/Root.tsx`.
- **Export any reusable `Background` / sub-composition** so the user can also register it as a standalone composition (e.g. a 7-minute loop of just the background).
- **Images:** always `<Img src={staticFile("Exact File.png")} />`. Never `<img>` or CSS `background-image`.
- **Video:** `import { Video } from "@remotion/media"` — never the `<OffthreadVideo>` from core unless the user asks. Always `muted loop` for the Background.

## 2. Porter Metrics design tokens

Paste this block at the top of `Composition.tsx`:

```tsx
const COLORS = {
  bgDeepest: "#020617",
  bgDark: "#0f172a",
  bgIndigo: "#1e1b4b",
  primary: "#7c3aed",
  primaryLight: "#8b5cf6",
  primaryLighter: "#a78bfa",
  primaryMuted: "#c4b5fd",
  pink: "#f472b6",
  textWhite: "#ffffff",
  textLight: "#f1f5f9",
  textMuted: "#cbd5e1",
  textSubtle: "#94a3b8",
  // Pastel card system
  mintBg: "#EBFFFC",  mintText: "#047857",
  yellowBg: "#FFF3D9", yellowText: "#b45309",
  greenBg: "#DBFFEA",  greenText: "#15803d",
  blueBg: "#E7F5FF",   blueText: "#1d4ed8",
  pinkBg: "#FFECF2",   pinkText: "#be185d",
};

const FONT_STACK =
  "Gilmer, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
```

### Typography rules

- **H1 / scene titles:** `fontSize: 68-88`, `fontWeight: 800`, `letterSpacing: "-0.03em"`, `lineHeight: 1.05-1.1`, `color: COLORS.textWhite`.
- **Eyebrows (uppercase labels):** `fontSize: 22-26`, `fontWeight: 600`, `letterSpacing: "0.2em-0.28em"`, `textTransform: "uppercase"`, `color: "#c4b5fd"` or `"#e9d5ff"` — never the brand violet alone, it will wash out on the video.
- **Body:** `fontSize: 20-26`, `fontWeight: 400-500`, `color: COLORS.textLight` with `maxWidth: ~720` for paragraphs.

### Gradient-text rule (critical)

The brand gradient is `#a78bfa → #f472b6`, but this gradient **blends into the Background.mp4** (which is itself violet→pink). Always use the **luminous variant** for emphasis words:

```tsx
background: `linear-gradient(to right, #ffffff 0%, ${COLORS.primaryLighter} 70%, ${COLORS.pink} 100%)`,
WebkitBackgroundClip: "text",
WebkitTextFillColor: "transparent",
backgroundClip: "text",
filter: "drop-shadow(0 2px 16px rgba(124, 58, 237, 0.45))",
```

And on the parent H1, add:

```tsx
filter: "drop-shadow(0 4px 28px rgba(2, 6, 23, 0.65))",
```

### Text legibility on Background.mp4

Every text element that sits on the video needs a shadow:

- White/light text: `textShadow: "0 2px 16px rgba(2, 6, 23, 0.7)"`
- Eyebrow / muted text: same, possibly with `0.65` opacity.
- Gradient text: use `filter: drop-shadow(...)` (text-shadow doesn't work with `WebkitTextFillColor: transparent`).

## 3. Background component (copy verbatim)

```tsx
import { AbsoluteFill, staticFile } from "remotion";
import { Video } from "@remotion/media";

export const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bgDeepest }}>
      <Video
        src={staticFile("Background.mp4")}
        muted
        loop
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Legibility vignette — darken edges, slight center dim */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(2, 6, 23, 0.15) 0%, rgba(2, 6, 23, 0.55) 70%, rgba(2, 6, 23, 0.7) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
```

Mount it once at the composition root, then layer scenes on top with `<Sequence>`.

If the user asks for a **standalone long-duration background composition** (e.g. "a 7-min loop of the background"), register a separate `Composition` in `Root.tsx` whose component is just `<Background />`. Same component → single source of truth.

## 4. Canonical patterns

### 4a. Platform pill (icon card + label)

```tsx
type PlatformPillProps = { label: string; icon: string; size?: number };

const PlatformPill: React.FC<PlatformPillProps> = ({ label, icon, size = 130 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 28,
        background: "rgba(255, 255, 255, 0.98)",
        boxShadow:
          "0 20px 60px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: size * 0.18,
      }}
    >
      <Img src={staticFile(icon)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
    <div
      style={{
        fontFamily: FONT_STACK,
        fontWeight: 600,
        fontSize: 20,
        color: COLORS.textLight,
        letterSpacing: "-0.01em",
        textShadow: "0 2px 14px rgba(2, 6, 23, 0.75)",
      }}
    >
      {label}
    </div>
  </div>
);
```

### 4b. Animations — always driven by `useCurrentFrame`

- **Enter with overshoot:** `Easing.bezier(0.34, 1.56, 0.64, 1)` over ~0.6–0.8 s.
- **Calm entrance:** `Easing.bezier(0.16, 1, 0.3, 1)` over ~0.8 s with a 20–40 px `translateY`.
- **Travel / position tweens:** `Easing.bezier(0.45, 0, 0.55, 1)`.
- **Exit:** `Easing.in(Easing.cubic)` over ~0.6 s.
- **Stagger siblings:** add `i * 0.15-0.25` seconds per index.
- **Never** use CSS transitions, `@keyframes`, or Tailwind `animate-*` classes — Remotion won't render them.

### 4c. Data-flow lines (platforms → Claude)

SVG `<line>` with a violet-to-pink gradient stroke, `strokeDasharray="6 8"`, `strokeDashoffset={-frame * 2}` for the "marching ants" effect. Opacity fades in on arrival, fades slightly after.

### 4d. Pulse ring on arrival

A `border: 2px solid #a78bfa` circle whose `width` / `height` and `opacity` are driven by a brief `interpolate` window (e.g. `[2.2s, 2.6s, 3.0s] → [0, 1, 0]`). Gives a satisfying "data arrived" beat.

### 4e. Value / outcome cards

Use the pastel system (mint / yellow / green / blue / pink). Each card:

```tsx
{
  padding: "0 34px",
  height: 140,
  width: 720,
  borderRadius: 24,
  background: card.bg,
  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.55), 0 0 0 1px rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
  gap: 24,
}
```

Stack them vertically with `gap: 28`, appear with overshoot easing, stagger by 0.25 s.

## 5. Layout rules (the ones that bit us)

- **Shared-edge alignment:** when a heading sits next to a column of cards, both must share the same `left` pixel value. Use a constant (`const RIGHT_LEFT = Math.round(width * 0.42)`) and reuse it. **Do not** mix `translate(-50%)` centering with left-anchored neighbors.
- **Titles never below the middle of the frame** when platforms ring the center — keep titles in the top 25 % or bottom 20 % of the frame, not competing with the ring.
- **The bottom 80 px** is caption territory only. Main content stops above it.
- **Premount every `<Sequence>`** with `premountFor={fps}` so images are ready when the scene starts.

## 6. Suggested scene template (3-scene problem → bridge → outcome)

```
Scene 1 (0-4 s): "The problem" — scattered platform pills + eyebrow + H1 + subtitle.
Scene 2 (4-9 s): "The fix" — platforms travel into a ring around Claude at center,
                 dashed connector lines, pulse ring, top title "Bring it all to Claude".
Scene 3 (9-15 s): "With Claude, you can" — Claude shifts to the left; 3 pastel cards
                 fan in on the right with value props; bottom caption.
```

Register in `Root.tsx`:

```tsx
<Composition
  id="MarketingToClaude"
  component={MarketingToClaude}
  durationInFrames={450}   // 15 s @ 30 fps
  fps={30}
  width={1920}
  height={1080}
/>
```

## 7. Validation commands

```bash
cd <project-dir>

# Still frames per scene — read them back with the Read tool
npx remotion still <CompId> out/s1.png --frame=60  --scale=0.4
npx remotion still <CompId> out/s2.png --frame=200 --scale=0.4
npx remotion still <CompId> out/s3.png --frame=380 --scale=0.4

# Live preview
npx remotion studio

# Final render
npx remotion render <CompId> out/<name>.mp4
```

After the stills render, **actually read the PNGs back** and inspect for: (a) alignment between title and cards, (b) gradient text visible over the pink area of the video, (c) no element clipping the bottom 80 px.

## 8. Common pitfalls — check for these before handing off

- Gradient text defined as `violet → pink` only (no white anchor) disappears over the pink half of the video. **Always** start the gradient at `#ffffff`.
- Eyebrow color `#a78bfa` washes out. Use `#c4b5fd` or `#e9d5ff` with a `textShadow`.
- A title at `bottom: 90` collides with platforms ringed around the centre. Move the title to `top` or shrink the ring.
- Cards centered with `translate(-50%)` while the title uses a raw `left: %` — they visually drift apart. Pick one anchoring strategy per column.
- Forgetting to install `@remotion/media` — `<Video>` from `@remotion/media` is required; the core `<Video>` has a different API.
- Writing copy in Spanish when the brand requires English.

## 9. When the user asks for a new animation

1. Ask (or assume from context) the **narrative** — what outcome are we pitching? Which platforms matter?
2. Propose a 3-scene outline in one short message before coding.
3. Implement against §1–§4, validate against §7, and only then report done.
4. Keep the composition file a single `Composition.tsx` unless it grows past ~900 lines.
