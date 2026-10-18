# Kaptio design system

Kaptio is an editorial workspace for stories in every language. Its signature is warm paper, charcoal ink, vermilion accents and acidic pale green caption highlights. Interfaces should feel like a considered creative tool: precise lines, generous margins, compact labels, and expressive typography.

## Tokens

Paper `#f5f4ef`; surface `#ffffff`; ink `#20211f`; secondary ink `#75796f`; accent `#eb5036`; accent deep `#c63c26`; highlight `#e7f76f`; divider `#dfdfd7`; dark canvas `#151814`.

Manrope is the interface face. Instrument Sans is used for headlines. Noto Sans script families provide language-aware shaping with native-script labels and explicit RTL support. Scale: 11 / 12 / 14 / 16 / 20 / 28 / 40 / 64 / 88 px; fluid headlines use clamp. Spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.

## Motion

Use short 180–300ms ease-out feedback, deliberate 600ms section reveals and subtle pointer magnetism. Animate transforms and opacity. Never block scrolling. Respect reduced-motion and reduced-data preferences. Drag feedback is immediate; snap guides appear only near a target. Passive ambient motion pauses when the tab is hidden.

## Composition

Use asymmetric two-column editorial sections, thin dividers and small all-caps annotations. Corners are 8–16px for media and 6px for controls. Avoid gratuitous cards, gradients and decorative icon collections. Use Lucide line icons, real video, native scripts and actual editor controls as the visual material.

## Interaction

Every control needs a visible keyboard focus, a clear label and an honest status. Video coordinates and font sizes use the same normalized canvas units in preview and export. Uploaded videos stay on the device until transcription or export is requested. Project state autosaves locally.
