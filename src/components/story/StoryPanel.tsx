import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { StoryStep } from "@/features/story/steps";

const AUTOPLAY_MS = 9000;

interface StoryPanelProps {
  steps: StoryStep[];
  index: number;
  onGo: (index: number) => void;
  onClose: () => void;
}

/** Panel presentasi di bawah peta: langkah, temuan, dan kontrol lanjut/mundur/putar otomatis. */
export default function StoryPanel({
  steps,
  index,
  onGo,
  onClose,
}: StoryPanelProps) {
  const [auto, setAuto] = useState(false);
  const step = steps[index];
  const last = index >= steps.length - 1;

  const go = (next: number) => {
    setAuto(false);
    onGo(next);
  };

  useEffect(() => {
    if (!auto) return;
    if (last) {
      setAuto(false);
      return;
    }
    const timer = window.setTimeout(() => onGo(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [auto, index, last, onGo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") go(Math.min(index + 1, steps.length - 1));
      else if (event.key === "ArrowLeft") go(Math.max(index - 1, 0));
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps.length, onClose]);

  if (!step) return null;

  const navButton =
    "grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-ink transition hover:border-accent/50 hover:text-accent disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-ink";

  return (
    <section
      aria-live="polite"
      className="glass animate-fade-in-up absolute bottom-4 left-1/2 z-40 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl p-4"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
        <span className="font-semibold uppercase tracking-[0.14em] text-accent">
          {step.eyebrow}
        </span>
        <span className="tabular-nums">
          {index + 1} / {steps.length}
        </span>
      </div>

      <h2
        className="text-lg font-semibold leading-snug"
        style={{ color: "#FFFFFF" }}
      >
        {step.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{step.body}</p>

      {step.facts.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {step.facts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-white/5 bg-panel-2/60 px-2.5 py-2"
            >
              <dt className="text-[10px] text-muted">{fact.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {step.caveat && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {step.caveat}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={navButton}
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Langkah sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={navButton}
            onClick={() => go(index + 1)}
            disabled={last}
            aria-label="Langkah berikutnya"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className={`${navButton} ${auto ? "border-accent/50 text-accent" : ""}`}
            onClick={() => setAuto((v) => !v)}
            aria-label={auto ? "Hentikan putar otomatis" : "Putar otomatis"}
            aria-pressed={auto}
          >
            {auto ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>

        <div className="hidden gap-1 sm:flex">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Langkah ${i + 1}`}
              className={`h-1.5 w-4 rounded-full transition ${i === index ? "bg-accent" : "bg-white/15 hover:bg-white/30"}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-white/5 hover:text-ink"
        >
          <X size={14} /> Tutup
        </button>
      </div>
    </section>
  );
}
