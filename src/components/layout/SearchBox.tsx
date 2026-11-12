import { useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { Search } from "lucide-react";
import type { Selection } from "@/types";

export interface SearchItem {
  key: string;
  label: string;
  sub: string;
  selection: Selection;
}

interface SearchBoxProps {
  items: SearchItem[];
  onPick: (item: SearchItem) => void;
}

const MAX_RESULTS = 8;

export default function SearchBox({ items, onPick }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sub.toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [items, query]);

  const showList = open && query.trim().length > 0;

  const pick = (item: SearchItem) => {
    onPick(item);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) =>
        results.length === 0 ? 0 : (i - 1 + results.length) % results.length,
      );
    } else if (event.key === "Enter") {
      const item = results[active];
      if (item) pick(item);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-panel-2/70 px-3 py-1.5 transition focus-within:border-accent/50">
        <Search size={14} className="shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          placeholder="Cari kelurahan, kecamatan, atau fasilitas…"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          aria-label="Cari wilayah atau fasilitas"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted/70 outline-none"
        />
      </div>

      {showList && (
        <ul
          role="listbox"
          onMouseDown={(event: MouseEvent<HTMLUListElement>) =>
            event.preventDefault()
          }
          className="glass scroll-thin absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 min-w-[24rem] overflow-y-auto rounded-xl p-1.5"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted">
              Tidak ada hasil untuk “{query.trim()}”
            </li>
          )}
          {results.map((item, index) => (
            <li key={item.key} role="option" aria-selected={index === active}>
              <button
                type="button"
                onClick={() => pick(item)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition ${
                  index === active
                    ? "bg-accent/10 text-accent"
                    : "text-ink hover:bg-white/5"
                }`}
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {item.label}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[11px] text-muted">
                  {item.sub}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
