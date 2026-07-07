import { useEffect, useMemo, useState } from 'react';
import type { SurfaceId } from '../Sidebar';

type PaletteItem = { id: string; label: string; icon: string; hint?: string; disabled?: boolean; action: () => void };

type PaletteProps = {
  open: boolean;
  onClose: () => void;
  onSurfaceChange?: (id: SurfaceId) => void;
  onRefreshEverything?: () => void;
  mode?: 'navigation' | 'shortcuts';
};

const surfaces: Array<{ id: SurfaceId; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'work', label: 'Work', icon: '▤' },
  { id: 'missions', label: 'Missions', icon: '◎' },
  { id: 'operations', label: 'Operations', icon: '⚙' },
  { id: 'approvals', label: 'Approvals', icon: '✓' },
  { id: 'cron', label: 'Cron', icon: '⏱' },
  { id: 'subagents', label: 'Subagents', icon: '◇' },
];

const shortcutItems: PaletteItem[] = [
  { id: 'shortcut-next', label: 'Next approval', icon: 'j', hint: 'j', action: () => undefined },
  { id: 'shortcut-prev', label: 'Previous approval', icon: 'k', hint: 'k', action: () => undefined },
  { id: 'shortcut-approve', label: 'Approve focused approval', icon: 'a', hint: 'a', action: () => undefined },
  { id: 'shortcut-reject', label: 'Reject focused approval', icon: 'r', hint: 'r', action: () => undefined },
  { id: 'shortcut-help', label: 'Show shortcuts', icon: '?', hint: '?', action: () => undefined },
  { id: 'shortcut-close', label: 'Close overlay', icon: 'Esc', hint: 'Esc', action: () => undefined },
];

export function Palette({ open, onClose, onSurfaceChange, onRefreshEverything, mode = 'navigation' }: PaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<PaletteItem[]>(() => {
    if (mode === 'shortcuts') return shortcutItems;
    return [
      ...surfaces.map(surface => ({
        id: surface.id,
        label: surface.label,
        icon: surface.icon,
        action: () => onSurfaceChange?.(surface.id),
      })),
      { id: 'refresh', label: 'Refresh everything', icon: '↻', hint: 'R', disabled: !onRefreshEverything, action: () => onRefreshEverything?.() },
      { id: 'theme', label: 'Toggle theme', icon: '☾', hint: 'T', action: toggleTheme },
      { id: 'copy-url', label: 'Copy current URL', icon: '⧉', action: copyUrl },
    ];
  }, [mode, onRefreshEverything, onSurfaceChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(item => item.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(index => Math.min(index, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  if (!open) return null;

  const invoke = (item: PaletteItem) => {
    if (item.disabled) return;
    item.action();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={mode === 'shortcuts' ? 'Approval keyboard shortcuts' : 'Command palette'} className="paletteBackdrop" onClick={onClose}>
      <div className="palette" onClick={event => event.stopPropagation()}>
        <input
          className="paletteInput"
          type="search"
          autoFocus
          placeholder={mode === 'shortcuts' ? 'Approval shortcuts…' : 'Search surfaces, actions…'}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); onClose(); }
            if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, filtered.length - 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); }
            if (event.key === 'Enter' && filtered[activeIndex]) { event.preventDefault(); invoke(filtered[activeIndex]); }
          }}
        />
        <div className="paletteList" role="listbox" aria-label="Palette results">
          {filtered.length === 0 ? <p className="paletteEmpty">No matches. Try 'work' or 'subagents'.</p> : filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              disabled={item.disabled}
              className="paletteItem"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => invoke(item)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.hint ? <span className="paletteHint">{item.hint}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function toggleTheme() {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
}

function copyUrl() {
  void navigator.clipboard?.writeText(window.location.href);
}
