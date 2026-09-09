# Product

## Project

allways-ui

## Goal

Bring every page of the Allways UI onto the design rules in DESIGN.md so the site reads as one professional product, the way Coinbase or Kraken do. Markets and Network are the reference pages and are already on the rules. Work through the Order of work section in DESIGN.md: miner detail first, then the Agents page, then swap and reservation detail pages, then the transaction tape statuses and dates, then a sweep of the whole codebase for the banned patterns listed there. Every step must keep lint, format check and build green, and must be checked visually against the Markets page before it is called done. Do not touch the order book, depth chart, rate matrix or rate card except to use their shared helpers. Never add colour beyond what DESIGN.md allows. Do not push to GitHub.

## Product Direction

Allways is a conversion market, not a brokerage: each direction (SOL → BTC,
BTC → SOL) is its own instrument, priced in the quote asset per one of the
base. There is no buy, no sell, no mid price anywhere in the UI. Green and
red mean the two sides of a market, the way an exchange colours bids and
asks, never a recommendation.

"Great" is a site where every page could have been drawn by the same hand
on the same day as the landing page: its eyebrows, display titles, brand
blue accent, HoverCards, buttons, spacing and mono data type, reused
exactly. The landing page is the reference; DESIGN.md lists its parts and
the rules. The job is to bring every other page onto them, in the order
DESIGN.md gives, and to prove each page with a screenshot beside the
landing page and Markets.
