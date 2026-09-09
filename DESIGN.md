# Allways UI design rules

One small set of rules covers every screen, the way it does on Coinbase or
Kraken. A page that follows its own rules is a bug. When a rule and an
existing screen disagree, the screen changes.

Markets and Network are the reference pages: flat, mono, hairlines, no
titles. Bring every other page to them.

## Type

- Two faces only. `FONTS.mono` (DM Mono) for anything that is data, a label,
  a control, or navigation: numbers, tickers, column headers, chips, tabs,
  captions, timestamps, statuses. `FONTS.body` (Inter) only for running
  prose a person reads as sentences: the Agents page copy, tooltips that
  are sentences, the footer paragraph.
- No display type in the app. The `display` variant and the condensed
  all-caps headline treatment belong to the landing page only. App pages
  never set a headline larger than the section-title size below.
- One scale, in rem:
  - 0.58 · micro caption (uppercase, letter-spacing 0.08em)
  - 0.62 · secondary mono label (column headers, hints)
  - 0.65 · chip (uppercase, letter-spacing 0.05em, weight 600)
  - 0.7 · section title (uppercase, letter-spacing 0.12em, weight 700)
  - 0.72 · table cell
  - 0.82 · emphasised number (weight 700, tabular)
  - 1.4 · the one big number a page is allowed (the rate card's headline)
  A number outside this scale is a bug. The performance strip's 2rem
  numbers on miner detail come down to 1.4.
- Numbers are `fontVariantNumeric: 'tabular-nums'` everywhere they sit in a
  column or change live.

## Colour

- Ink and paper do almost all the work. `text.primary`, `text.secondary`,
  `divider`, `surface.light`, `action.hover`, `action.selected`.
- Blue (`primary.main`) means exactly one thing: this is interactive or
  selected. Nav active tab, a focused control, the matrix flash. It is
  never decoration: no blue eyebrows, no blue numbers, no blue borders, no
  filled blue buttons in the app.
- Green and red (`MOVE_COLORS`) mean exactly one thing each: the two sides
  of a market (green where you send the base, red where you send the
  quote), a completed or failed status, an up or down move. Never a tint
  on a heading or a section.
- Asset brand colours (`asset.btc`, `asset.sol`, ...) appear only in the
  asset's own logo mark.

## Containers

- Flat. Sections are separated by 1px `divider` hairlines, not by cards.
  No drop shadows, no coloured left borders, no grey header bands, no
  rounded corners (`borderRadius: 0` is the site default and stays).
- A bordered box is allowed for exactly two things: an input group (the
  tape's filter bar) and a code or copy panel (the Agents bundle).
- Every app page sits in `PAGE_FRAME_SX` from
  `src/components/layout/pageFrame.ts`: the centred 1400 block, the same
  side padding, the same headroom under the nav. No page sets its own.

## Page titles

- Pages have no title. Markets, Network and every detail page open on
  their content. Section titles inside a page use `SectionHeading` (mono,
  0.7rem, uppercase). A subtitle is one line or nothing.
- A detail page opens with one breadcrumb-style back link in mono
  (`← Miners`, `← Transactions`) and then its identity row: the entity's
  name in the section-title style, its status chip, its key facts as a
  `LabelValue` row. Never a large Inter title.

## Details that must match everywhere

- Asset names always carry the network when the symbol is shared:
  `USDC (Arbitrum)`, never a bare `USDC` where another USDC exists on the
  page. Use the same label helper the rate matrix and order book use.
- Units are written one way: `BNB/TAO` in column headers and compact
  stats, `BNB per TAO` in a sentence. Never both forms in one panel.
- Dates and times come from one helper set in `src/utils/format.ts`:
  - relative: `38m ago` (`formatTimeAgo`)
  - wall clock: `Sep 9 02:06 PM` (the tape's format, 24h off, no seconds,
    no year inside the current year)
  - duration: `~5m` (`formatDurationSecs`)
  `toLocaleString()` with no options is banned; `formatUnixTime` is
  brought onto the tape's format and used everywhere a wall-clock time
  appears, including miner detail's "activated" and "as of" stamps.
- Amounts keep three significant digits below 1, two decimals from 1 to
  100, none above, so a BTC amount never rounds to 0.00. Rates keep
  `RATE_SIG_FIGS`. One helper each, used everywhere.
- Statuses render through one chip component: mono, uppercase, 0.65rem,
  square, a 1px border in the status colour and a faint tint, text in the
  status colour. The tape's coloured words and miner detail's pills both
  become this chip.
- Buttons: one text-button style (mono, uppercase, letter-spaced, ink on
  hover `action.hover`) and one inverted style for the selected state
  (paper on `text.primary`, as in `RangeChips`). No filled blue button, no
  outlined button with a contrasting border. The Agents page's copy
  buttons use the inverted style.
- Tooltips render through `RailTooltip`: capped width, small mono, short
  hover delay. Copy is one clause or a short keyed list, never a
  paragraph.
- Empty states are one mono sentence in `text.secondary`, centred, in the
  space the content would occupy. Not-found pages say what was looked for.
- Loading states are skeletons in the shape of the content, never a
  spinner.

## Order of work

1. Miner detail: page frame, back link, identity row in the shared style,
   asset labels with network, dates through the shared helper, performance
   numbers on the scale, status chip.
2. Agents: type on the scale, blue removed from eyebrows and buttons,
   buttons on the shared styles, panels flat with hairlines except the copy
   panel.
3. Swap and reservation detail pages: same pass as miner detail.
4. Tape: statuses through the chip, dates through the helper.
5. Sweep: grep for `toLocaleString(`, `borderRadius`, `primary.main`,
   `display` variant, `eyebrow` variant, font sizes off the scale; fix or
   justify each in a comment.

## Verification

`npm run lint && npm run format:check && npm run build` must pass. Then
look at the page: a screenshot of every page changed, compared against
Markets, before calling a step done.
