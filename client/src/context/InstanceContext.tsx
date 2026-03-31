import { createContext, useContext, type ReactNode } from "react";
import { useInstances } from "@/hooks/use-instances";
import type { AgentInstance, LogEntry } from "@shared/schema";

interface InstanceContextValue {
  instances: AgentInstance[];
  connected: boolean;
  stats: { total: number; active: number; hostsOnline: number };
  sendCommand: (instanceId: string, text: string) => Promise<unknown>;
  sendControl: (instanceId: string, action: "pause" | "resume" | "stop") => Promise<unknown>;
  fetchLogs: (instanceId: string) => Promise<void>;
  getInstanceLogs: (instanceId: string) => LogEntry[];
}

const Ctx = createContext<InstanceContextValue | null>(null);

export function InstanceProvider({ children }: { children: ReactNode }) {
  const value = useInstances();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInstanceContext() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInstanceContext must be used within InstanceProvider");
  return ctx;
}
