"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Plane } from "lucide-react";
import { apiGet } from "@/lib/client/fetcher";

type Suggestion = { code: string; label: string; sub: string; kind: "metro" | "airport" };

/** Champ aéroport / ville avec autocomplétion (combobox accessible). */
export function PlaceInput({
  label,
  value,
  onChange,
  placeholder,
  allowAnywhere,
  name,
}: {
  label: string;
  value: { code: string; label: string };
  onChange: (v: { code: string; label: string }) => void;
  placeholder?: string;
  allowAnywhere?: boolean;
  name: string;
}) {
  const id = useId();
  const [text, setText] = useState(value.label);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value.label);
  }, [value.label]);

  // Une valeur venue de l'URL n'a que son code (« LIS ») : on retrouve son libellé lisible.
  useEffect(() => {
    if (!/^[A-Z]{3}$/.test(value.code) || value.label !== value.code) return;
    let alive = true;
    apiGet<{ suggestions: Suggestion[] }>(`/api/places?q=${value.code}`)
      .then((r) => {
        const hit = r.suggestions.find((x) => x.code === value.code);
        if (alive && hit) onChange({ code: hit.code, label: hit.label });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value.code, value.label, onChange]);

  const anywhere: Suggestion = { code: "ANYWHERE", label: "Partout 🌍", sub: "DINO propose des destinations selon votre budget", kind: "metro" };
  const list = allowAnywhere ? [anywhere, ...items] : items;

  function query(t: string) {
    setText(t);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (t.trim().length < 2) return setItems([]);
    timer.current = setTimeout(async () => {
      try {
        const r = await apiGet<{ suggestions: Suggestion[] }>(`/api/places?q=${encodeURIComponent(t)}`);
        setItems(r.suggestions);
        setActive(0);
      } catch {
        setItems([]);
      }
    }, 150);
  }

  function pick(s: Suggestion) {
    onChange({ code: s.code, label: s.label });
    setText(s.label);
    setOpen(false);
  }

  return (
    <label className="field relative" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        className="input"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        onChange={(e) => query(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(list.length - 1, a + 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
          if (e.key === "Enter") (e.preventDefault(), pick(list[active]));
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && list.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="card absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto p-1">
          {list.map((s, i) => (
            <li
              key={s.code}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 ${i === active ? "bg-sage-100" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              {s.kind === "metro" ? <MapPin size={16} className="mt-0.5 text-orange-500" /> : <Plane size={16} className="mt-0.5 text-sage-600" />}
              <span>
                <span className="block font-medium text-deep-900">{s.label}</span>
                <span className="block text-xs text-muted">{s.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
