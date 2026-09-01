# Process overview

## What I built

**Sounding** — a puzzle game played by echo. A click sends a ripple of dots that
stops dead at geometry, so you never see the level, only where it blocked you.
A flat slice of something larger: "an idea I've had for a 3D game for some time
based around sound. You step and see the world as you step."

Built in one session outside the repo and brought in at the end, so the history
below is the port, not the making of it.

## The moments that mattered

**A single ping can't draw a shape.** The first level pinged a solid letter and
rendered one enormous shadow with no letter in it: from a point source you only
ever see a near edge. The obvious fix was to let stopped dots linger as an outline —
exactly what the design rules out. Instead the wavefront became a deep *band*:
rings short of the geometry are whole, rings past it are bitten, and the
boundary through the band is the near edge. Found by rendering frames in
headless Chrome and looking, not by reading code.
[`f6f15d9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f6f15d9)

**Slots in the level 3 slab** — the change that came from playing.

> make level 3 have small gaps in the large cube that the dots, when clicking on
> the outside, can go through. put two on the left and right sides.

It "seemed confusing just clicking and NOTHING happens until you get to the very
specific spot where it's permitted — it just seemed like one big cube. The slots
mean there's a hint for the player." Not a marker on the floor and not dropping
outside pings — two slots, so a ping from outside gets a beam in. The first cut dead-ended on `7`,
which has no left-hand stroke, so each slot now finds a height where its own
digit has one. The correction landed in the harness: a test fires a real ping at
each slot and asserts it reaches the cavity, and that one which misses is
still stopped.
[`f9efcff`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f9efcff)
