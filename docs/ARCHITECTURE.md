# Architecture

## Physiology (v0.6.1)

```
WORLD STATE
│
├── version
├── era
├── narrative
├── climate
│
└── physiology
     ├── bornAt
     ├── breathSequence   ← derived: 1 + floor((now - bornAt) / 7200)
     └── lastBreathAt
```

Breath is time since the organism was born. It is not incremented by a tab.

Idle climate is a function of `breathSequence`. Metabolize (cron, 1 min) lerps stored climate toward that attractor. Pulses write a new climate. Clients subscribe to one world.

Visual inhale uses the same `bornAt`, so two devices with correct clocks inhale together.

## Pipeline

```
contribution
  → extract (signals only; raw text never reaches the Weaver)
  → pulse lock
  → weave
  → commit World State
  → field body follows climate
  → era label lags (~3s)
```

Local Echo is a physical impulse on existing particles, not a drawn overlay.

## What stays local

`lastVisitAt` — only to detect personal absence. Never to count the organism's breath.
