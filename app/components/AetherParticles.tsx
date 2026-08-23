"use client";

import { useEffect, useRef } from "react";
import { BREATH_MS } from "../lib/breath";

type Tone =
  | "dark"
  | "ethereal"
  | "cybernetic"
  | "void"
  | "luminous"
  | "fragmented";

type Props = {
  intensity: number;
  density: number;
  novelty: number;
  flow: number;
  tone: Tone;
  echoToken: number;
  version: number;
  bornAt?: number;
};

type Particle = {
  angle: number;
  radius: number;
  rest: number;
  band: 0 | 1 | 2;
  size: number;
  phase: number;
  spin: number;
  omega: number;
  vr: number;
  kickId: number;
};

type Impulse = {
  id: number;
  born: number;
  kind: "echo" | "pulse";
  compressed: boolean;
};

function toneColor(tone: Tone): [number, number, number] {
  switch (tone) {
    case "luminous":
      return [232, 224, 208];
    case "cybernetic":
      return [176, 198, 210];
    case "fragmented":
      return [196, 176, 164];
    case "ethereal":
      return [186, 194, 206];
    case "void":
      return [168, 176, 192];
    default:
      return [160, 168, 186];
  }
}

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function breathWave(bornAt: number, now = Date.now()) {
  const t = (now - bornAt) / 1000;
  return Math.sin((t * Math.PI * 2) / (BREATH_MS / 1000));
}

function sampleRest(voidR: number, minDim: number): { rest: number; band: 0 | 1 | 2 } {
  const u = Math.random();
  const cap = minDim * 0.42;
  if (u < 0.72) return { rest: Math.min(cap, voidR * (1.12 + Math.random() * 0.32)), band: 0 };
  if (u < 0.93) return { rest: Math.min(cap, voidR * (1.48 + Math.random() * 0.4)), band: 1 };
  return { rest: Math.min(cap, voidR * (1.95 + Math.random() * 0.45)), band: 2 };
}

function spawn(voidR: number, minDim: number): Particle {
  const { rest, band } = sampleRest(voidR, minDim);
  const inner = band === 0;
  return {
    angle: Math.random() * Math.PI * 2,
    radius: rest,
    rest,
    band,
    size: inner ? 1.2 + Math.random() * 1.45 : band === 1 ? 1.05 + Math.random() * 1.4 : 0.85 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2,
    spin: (0.11 + Math.random() * 0.24) * (Math.random() < 0.5 ? 1 : -1) * (inner ? 1.2 : 1),
    omega: 0,
    vr: 0,
    kickId: 0
  };
}

export default function AetherParticles({
  intensity,
  density,
  novelty,
  flow,
  tone,
  echoToken,
  version,
  bornAt
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ intensity, density, novelty, flow, tone, bornAt: bornAt ?? Date.UTC(2026, 7, 22, 12, 0, 0) });
  const echoTokenRef = useRef(echoToken);
  const versionRef = useRef(version);
  const impulsesRef = useRef<Impulse[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    stateRef.current = { intensity, density, novelty, flow, tone, bornAt: bornAt ?? stateRef.current.bornAt };
  }, [intensity, density, novelty, flow, tone, bornAt]);

  useEffect(() => {
    if (echoToken === 0 || echoToken === echoTokenRef.current) return;
    echoTokenRef.current = echoToken;
    impulsesRef.current.push({ id: nextIdRef.current++, born: performance.now(), kind: "echo", compressed: false });
  }, [echoToken]);

  useEffect(() => {
    if (version === versionRef.current) return;
    if (versionRef.current === 0) {
      versionRef.current = version;
      return;
    }
    versionRef.current = version;
    impulsesRef.current.push({ id: nextIdRef.current++, born: performance.now(), kind: "pulse", compressed: false });
  }, [version]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastTime = 0;
    const particles: Particle[] = [];
    let live = { ...stateRef.current };
    let color = toneColor(live.tone);
    let compress = 1;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreference = () => {
      reducedMotion = media.matches;
    };

    const voidRadius = (minDim: number, i: number, wave: number) =>
      minDim * (0.2 + i * 0.0032) * (1 + wave * 0.1);

    const resize = () => {
      const prev = Math.min(width, height) || 1;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const minDim = Math.min(width, height);
      const scale = minDim / prev;
      if (Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.02) {
        for (const p of particles) {
          p.rest *= scale;
          p.radius *= scale;
        }
      }
    };

    const ensureParticles = (target: number, voidR: number, minDim: number) => {
      target = Math.max(160, Math.min(target, minDim < 640 ? 210 : 280));
      while (particles.length < target) particles.push(spawn(voidR, minDim));
      if (particles.length > target) {
        particles.sort((a, b) => a.band - b.band);
        particles.length = target;
      }
    };

    const animate = (time: number) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016;
      lastTime = time;
      const target = stateRef.current;
      const follow = 1 - Math.exp(-1.65 * dt);
      live = {
        intensity: lerp(live.intensity, target.intensity, follow),
        density: lerp(live.density, target.density, follow * 0.85),
        novelty: lerp(live.novelty, target.novelty, follow),
        flow: lerp(live.flow, target.flow, follow * 0.7),
        tone: target.tone,
        bornAt: target.bornAt
      };
      const dest = toneColor(live.tone);
      color = [lerp(color[0], dest[0], 0.045), lerp(color[1], dest[1], 0.045), lerp(color[2], dest[2], 0.045)];
      const [r, g, b] = color.map(Math.round) as [number, number, number];
      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const wave = reducedMotion ? 0.2 : breathWave(live.bornAt);
      const inhale = 0.5 + wave * 0.5;
      const breathScale = 1 + wave * 0.13;

      const impulses = impulsesRef.current;
      let compressTarget = 1;
      for (const impulse of impulses) {
        const age = time - impulse.born;
        if (impulse.kind === "echo" && age < 140) compressTarget = Math.min(compressTarget, 0.9);
        if (impulse.kind === "pulse" && age < 420) compressTarget = Math.min(compressTarget, 0.94);
      }
      compress = lerp(compress, compressTarget, 1 - Math.exp(-9 * dt));
      const voidR = voidRadius(minDim, live.intensity, wave) * compress;
      ensureParticles(Math.round(190 + live.density * 8 + live.novelty * 12), voidR, minDim);

      ctx.clearRect(0, 0, width, height);

      for (const impulse of impulses) {
        const age = time - impulse.born;
        if (!impulse.compressed) {
          impulse.compressed = true;
          const inward = impulse.kind === "echo" ? 360 : 110;
          for (const p of particles) {
            const near = p.band === 0 ? 1.25 : p.band === 1 ? 0.8 : 0.35;
            p.vr -= inward * near;
            p.omega += (Math.random() - 0.5) * (impulse.kind === "echo" ? 0.7 : 0.28);
          }
        }
        const delay = impulse.kind === "echo" ? 90 : 180;
        const span = impulse.kind === "echo" ? 920 : 1600;
        const local = age - delay;
        if (local >= 0 && local <= span) {
          const front = voidR * 0.85 + (local / span) * minDim * (impulse.kind === "echo" ? 0.48 : 0.4);
          const band = impulse.kind === "echo" ? 26 : 40;
          const kick = impulse.kind === "echo" ? 520 : 180;
          for (const p of particles) {
            if (p.kickId === impulse.id) continue;
            if (Math.abs(p.radius - front) > band) continue;
            const k = 1 - Math.abs(p.radius - front) / band;
            p.vr += kick * k;
            p.omega += (Math.random() - 0.5) * (impulse.kind === "echo" ? 1.1 : 0.4) * k;
            p.kickId = impulse.id;
          }
        }
      }
      impulsesRef.current = impulses.filter(impulse => time - impulse.born < 2200);

      if (!reducedMotion) {
        const innerWall = voidR * 1.1;
        for (const p of particles) {
          const regional = Math.sin(time * 0.0007 + p.phase) * (p.band === 0 ? 0.012 : 0.022);
          const targetR = Math.max(innerWall + 3, p.rest * (breathScale + regional));
          p.vr += (targetR - p.radius) * 16 * dt;
          if (p.radius < innerWall) p.vr += (innerWall - p.radius) * 55 * dt;
          p.vr *= Math.exp(-3.4 * dt);
          p.omega *= Math.exp(-2.6 * dt);
          p.radius = Math.max(innerWall * 0.98, p.radius + p.vr * dt);
          p.angle += (p.spin * (0.42 + live.flow * 1.45) + p.omega) * dt;
        }
      }

      for (const p of particles) {
        if (p.radius < voidR * 1.08) continue;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        const nearVoid = 1 - Math.min(1, Math.max(0, (p.radius - voidR) / (minDim * 0.22)));
        const alpha =
          (p.band === 0 ? 0.78 : p.band === 1 ? 0.32 : 0.07) +
          live.density * 0.018 +
          inhale * 0.1 +
          nearVoid * 0.16;
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.5, alpha * 0.28)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 2.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.95, alpha)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(animate);
    };

    resize();
    const minDim = Math.min(width, height);
    ensureParticles(190, voidRadius(minDim, live.intensity, 0), minDim);
    window.addEventListener("resize", resize);
    media.addEventListener("change", onMotionPreference);
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />;
}
