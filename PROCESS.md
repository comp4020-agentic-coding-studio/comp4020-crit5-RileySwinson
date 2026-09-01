# Process overview

## What I built

**Sounding** — a puzzle game played by echo. A click sends out a ripple of dots
that stops dead at geometry, so you never see the level, only where it blocked
you. It's a flat slice of something larger: "an idea i've had for a 3d game for
some time based around sound. you step and see the world as you step."

One caveat: this was built in a single session outside the repo and brought in
at the end, so the history below is the port, not the making of it.

## The moments that mattered

**A single ping can't draw a shape.** The first level drew a solid letter and
pinged it; the render was one enormous shadow with no letter in it, because from
a point source you only ever see a near edge. The obvious fix was to let stopped
dots linger as an outline — exactly what the design rules out. Instead the
wavefront became a deep *band*: rings short of the geometry are whole, rings
past it are bitten, and the boundary through the band is the near edge. I found
this by rendering frames in headless Chrome and looking, not by reading code.
[`f6f15d9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f6f15d9)

**Slots in the level 3 slab** — the change that came from playing.

> make level 3 have small gaps in the large cube that the dots, when clicking on
> the outside, can go through. put two on the left and right sides.

It "seemed confusing just clicking and NOTHING happens until you get to the very
specific spot where it's permitted. it just seemed like one big cube." Not a
marker on the floor, and not dropping outside pings — two slots, so an outside
ping gets a beam in. The first cut dead-ended on the digit `7`, which has no
left-hand stroke, so each slot now finds a height where its own digit has one.
The correction landed in the harness: a test fires a real ping at each slot and
asserts it reaches the cavity, and that one which misses is still stopped.
[`f9efcff`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f9efcff)
