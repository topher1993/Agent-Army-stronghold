import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
const LiveRegionContext = createContext<(message: string) => void>(() => undefined);
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback((next: string) => {
    setMessage('');
    window.setTimeout(() => setMessage(next), 30);
  }, []);
  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{message}</div>
    </LiveRegionContext.Provider>
  );
}
export function useAnnounce() { return useContext(LiveRegionContext); }
