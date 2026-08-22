"use client";

import { useEffect, useRef } from "react";

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
};

type Particle = {
  angle: number;
  radius: number;
  size: number;
  phase: number;
  speed: number;
  region: number;
  shock: number;
};

type Wave = { born: number; kind: "echo" | "pulse" };

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

export default function AetherParticles({
  intensity,
  density,
  novelty,
  flow,
  tone,
  echoToken,
  version,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ intensity, density, novelty, flow, tone });
  const echoTokenRef = useRef(echoToken);
  const versionRef = useRef(version);
  const wavesRef = useRef<Wave[]>([]);

  useEffect(() => {
    stateRef.current = { intensity, density, novelty, flow, tone };
  }, [intensity, density, novelty, flow, tone]);

  useEffect(() => {
    if (echoToken === 0 || echoToken === echoTokenRef.current) return;
    echoTokenRef.current = echoToken;
    wavesRef.current.push({ born: performance.now(), kind: "echo" });
  }, [echoToken]);

  useEffect(() => {
    if (version === versionRef.current) return;
    if (versionRef.current === 0) {
      versionRef.current = version;
      return;
    }
    versionRef.current = version;
    wavesRef.current.push({ born: performance.now(), kind: "pulse" });
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
    const particles: Particle[] = [];
    let currentColor = toneColor(stateRef.current.tone);
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreference = () => {
      reducedMotion = media.matches;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ensureParticles = (target: number) => {
      target = Math.max(48, Math.min(160, Math.round(target)));
      const span = Math.min(width, height);
      while (particles.length < target) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          radius: span * (0.16 + Math.random() * 0.34),
          size: 1.15 + Math.random() * 1.9,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0014 + Math.random() * 0.0022,
          region: Math.random() * Math.PI * 2,
          shock: 0,
        });
      }
      if (particles.length > target) particles.length = target;
    };

    const rimRadius = (angle: number, t: number, base: number) =>
      base +
      Math.sin(angle * 3 + t * 0.55) * 9 +
      Math.sin(angle * 7 - t * 0.28) * 4.5 +
      Math.sin(angle * 11 + t * 0.17) * 2;

    const animate = (time: number) => {
      const c = stateRef.current;
      ensureParticles(56 + c.density * 9 + c.novelty * 16);
      ctx.clearRect(0, 0, width, height);

      const targetColor = toneColor(c.tone);
      currentColor = [
        lerp(currentColor[0], targetColor[0], 0.04),
        lerp(currentColor[1], targetColor[1], 0.04),
        lerp(currentColor[2], targetColor[2], 0.04),
      ];
      const [r, g, b] = currentColor.map(Math.round) as [number, number, number];
      const cx = width / 2;
      const cy = height / 2;
      const t = time * 0.001;
      const globalBreath = reducedMotion ? 0.35 : Math.sin((t * Math.PI * 2) / 7.2);
      const inhale = 0.5 + globalBreath * 0.5;
      const breathScale = 1 + globalBreath * 0.16;
      const minDim = Math.min(width, height);
      const voidBase = minDim * (0.105 + c.intensity * 0.004);
      const voidR = voidBase * breathScale;

      const echoBoost = wavesRef.current.reduce((acc, wave) => {
        const age = (time - wave.born) / (wave.kind === "echo" ? 1600 : 2200);
        if (age < 0 || age > 1) return acc;
        return acc + (1 - age) * (wave.kind === "echo" ? 0.55 : 0.28);
      }, 0);

      const glow = ctx.createRadialGradient(cx, cy, voidR * 0.2, cx, cy, voidR * 2.4);
      glow.addColorStop(0, `rgba(${r},${g},${b},${0.05 + inhale * 0.04})`);
      glow.addColorStop(0.45, `rgba(${r},${g},${b},${0.12 + inhale * 0.1 + echoBoost * 0.12})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, voidR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      const steps = 72;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rad = rimRadius(a, t, voidR);
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.34 + inhale * 0.22 + echoBoost * 0.35})`;
      ctx.lineWidth = 1.35 + inhale * 0.5;
      ctx.stroke();

      ctx.fillStyle = `rgba(236,232,223,${0.18 + inhale * 0.16})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      for (const p of particles) {
        if (!reducedMotion) p.angle += p.speed * (0.55 + c.flow * 1.4);
        const regional = Math.sin(t * 0.7 + p.region * 2) * 0.04;
        const individual = Math.sin(t * 1.1 + p.phase) * 0.03;
        p.shock *= 0.93;
        const radius = Math.max(
          voidR + 10,
          p.radius * (breathScale + regional + individual) + p.shock,
        );
        const x = cx + Math.cos(p.angle) * radius;
        const y = cy + Math.sin(p.angle) * radius;
        const dist = Math.hypot(x - cx, y - cy);
        const ring = 1 - Math.min(1, Math.abs(dist - voidR * 1.85) / (minDim * 0.42));
        const alpha = 0.28 + c.density * 0.032 + inhale * 0.12 + ring * 0.18 + echoBoost * 0.2;

        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.92, alpha * 0.35)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.95, alpha)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      wavesRef.current = wavesRef.current.filter((wave) => {
        const duration = wave.kind === "echo" ? 1700 : 2400;
        const progress = (time - wave.born) / duration;
        if (progress >= 1) return false;
        const eased = 1 - Math.pow(1 - Math.min(1, progress), 2.4);
        const maxR = minDim * (wave.kind === "echo" ? 0.52 : 0.42);
        const radius = voidR * 0.7 + eased * maxR;
        const alpha = (1 - progress) * (wave.kind === "echo" ? 0.72 : 0.4);
        if (wave.kind === "echo" && progress < 0.12) {
          for (const p of particles) p.shock += 0.55;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(236,232,223,${alpha})`;
        ctx.lineWidth = wave.kind === "echo" ? 2.1 : 1.3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(236,232,223,${alpha * 0.4})`;
        ctx.lineWidth = 6;
        ctx.stroke();
        return true;
      });

      raf = requestAnimationFrame(animate);
    };

    resize();
    ensureParticles(90);
    window.addEventListener("resize", resize);
    media.addEventListener("change", onMotionPreference);
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
