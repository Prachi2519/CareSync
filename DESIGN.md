# CareSync Design System

CareSync should feel like calm clinical infrastructure: precise, quiet, fast, and trustworthy. The visual bar is a modern operations product, not a hospital brochure and not a generic SaaS template.

## Principles

1. **Clarity before decoration.** Every screen has one obvious task and one primary action.
2. **Dense, not cramped.** Operational data stays visible, with spacing used to show relationships rather than to make cards look impressive.
3. **Clinical calm.** Ink, mineral, and teal form the core palette. Green, amber, and red are reserved for semantic status.
4. **Cards must earn their place.** Use cards for selectable records, bounded workflows, and secondary context. Use dividers and whitespace for ordinary sections.
5. **Motion explains state.** Short entrance, hover, and loading transitions only. Respect reduced motion.

## Typography

- Primary: Manrope, 400–800.
- Labels and metadata: Manrope with tabular numbers where relevant.
- Display headings use tight tracking and balanced wrapping.
- Body copy is 16px minimum with a 1.6 line height.
- Eyebrows are 12px, bold, uppercase, and never substitute for a page title.

## Color

- Ink: `#102f38`
- Text: `#284b54`
- Muted: `#647b82`
- Canvas: `#f6f9f9`
- Surface: `#ffffff`
- Border: `#dce7e8`
- Primary teal: `#087d91`
- Primary hover: `#076577`
- Accent green: `#07845f`
- Semantic colors are never the only status signal.

## Geometry

- 4px spacing foundation; common rhythm: 8, 12, 16, 24, 32, 48, 64.
- Controls: 10px radius.
- Panels: 14px radius.
- Large marketing surfaces: 20px radius maximum.
- Shadows are rare and low contrast. Borders and surface tone define most elevation.

## Product UI

- Navigation uses a quiet rail and one unmistakable active state.
- Dashboard metrics form one grouped strip rather than four floating cards.
- Page headers orient the user, state the job, and expose at most two actions.
- Search and filters sit directly above the records they control.
- Empty, error, and loading states preserve the final layout.

## Responsive

- Desktop app content maxes at 1240px.
- Tablet collapses secondary context beneath the primary workspace.
- Mobile uses a compact top bar and bottom navigation with safe-area padding.
- Sticky elements must never cover content; every interactive target is at least 44px.
