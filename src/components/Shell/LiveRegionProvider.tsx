
import { createContext, useContext, type ReactNode } from 'react';
const LiveRegionContext = createContext<(message: string) => void>(() => undefined);
export function LiveRegionProvider({ children }: { children: ReactNode }) { return <LiveRegionContext.Provider value={() => undefined}>{children}</LiveRegionContext.Provider>; }
export function useAnnounce() { return useContext(LiveRegionContext); }
