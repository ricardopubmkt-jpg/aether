export const BREATH_MS = 7_200;

export function breathFromBorn(bornAt: number, now = Date.now()) {
  return 1 + Math.max(0, Math.floor((now - bornAt) / BREATH_MS));
}

export function breathWave(bornAt: number, now = Date.now()) {
  const t = (now - bornAt) / 1000;
  return Math.sin((t * Math.PI * 2) / (BREATH_MS / 1000));
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

type Tone = "dark" | "ethereal" | "cybernetic" | "void" | "luminous" | "fragmented";

export type Climate = {
  intensity: number;
  dominantTone: Tone;
  density: number;
  novelty: number;
  flow: number;
};

export function idleClimate(breath: number): Climate {
  const cycle = breath / 48;
  const wave = Math.sin(cycle * Math.PI * 2);
  const slow = Math.sin(cycle * 0.37 * Math.PI * 2);
  const intensity = clamp(3.05 + wave * 1.15 + slow * 0.35, 1.6, 7.2);
  const density = clamp(5.15 + wave * 1.35 + slow * 0.4, 3.0, 8.4);
  const novelty = clamp(0.36 + slow * 0.2 + wave * 0.05, 0.12, 0.78);
  const flow = clamp(0.33 + wave * 0.17 + slow * 0.07, 0.16, 0.74);

  let dominantTone: Tone = "void";
  if (flow > 0.56) dominantTone = "cybernetic";
  else if (intensity < 2.25) dominantTone = "dark";
  else if (novelty > 0.58) dominantTone = "luminous";
  else if (density < 3.6 && flow < 0.28) dominantTone = "ethereal";
  else if (intensity > 5.4 && novelty > 0.5) dominantTone = "fragmented";

  return { intensity, dominantTone, density, novelty, flow };
}

export function lerpClimate(from: Climate, to: Climate, amount: number): Climate {
  return {
    intensity: from.intensity + (to.intensity - from.intensity) * amount,
    density: from.density + (to.density - from.density) * amount,
    novelty: from.novelty + (to.novelty - from.novelty) * amount,
    flow: from.flow + (to.flow - from.flow) * amount,
    dominantTone: amount > 0.55 ? to.dominantTone : from.dominantTone,
  };
}
