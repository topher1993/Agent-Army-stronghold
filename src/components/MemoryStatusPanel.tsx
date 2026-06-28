// FEATURE — Phase D3 Memory Status panel.
//
// Read-only audit/lint view of the Hermes MEMORY.md file. Polls
// GET /api/memory-status every 60s. Renders file metadata + per-section
// breakdown. Provides a "Copy raw text" button for ad-hoc export.
//
// Read-only by design: this panel never writes to MEMORY.md. The
// memory tool itself is the only writer.

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type MemorySection = {
  title: string;
  charCount: number;
  firstSentence: string;
  lineStart: number;
  lineEnd: number;
};

type MemoryStatus = {
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
  sections: MemorySection[];
  rawText: string;
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'unknown';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const now = Date.now();
  const delta = Math.max(0, now - then);
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function MemoryStatusPanel() {
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/memory-status');
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setStatus(null);
        return;
      }
      const data = (await res.json()) as MemoryStatus;
      setStatus(data);
      setError(null);
      setRefreshedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = window.setInterval(fetchStatus, 60_000);
    return () => window.clearInterval(id);
  }, [fetchStatus]);

  const stats = useMemo(() => {
    if (!status) return null;
    return `${status.sizeBytes} bytes · ${status.sections.length} sections · last modified ${relativeTime(status.lastModified)}`;
  }, [status]);

  const onCopy = useCallback(async () => {
    if (!status?.rawText) return;
    try {
      await navigator.clipboard.writeText(status.rawText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [status]);

  return (
    <div data-testid="memory-status-panel" className="memory-status-panel">
      <div className="memory-status-header">
        <h3>Memory Status</h3>
        <button
          type="button"
          className="memory-status-refresh"
          onClick={fetchStatus}
          aria-label="Refresh memory status"
        >
          Refresh
        </button>
      </div>
      {loading && !status && <p className="memory-status-loading">Loading…</p>}
      {error && (
        <div className="memory-status-error">
          <p>Error: {error}</p>
          <button type="button" onClick={fetchStatus}>Retry</button>
        </div>
      )}
      {status && !status.exists && (
        <p className="memory-status-empty">Memory file not found at {status.path}</p>
      )}
      {status && status.exists && (
        <>
          <p className="memory-status-path" data-testid="memory-status-path">{status.path}</p>
          <p className="memory-status-stats" data-testid="memory-status-stats">{stats}</p>
          {refreshedAt && (
            <p className="memory-status-refreshed">
              last refreshed {relativeTime(refreshedAt)}
            </p>
          )}
          <ul className="memory-status-sections" data-testid="memory-status-sections">
            {status.sections.map((section, idx) => (
              <li key={`${section.lineStart}-${idx}`} className="memory-status-section" data-testid="memory-status-section">
                <strong>{section.title}</strong>
                <span className="memory-status-section-meta">
                  {' '}{section.charCount} chars · lines {section.lineStart}–{section.lineEnd}
                </span>
                <p className="memory-status-section-sentence">
                  <em>{section.firstSentence}</em>
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="memory-status-copy"
            data-testid="memory-status-copy"
            onClick={onCopy}
            disabled={!status.rawText}
          >
            {copied ? 'Copied!' : 'Copy raw text'}
          </button>
        </>
      )}
    </div>
  );
}

export default MemoryStatusPanel;
