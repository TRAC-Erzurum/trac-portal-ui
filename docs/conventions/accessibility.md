# Accessibility

- All interactive elements are keyboard-focusable and show a visible focus indicator. Do not remove outlines without a replacement.
- Escape closes dialogs and sheets. reka-ui primitives provide focus trapping; keep it intact.
- Icon-only buttons need an accessible name (`aria-label`, or visible text for screen readers). Decorative icons get `aria-hidden="true"`.
- Images need meaningful `alt` text; decorative images use `alt=""`.
- Announce dynamic changes that a user cannot see (async results, counts) through a live region or a toast.
- Contrast: 4.5:1 for normal text, 3:1 for large text, in both light and dark themes.
- Never rely on color alone. Pair status colors with text or an icon.
- Headings follow a logical order: one `h1` comes from `AppLayout`; sections use `h3` with the section-title classes.
- Respect `prefers-reduced-motion` for any new animation.
