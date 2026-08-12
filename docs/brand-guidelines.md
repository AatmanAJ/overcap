# Overcap brand guidelines

## Overcap Instrument

Overcap Instrument is Overcap's standalone visual system. It should feel like a dependable piece of monitoring equipment: precise, calm and immediately legible. It is deliberately product-led. Parent-company branding does not appear in the app experience.

The product name remains **Overcap**. “Overcap Instrument” is an internal design-system label; it is not appended to the wordmark or window title.

## Brand principles

1. **Operational, not theatrical.** Show the useful reading first. Decoration never competes with live usage.
2. **Warm, not clinical.** Light mode uses a mineral canvas rather than white; dark mode uses warm charcoal rather than black.
3. **One signal.** Signal orange marks the current reading or the action that matters now.
4. **Human control.** Language is short, literal and calm. Avoid AI tropes, hype, magic language and corporate filler.

## Mark

The Overcap mark combines an open **O** with a horizontal **cap**. The opening suggests live headroom; the orange cap is the threshold being watched.

- Primary app mark: dark square, off-white open O, Signal Orange cap bar.
- Inline mark: one-colour O/cap construction using the surrounding text colour.
- Tray mark: solid monochrome template artwork. Never place colour in a macOS template icon.
- Keep clear space equal to the cap-bar thickness around the mark.
- Do not add gauges, needles, circuit traces, gradients, glow or generative-AI motifs.

## Colour

### Light

| Token    | Value     | Use                              |
| -------- | --------- | -------------------------------- |
| Canvas   | `#F3F1EA` | Window background                |
| Surface  | `#FCFBF7` | Cards, menus and sheets          |
| Ink      | `#12161B` | Headings and primary figures     |
| Body     | `#343A40` | Reading text                     |
| Muted    | `#5C646B` | Captions and secondary values    |
| Rule     | `#C9C7BE` | Dividers                         |
| Edge     | `#747A7F` | Strong boundaries and focus      |
| Track    | `#DEDCD4` | Meter tracks                     |
| Signal   | `#F04B2F` | Current state and primary action |
| Warning  | `#A36500` | Approaching a cap                |
| Critical | `#B52C2C` | Cap reached or failure           |

### Dark

| Token    | Value     | Use                              |
| -------- | --------- | -------------------------------- |
| Canvas   | `#0E1115` | Window background                |
| Surface  | `#151A20` | Cards, menus and sheets          |
| Ink      | `#F2F0E9` | Headings and primary figures     |
| Body     | `#C7C9C6` | Reading text                     |
| Muted    | `#91979D` | Captions and secondary values    |
| Rule     | `#343B43` | Dividers                         |
| Edge     | `#66717C` | Strong boundaries and focus      |
| Track    | `#232930` | Meter tracks                     |
| Signal   | `#F04B2F` | Current state and primary action |
| Warning  | `#E8B04B` | Approaching a cap                |
| Critical | `#FF6B62` | Cap reached or failure           |

Provider colours are identity data and must remain unchanged.

## Typography

Use Inter for interface copy, headings and the wordmark. Use JetBrains Mono for figures, reset times, costs, versions and technical labels. The restrained two-face system keeps the product operational without turning it into a terminal pastiche.

- Figures always use tabular lining numerals.
- Labels use sentence case unless the data itself is conventionally uppercase.
- Use weights from 400 to 600; reserve 600 for compact headings and actions.
- Never use italics, condensed display type or monospace for paragraphs.

## Voice

Write like an instrument readout with a helpful operator beside it.

- Prefer: “New build ready. Restart to switch.”
- Prefer: “Couldn't reach Claude. Retrying.”
- Prefer: “Nothing connected yet. Add a provider in customise.”
- Avoid exclamation marks, anthropomorphism and claims that the product is intelligent.

## Asset map

- `assets/overcap-icon.svg` — master colour app mark at 1024 × 1024.
- `assets/overcap-icon.png` — raster master.
- `assets/overcap-tray.svg` — monochrome tray source.
- `assets/overcap-tray-gauge.svg` — parseable geometry for the live Windows/Linux tray gauge.
- `assets/overcap-social.svg` — 1200 × 630 social artwork.
- `assets/overcap-share-receipt.svg` — sample receipt artwork matching the exported canvas.
- `src/lib/OvercapMark.svelte` — monochrome inline mark.
- `src-tauri/icons/` — generated platform icons.

## Accessibility

Never communicate warning or critical state by colour alone: retain the percentage, label and contextual copy. All text and focus indicators must meet WCAG AA against their actual surface. Signal Orange uses Ink text when it is a filled control.
