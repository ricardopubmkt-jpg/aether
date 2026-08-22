const KEY = "aether-breath-v06";
export const BREATH_MS = 8_000;

type BreathState = {
  count: number;
  lastAt: number;
  lastVisitAt: number;
};

function read(): BreathState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 1, lastAt: now, lastVisitAt: now };
    return JSON.parse(raw) as BreathState;
  } catch {
    return { count: 1, lastAt: now, lastVisitAt: now };
  }
}

function write(state: BreathState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function hydrateBreath(now = Date.now()) {
  const state = read();
  const elapsed = Math.max(0, now - (state.lastVisitAt || state.lastAt));
  const extra = Math.floor(elapsed / BREATH_MS);
  const next = {
    count: state.count + extra,
    lastAt: extra > 0 ? now : state.lastAt,
    lastVisitAt: now,
  };
  write(next);
  return { count: next.count, absenceBreaths: extra };
}

export function tickBreath(now = Date.now()) {
  const state = read();
  const n = Math.floor((now - state.lastAt) / BREATH_MS);
  if (n < 1) {
    write({ ...state, lastVisitAt: now });
    return state.count;
  }
  const next = {
    count: state.count + n,
    lastAt: state.lastAt + n * BREATH_MS,
    lastVisitAt: now,
  };
  write(next);
  return next.count;
}
