# Crit 5 — A game

## What was the breakthrough that moved the work forward?

The honest answer isn't a technical one: "IDK I needed motivation and was
playing Manifold Garden, and the incoming deadline gave the breakthrough of
'YOO I GOTTA SUBMIT THIS NOW'".

Manifold Garden is the right reference, because this is a flat slice of a game
I've wanted to make for a long time: "an idea I've had for a 3D game for
some time based around sound. You step and see the world as you step. It'd be a
puzzle game that's non-euclidean, so even your map of the world using in-game
tools would be insufficient. Would end with fractals and cool stuff."

The technical breakthrough fell out of that idea. A ripple that stops at
geometry only ever shows the near edge of what it hits, so a single ping can
never draw a whole shape. Everything readable here works around that: the wavefront
became a deep band rather than a thin ring, the letters had to be solid so their
silhouette registered, and level 3 became a cavity you stand inside rather than
an object you look at
([`f6f15d9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f6f15d9)).
I found none of that by reasoning about the code. I found it by rendering a
frame and looking at it.

## What did this work change about who I want to be as a software developer?

"Well, it made me want to make some of my game ideas again. It's certainly not
going to happen, but it got me to think and flesh them out a little more."

The habit I'd keep is the one that made the week work: every time a level failed
to read, the fix went into the checks rather than into another attempt. The
counting level now carries a test asserting the code it deals is exactly what is
on screen, and level 3 one that fires a real ping at each slot
([`f9efcff`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-RileySwinson/commit/f9efcff)).
Looking, and then pinning down what I saw, beat reasoning about the code every
single time.
