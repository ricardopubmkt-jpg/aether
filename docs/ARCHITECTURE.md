# Aether Core v0.3

## Core concepts

### Presence
One browser session corresponds to one presence record. Heartbeats patch the same record.

### Contributions
Raw text is stored only at the ingestion boundary. It is transformed into structured signals.

### Signal Engine
Deterministic code calculates collective physiology:

- intensity
- novelty
- dominant signals

This prevents the LLM from inventing the physical rules of the world.

### Pulse
A pulse is the Aether's breathing cycle.

It begins when:

- at least 15 ready contributions exist, OR
- the oldest ready contribution has waited at least 5 minutes.

A singleton lock prevents simultaneous pulses.

### Weaver
The Weaver receives:

- current World State
- structured signals
- deterministic physiology
- optional echo

It never receives raw contributions.

### World State
There is one current state. Every successful evolution increments `version`.

### World State History
Every committed state is retained as historical memory.

### Echoes
An echo is a de-identified poetic abstraction that may reappear later.

## Concurrency

A pulse captures the current World State version.

The final commit only succeeds if that version is still current.

If another pulse has already committed, the stale pulse is discarded.

## Security model

Prompt instructions inside user content are treated as untrusted data.

Security is structural:

raw text -> extraction boundary -> structured signals -> Weaver

The Weaver has no code path that accepts raw text.

## Privacy direction

Anonymous sessions are identified by a random browser UUID.

The product should not expose individual contribution histories publicly.

A future production release should define a raw-text retention policy and deletion process.
