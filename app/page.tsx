"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import AetherParticles from "./components/AetherParticles";
import { ContributionInput } from "./components/ContributionInput";
import { hydrateBreath, tickBreath } from "./lib/breath";

function getSessionId() {
  const key = "aether-session-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);
  const [localEcho, setLocalEcho] = useState(0);
  const [breath, setBreath] = useState(1);
  const [absent, setAbsent] = useState(false);

  useEffect(() => {
    setSessionId(getSessionId());
    const hydrated = hydrateBreath();
    setBreath(hydrated.count);
    setAbsent(hydrated.absenceBreaths >= 2);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase(3);
      return;
    }
    const a = window.setTimeout(() => setPhase(1), 1400);
    const b = window.setTimeout(() => setPhase(2), 2800);
    const c = window.setTimeout(() => setPhase(3), 4600);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setBreath(tickBreath()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const activeCount = useQuery(api.presence.getActiveCount, {});
  const worldState = useQuery(api.worldState.getLatest, {});
  const heartbeat = useMutation(api.presence.heartbeat);
  const submit = useMutation(api.contributions.submit);
  const initialize = useMutation(api.worldState.initializeWorld);

  useEffect(() => {
    if (!sessionId) return;
    const send = () => heartbeat({ sessionId, status: "contemplating" }).catch(() => {});
    send();
    const timer = window.setInterval(send, 10000);
    return () => window.clearInterval(timer);
  }, [sessionId, heartbeat]);

  useEffect(() => {
    if (worldState === null) initialize().catch(() => {});
  }, [worldState, initialize]);

  const climate = useMemo(
    () =>
      worldState?.emotionalClimate ?? {
        intensity: 3.2,
        density: 5.4,
        novelty: 0.38,
        flow: 0.34,
        dominantTone: "void" as const,
      },
    [worldState],
  );

  async function contribute(text: string) {
    if (!sessionId) return;
    setLocalEcho(Date.now());
    await heartbeat({ sessionId, status: "contributing" });
    await submit({ sessionId, text });
    window.setTimeout(() => {
      heartbeat({ sessionId, status: "contemplating" }).catch(() => {});
    }, 1200);
  }

  const showMeta = phase >= 1;
  const showNarrative = phase >= 2;
  const showInvite = phase >= 3;
  const presenceLabel =
    activeCount === undefined
      ? "presenças"
      : `${activeCount} ${activeCount === 1 ? "presença" : "presenças"}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070c] text-[#ece8df]">
      <AetherParticles
        intensity={climate.intensity}
        density={climate.density}
        novelty={climate.novelty}
        flow={climate.flow}
        tone={climate.dominantTone}
        echoToken={localEcho}
        version={worldState?.version ?? 0}
      />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-8">
        <header className="absolute left-6 right-6 top-8 mx-auto flex max-w-5xl items-center justify-between">
          <p
            className={`text-[10px] font-medium tracking-[.52em] text-white/40 transition-opacity duration-1000 ${
              showMeta ? "opacity-100" : "opacity-0"
            }`}
          >
            AETHER
          </p>
          <p
            className={`text-[9px] uppercase tracking-[.28em] text-white/25 transition-opacity duration-1000 ${
              showMeta ? "opacity-100" : "opacity-0"
            }`}
          >
            {presenceLabel}
          </p>
        </header>

        <section className="flex min-h-screen w-full flex-col items-center justify-center text-center">
          <p
            className={`mb-7 text-[9px] uppercase tracking-[.48em] text-white/35 transition-opacity duration-1000 ${
              showMeta ? "opacity-100" : "opacity-0"
            }`}
          >
            {worldState?.eraName ?? "O campo desperta"}
            <span className="text-white/25"> · respiração {breath}</span>
          </p>

          <div className="max-w-2xl">
            <p
              className={`text-balance text-2xl font-extralight leading-[1.5] tracking-wide text-white/85 transition-all duration-[1400ms] ease-out sm:text-4xl ${
                showNarrative
                  ? "translate-y-0 opacity-100 blur-0"
                  : "translate-y-4 opacity-0 blur-[6px]"
              }`}
            >
              {worldState?.currentNarrative ??
                "O campo está vazio o bastante para ser ocupado. Ainda não pede nada."}
            </p>
            {absent && showNarrative ? (
              <p className="mt-6 text-[11px] tracking-[.18em] text-white/30">
                Durante a ausência, o campo permaneceu em movimento.
              </p>
            ) : null}
          </div>

          <div
            className={`mt-16 w-full transition-all duration-[1200ms] ease-out ${
              showInvite
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-3 opacity-0"
            }`}
          >
            <ContributionInput onSubmit={contribute} disabled={!sessionId || !showInvite} />
          </div>
        </section>

        <footer
          className={`pointer-events-none absolute bottom-8 left-6 right-6 mx-auto flex max-w-5xl items-end justify-between text-[8px] uppercase tracking-[.32em] text-white/12 transition-opacity duration-1000 ${
            showInvite ? "opacity-100" : "opacity-0"
          }`}
        >
          <span>o campo permanece</span>
          <span>v{worldState?.version ?? 0}</span>
        </footer>
      </div>
    </main>
  );
}
