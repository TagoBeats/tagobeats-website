# TagoBeats — Branding & Design Reference

Reverse-engineered from the current site ([index.html](index.html), [music.html](music.html)). Keep this updated when the visual language changes.

## Identity

- **Name:** TagoBeats
- **Person behind it:** Robin Busse — Audio Engineer & Producer, based in Germany (DE)
- **Contact:** hello@tagobeats.com / music@tagobeats.com, IG @TagoBeats
- **What it is:** Beat catalog + music production studio, plus drone photography and studio media
- **Positioning line:** "Audio engineer and producer" (hero subhead — thin weight around a bold italic "and")

## Voice & Tone

- Short, confident, lowercase-feeling even when capitalized — no fluff, no salesy adjectives
- Section labels are terse and shouted in small caps mono, e.g. `TB CATALOG — 2026`, `GET IN TOUCH`, `ROBIN BUSSE · AUDIO ENGINEER & PRODUCER · DE`
- Nav/menu items are single words: Home, Catalog, About, Engineering, Media
- Descriptions favor concrete genre/format terms over marketing speak: "original hip-hop, trap and cinematic instrumentals," "stream, preview and license"

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background (primary) | `#12100E` | Page/section background |
| Background (deep) | `#0A0908` | Buttons, high-contrast panels, footer |
| Surface | `#1A1815` | Cards, player background |
| Text (primary) | `#ECE7DE` | Body text, warm off-white |
| Text (bright) | `#F2EEE6` | Headlines, brighter cream |
| Accent (signature) | `#00FDDC` | Links, section eyebrows, active states, glow accents — the TagoBeats teal/cyan |
| Accent (secondary glow) | `#00D2C4` | Ambient background fog gradients, layered with the primary accent |
| Accent (holo highlight) | `#ff5b8a` | Rare pop of pink inside the holographic sticker gradient only |

Text opacity is used heavily instead of new colors for hierarchy: `rgba(236,231,222, 0.4–0.88)` for secondary/tertiary text.

## Typography

- **Display / body:** Archivo (weights 400–800). Headlines use heavy weight (800) with tight/negative letter-spacing (`-0.03em` to `-0.045em`) and tight line-height (~0.86–0.9) for a huge, condensed poster feel.
- **Mono / labels:** Space Mono — used exclusively for eyebrows, timestamps, BPM/key tags, nav microcopy. Always uppercase, wide letter-spacing (`0.14em`–`0.3em`), small size (10–13px).
- Rule of thumb: **Archivo = the message, Space Mono = the metadata.**

## Visual Language

- Dark, near-black canvas with warm undertone (not pure black/blue-black)
- Soft ambient "fog" — large radial-gradient blobs in the teal accent, animated with slow drift (`tb-fog` keyframes, 22–41s loops), placed off-canvas at edges
- Fine film grain overlay (`feTurbulence` SVG filter, ~0.11 opacity, mix-blend `overlay`) for texture on hero
- Vignette via radial gradient to darken edges around focal content
- One signature interactive element: a holographic sticker/orb with mouse-tilt (perspective + rotateX/rotateY), holo rainbow foil gradient (`mix-blend:screen`), light glare following cursor — playful, physical, tactile touch in an otherwise minimal UI
- Section dividers: 1px hairline borders at `rgba(236,231,222,0.14)`
- Section-dot nav on the side (scroll-spy) with mono labels that fade in on hover

## Layout Conventions

- Full-height "snap" sections (`min-height:100vh`) — one idea per screen scroll
- Generous fluid padding via `clamp()` everywhere — scales smoothly mobile → desktop, no fixed breakpQoint jumps for spacing
- Section eyebrow pattern repeats throughout: small mono accent-colored label → large Archivo heading directly below
- Sticky/fixed top nav with gradient fade-to-transparent background so content scrolls underneath it

## Assets

- Font files: [fonts/](fonts/) — self-hosted Archivo woff2 subsets
- Favicon: [favicon.svg](favicon.svg)
- Holo sticker source art: [uploads_opt/holo-sticker-studio-680.jpg](uploads_opt/holo-sticker-studio-680.jpg) (680px optimized; original + sticker project removed 2026-07-05, recoverable from git history)
- Catalog covers: [uploads_opt/sound_selection/covers_800/](uploads_opt/sound_selection/covers_800/) (800px JPEGs) · plugin thumbnails: DeEsser_800.jpg, DubCheck_800.jpg, ReEsser_800.jpg in [uploads_opt/](uploads_opt/)

## SEO / Meta Copy Reference

- Home: "TagoBeats — Beats & Music Production" / "TagoBeats is a beat catalog and music production studio — stream, preview and license original beats, plus drone photography and studio media."
- Catalog: "TagoBeats: Beat Catalog — Stream, Preview & License Beats" / "Browse and license the full TagoBeats beat catalog — original hip-hop, trap and cinematic instrumentals. Stream, preview and buy directly via BeatStars."
