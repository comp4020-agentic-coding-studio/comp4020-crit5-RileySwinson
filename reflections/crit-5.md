# Crit 5 — A game

## What was the breakthrough that moved the work forward?

The honest answer is that it wasn't technical. "IDK i needed motivation and was
playing Manifold Garden and the incoming deadline gave the breakthrough of 'YOO
I GOTTA SUBMIT THIS NOW'".

Manifold Garden is the right reference, because what I built is a flat slice of
a game I've wanted to make for a long time: "based on an idea i've had for a 3d
game for some time based around sound. you step and see the world as you step.
it'd be a puzzle game that's non-euclidean so even you map of the world using
in-game tools woudl be insufficent. would end with fractals and cool stuff."

The technical breakthrough fell out of that constraint. A ripple that stops at
geometry can only ever show the near edge of whatever it hits, so a single ping
can never draw a whole shape. Every level that reads in this build came from
working around that: the wavefront had to become a deep band instead of a thin
ring, the letters had to be solid so their silhouette registered, and level 3
had to become a cavity you stand inside rather than an object you look at from
outside. I found none of that by reasoning about the code — I found it by
rendering a frame and looking at it.

## What did this work change about who I want to be as a software developer?

"Well, it made me want to make some of my game ideas again. It's certainly not
going to happen, but it got me to think and flesh them out a little more."
