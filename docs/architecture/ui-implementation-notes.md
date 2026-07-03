# UI Implementation Notes

## Status

- Living UI guidance document
- Seeded from the current web app redesign
- Intended for future agents implementing or extending UI work
- May be updated as the product visual system evolves

## Purpose

This document explains the current UI direction in `apps/web` and records the decisions that future agents should preserve unless explicitly asked to change them.

It is not a pixel-perfect spec. It is a design and implementation guide so future UI work stays coherent instead of drifting toward generic dashboard styling.

## Current Visual Direction

The current UI direction is a paper-collage editorial workspace, not a standard SaaS dashboard.

Core traits:

- warm paper-like background
- visible texture and layered surfaces
- serif body typography with condensed geometric display typography
- tape, cutout, and print-inspired accents
- muted earthy palette instead of sterile grayscale or purple startup styling
- layouts that feel like a crafted digest workspace rather than an admin console

This direction was established in the recent web restyle commit:

- `Restyle web app with paper collage UI`

## Design Goals

The UI should feel:

- editorial
- tactile
- intentional
- slightly analog
- calm but not bland

The UI should not feel:

- like a default component library
- like a generic B2B dashboard
- glossy or futuristic
- heavily animated
- dark-mode-first
- purple-on-white startup aesthetic

## Implementation Source Of Truth

Current styling patterns live primarily in:

- `apps/web/app/globals.css`
- `apps/web/components/AppNav.tsx`
- `apps/web/app/(app)/app/layout.tsx`
- `apps/web/app/(app)/app/page.tsx`
- related onboarding/settings/digest page components

Future UI changes should inspect the current CSS and existing page structure before introducing new patterns.

## Visual System Decisions

### Color system

The current palette is built around warm paper and ink colors:

- `--paper-base`
- `--paper-soft`
- `--paper-card`
- `--paper-tape`
- `--paper-shadow`
- `--ink`
- `--ink-soft`
- `--line`
- `--line-strong`
- `--accent-rust`
- `--accent-coral`
- `--accent-gold`
- `--accent-teal`
- `--accent-charcoal`

Implications:

- backgrounds should stay warm, soft, and layered
- surfaces should look like paper cards, not flat app panels
- accents should be sparse and meaningful
- new colors should fit this palette family unless a deliberate redesign is requested

### Typography

Current typography has a deliberate split:

- body copy uses a serif stack
- headings, brand, and key stat text use a condensed sans-serif stack

Implications:

- preserve the editorial contrast between body and display text
- avoid replacing current typography with default system sans stacks everywhere
- short labels, nav items, stats, and headings can stay uppercase or compact where already established

### Surface treatment

The UI uses:

- semi-opaque paper cards
- soft shadows
- thin ink-like borders
- occasional tape-like decorative labels
- layered textured backgrounds

Implications:

- new panels should inherit the same physical paper metaphor
- avoid glassmorphism, neon glows, or sharp enterprise cards
- if adding new containers, prefer existing `panel` and related visual rules before inventing a new surface language

### Layout style

Current pages use:

- strong page headers
- card/grouped sections
- asymmetrical editorial layouts where useful
- moderate spacing with visible structure

Implications:

- avoid over-compressing everything into dense tables unless the content requires it
- avoid giant empty white space without structural framing
- preserve a sense of designed composition instead of stacking generic rectangles

## Interaction Style Decisions

### Controls

Current forms and actions should feel sturdy and legible:

- clear button shapes
- visible borders
- uppercase action language where already used
- direct labels over ornamental UI

Implications:

- prioritize clarity over novelty in forms
- continue using straightforward form sections and field labels
- if a flow becomes more dynamic later, keep the same visual language rather than introducing app-like pill forests or floating AI chat chrome by default

### Motion

Current motion is minimal.

Guidance:

- small hover movement is acceptable
- page-level reveal or stagger may be introduced if subtle and meaningful
- avoid constant micro-animation
- avoid animation that fights the print/editorial feel

### Navigation

The app currently uses a simple workspace-style top bar with:

- strong brand treatment
- concise nav links
- lightweight utility area

Guidance:

- preserve the “workspace / edition” framing
- do not turn navigation into a generic sidebar unless product complexity clearly requires it
- if navigation grows, extend the current language before replacing it

## Product-Specific UI Guidance

### Onboarding and settings

These flows currently read like structured setup pages.

Future implementations should keep:

- clear sectioning
- direct labels
- digest/workspace framing
- visible status cues

If personalization moves to free-text preference capture:

- the UI should still feel like a crafted editorial setup experience
- avoid making it look like a raw prompt playground
- free-text input should feel integrated into the product, not bolted on as a generic AI textarea

### Digest and history views

These should feel closer to reading and reviewing an edition than browsing logs.

Guidance:

- prioritize scanability
- preserve source visibility and delivery status clarity
- support richer editorial formatting if digest detail expands later
- avoid turning digest history into a pure CRUD table unless scale demands it

### Future hidden-bucket personalization UI

Users should not see internal bucket mechanics.

Implications for UI:

- language should describe “your interests,” “what you want to follow,” or “what you want more/less of”
- never expose hidden bucket IDs, internal matching scores, or canonicalization jargon in normal UI
- if explanations are needed, phrase them in user terms such as relevance, focus, and refinement

## Agent Rules For Future UI Work

When implementing UI changes, future agents should:

- inspect current `apps/web` styles first
- preserve the paper-collage editorial direction unless explicitly asked to redesign
- prefer extending existing classes, variables, and layout patterns over introducing unrelated ones
- avoid defaulting to generic component-library aesthetics
- keep the UI readable on both desktop and mobile
- ensure new UX language matches the product voice already implied by the current app

Future agents should not:

- replace the visual system with a generic SaaS dashboard style without explicit instruction
- introduce purple-heavy branding or dark-mode-first styling by default
- expose backend personalization internals in the normal user interface
- add unnecessary AI-chat styling unless the feature actually requires a conversational UI

## Safe Extension Patterns

These are safe to add if needed:

- additional paper-style panels
- structured multi-step onboarding sections
- richer digest cards
- inline feedback/refinement controls
- subtle editorial iconography or dividers
- improved mobile stacking for header, nav, and form sections

These should be treated cautiously:

- large new color families
- component-library imports that override the visual tone
- dense enterprise tables
- sidebar-first layouts
- overly glossy gradients
- high-motion interactions

## Suggested Update Process

When future UI work materially changes the design system, update this document with:

- what changed
- why it changed
- what future agents should preserve

Keep this file focused on durable UI decisions, not one-off implementation notes.

## Current Bottom Line

Sipnews web UI should continue to feel like a private editorial digest workspace with tactile paper styling, not a default dashboard.

Future UI work should preserve:

- warm editorial atmosphere
- strong typographic contrast
- paper-like surfaces
- restrained but intentional accents
- user-facing simplicity over backend/internal complexity
