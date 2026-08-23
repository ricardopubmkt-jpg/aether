const KEY = "aether-visit-v061";
export const BREATH_MS = 7_200;

type VisitState = {
  lastVisitAt: number;
};

function read(): VisitState {
  const now = Date.now();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { lastVisitAt: now };
    return JSON.parse(raw) as VisitState;
  } catch {
    return { lastVisitAt: Date.now() };
  }
}

function write(state: VisitState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

/** Personal absence only. Breath itself belongs to World State. */
export function hydrateVisit(now = Date.now()) {
  const state = read();
  const elapsed = Math.max(0, now - (state.lastVisitAt || now));
  const absenceBreaths = Math.floor(elapsed / BREATH_MS);
  write({ lastVisitAt: now });
  return { absenceBreaths };
}

export function touchVisit(now = Date.now()) {
  write({ lastVisitAt: now });
}

export function breathFromBorn(bornAt: number, now = Date.now()) {
  return 1 + Math.max(0, Math.floor((now - bornAt) / BREATH_MS));
}
