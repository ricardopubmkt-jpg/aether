"use client";

import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ContributionInput({
  onSubmit,
  disabled = false
}: {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [absorbed, setAbsorbed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled || sending) return;

    setValue("");
    setError(false);
    setSending(true);

    try {
      await onSubmit(text);
      setAbsorbed(true);
      window.setTimeout(() => setAbsorbed(false), 1800);
    } catch {
      setError(true);
      setValue(text);
      window.setTimeout(() => setError(false), 2200);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative mx-auto w-full max-w-2xl">
      <div
        className={`pointer-events-none absolute -inset-x-8 -bottom-2 h-px bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent transition-opacity duration-1000 ${
          sending ? "opacity-100" : "opacity-0"
        }`}
      />

      <input
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 280))}
        disabled={disabled || sending}
        maxLength={280}
        aria-label="O que você traz?"
        placeholder={sending ? "O campo está absorvendo…" : "O que você traz?"}
        className="w-full border-b border-white/15 bg-transparent px-1 py-4 text-center text-base font-light tracking-wide text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/40 disabled:cursor-default disabled:opacity-60"
      />

      <AnimatePresence mode="wait">
        {absorbed && (
          <motion.div
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            className="absolute -bottom-8 left-0 right-0 text-center text-[10px] uppercase tracking-[.28em] text-cyan-100/55"
          >
            O campo recebeu.
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-8 left-0 right-0 text-center text-[10px] uppercase tracking-[.28em] text-white/35"
          >
            O campo não respondeu.
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
