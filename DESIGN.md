# Allways UI design rules

The landing page is the reference. Every other page is built from the
landing page's parts, in its type, its colour, its spacing, and its
details, so the whole site reads as one product drawn by one hand. When a
rule and an existing screen disagree, the screen changes.

Read `src/components/landing/*` and `src/components/HoverCard.tsx` before
touching any page: they are the parts list.

## Type

Three roles, each one face and one job:

- **Display** (`variant="display"`: Inter 900, uppercase, tight
  letter-spacing, line-height 1) for titles. Sizes:
  - page or section title: `{ xs: '1.75rem', md: '2.5rem' }`,
    letter-spacing `-0.03em` (the landing `Section` title)
  - card title: `1.15rem`, weight 800, letter-spacing `-0.01em`
- **Eyebrow** (`variant="eyebrow"`: mono 0.7rem, letter-spacing 0.2em,
  uppercase, brand blue) sits above every display title, one short phrase:
  `Bittensor · Subnet 7`, `How a transaction works`, `Miner · uid 15`.
- **Body** (`FONTS.body`, Inter) for prose only: `0.85rem` in cards and
  panels, `0.95rem`–`1.25rem` for a lead paragraph, `text.secondary`,
  line-height 1.5–1.55, max width 620.
- **Mono** (`FONTS.mono`, DM Mono) for anything that is data, a label, a
  control or navigation: numbers, tickers, column headers, chips, buttons,
  timestamps, statuses, captions. The scale, in rem:
  - 0.58 micro caption (uppercase, letter-spacing 0.08em)
  - 0.62 secondary label (column headers, hints)
  - 0.65 chip (uppercase, letter-spacing 0.05em, weight 600)
  - 0.7 eyebrow and section caption (uppercase, letter-spacing 0.12em)
  - 0.72 table cell
  - 0.8 button label (uppercase, letter-spacing 0.12em)
  - 0.82 emphasised number (weight 700)
  - 0.85 card step number (letter-spacing 0.1em, brand blue)
  - 1.4 the one big number a page is allowed (the rate card's headline)
- Numbers are `fontVariantNumeric: 'tabular-nums'` wherever they sit in a
  column or change live.
- Nothing else. No Inter headings in other weights, no Inter numbers, no
  mono titles pretending to be headings, no font size off these lists.

## Colour

- Ink and paper do the work: `text.primary`, `text.secondary`,
  `text.disabled`, `divider`, `surface.light`, `action.hover`,
  `action.selected`, `background.default`.
- **Brand blue** (`primary.main`) is the accent and appears in exactly
  these places: eyebrows, the primary button, a card's step number or
  icon, the active nav tab, a card border on hover, a focused control, the
  matrix flash, and at most one highlighted phrase in a display title (the
  hero's second line). Never as text colour for data, never a tinted
  background, never a section border.
- **Green and red** (`MOVE_COLORS`) mean one thing each: the two sides of a
  market (green where you send the base asset, red where you send the
  quote, as an exchange colours bids and asks), an up or down move, a
  completed or failed status. Never a tint on a heading or section.
- Asset brand colours only inside the asset's own logo mark.
- The hero's blue wash and circle line-work are the landing page's alone.

## Containers and spacing

- Square corners everywhere (`borderRadius: 0`). No shadows.
- Sections are separated by 1px `divider` hairlines. A section that has a
  title uses the landing `Section` rhythm: eyebrow, display title with
  `mb: { xs: 4, md: 6 }`, then content.
- Cards are `HoverCard`: 1px `divider` border, blue border on hover,
  padding `{ xs: 2.5, md: 3 }`, contents in a `Stack` with `gap: 1.75`.
  Card grids use `spacing: { xs: 2, md: 3 }`. A card is a unit of
  information a person reads, not a wrapper for a table.
- Tables and data panels are flat with hairline row dividers, never inside
  a card. An input group (the tape's filter bar) and a code or copy panel
  (the Agents bundle) may take a 1px border.
- Every app page sits in `PAGE_FRAME_SX` from
  `src/components/layout/pageFrame.ts`: the landing page's centred 1400
  block and side padding `{ xs: 2, sm: 3, md: 6 }`, so content edges line
  up with the hero and the landing sections on every route. No page sets
  its own frame. Vertical rhythm inside a page uses the landing steps:
  `py: { xs: 6, md: 10 }` between major sections, `gap: 1.75` inside a
  card, `mb: 1` eyebrow to title.

## Buttons and controls

- **Primary button**: filled brand blue, square, mono 0.8rem uppercase
  letter-spacing 0.12em, `px: 4, py: 1.5`, no shadow, no hover darkening
  (the hero's "Open the markets"). One per view at most.
- **Text link button**: mono 0.8rem uppercase letter-spacing 0.12em,
  `text.secondary`, blue on hover, with a trailing arrow when it leads
  somewhere (the hero's "For agents").
- **Segmented control / toggle**: `RangeChips` style, borderless mono, the
  selected item inverted paper-on-ink.
- **Select**: `MonoSelect`.
- Nothing else: no outlined buttons, no icon-only buttons except the nav's
  social marks and the info glyph.

## Pages

- Markets and Network open on their content; they have no title. Their
  content is the site's most dense data and already sits in the frame.
- Every other page (Agents, miner detail, swap detail, reservation detail,
  not-found) opens with an eyebrow and a display title in the landing
  `Section` rhythm. A detail page's eyebrow names the entity and its id
  (`Miner · uid 15`); its title is the thing itself in a few words; a mono
  back link (`← Miners`) sits above the eyebrow.
- The Agents page is already close: keep its eyebrow, display title, blue
  primary button and bordered copy panel; bring its other type onto the
  scale and its secondary button onto the text-link style.

## Workspaces

A dense page (Markets) is a workspace: every piece is a panel a person can
drag by its title and resize from its corner, the way a terminal lets them
build their own desk, and the arrangement is remembered per browser. The
`Workspace` component (`src/components/workspace`) is the one way to build
this. Panels wear the landing card (square hairline, blue on hover) with a
mono uppercase title row as the drag handle, an optional control slot on
the right of that row, and a body that scrolls on its own. The grid is 12
columns, 24px rows, the landing 24px gutter. A page ships its own default
arrangement and a "Reset layout" link brings it back. Add a new piece as a
panel, never as a fixed block beside the grid.

## Details that must match everywhere

- Asset names carry the network whenever the symbol is shared:
  `USDC (Arbitrum)`, never a bare `USDC` where another USDC exists on the
  page. Use the label helper the rate matrix and order book use.
- Units are written one way: `BNB/TAO` in column headers and compact
  stats, `BNB per TAO` in a sentence. Never both in one panel.
- Dates and times come from one helper set in `src/utils/format.ts`:
  relative `38m ago` (`formatTimeAgo`), wall clock `Sep 9 02:06 PM` (the
  tape's format: no seconds, no year inside the current year), duration
  `~5m` (`formatDurationSecs`). Bare `toLocaleString()` is banned;
  `formatUnixTime` is brought onto the tape's format and used everywhere a
  wall-clock time appears.
- Amounts keep three significant digits below 1, two decimals from 1 to
  100, none above, so a BTC amount never rounds to 0.00. Rates keep
  `RATE_SIG_FIGS`. One helper each, used everywhere.
- Statuses render through one chip: mono 0.65rem uppercase, square, 1px
  border in the status colour, faint tint, text in the status colour. The
  tape's coloured words and miner detail's pills both become this chip.
- Tooltips render through `RailTooltip`: capped width, small mono, short
  delay. Copy is one clause or a short keyed list, never a paragraph.
- Empty states are one mono sentence in `text.secondary`, centred, in the
  space the content would take. Not-found pages say what was looked for.
- Loading states are skeletons in the shape of the content, never a
  spinner.
- Never buy, sell, or a mid price anywhere. Each direction is its own
  instrument, priced in the quote asset per one of the base.

## Order of work

1. Miner detail: page frame, back link, eyebrow + display title, facts as
   `LabelValue` rows, quotes and addresses as flat tables with asset labels
   carrying the network, dates through the shared helper, performance
   numbers on the mono scale, status through the shared chip.
2. Agents: type onto the scale, secondary button onto the text-link style,
   panels onto `HoverCard` or flat, everything else kept.
3. Swap and reservation detail pages: the miner detail pass.
4. Tape: statuses through the chip, dates through the helper.
5. Sweep the codebase for `toLocaleString(`, `borderRadius` other than 0,
   `primary.main` outside the allowed places, Inter used for data, font
   sizes off the scale; fix or justify each in a comment.

## Verification

`npm run lint && npm run format:check && npm run build` must pass. Then
look: a screenshot of every page changed, beside the landing page and
Markets, before a step is called done.
