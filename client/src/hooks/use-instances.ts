import { useState, useCallback } from "react";
import { useWebSocket } from "./use-websocket";
import type { AgentInstance, LogEntry, WSMessageToClient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useInstances() {
  const [instances, setInstances] = useState<AgentInstance[]>([]);
  const [logs, setLogs] = useState<Map<string, LogEntry[]>>(new Map());

  const handleMessage = useCallback((msg: WSMessageToClient) => {
    switch (msg.type) {
      case "instances":
        setInstances(msg.payload);
        break;
      case "instance_update":
        setInstances((prev) => {
          const idx = prev.findIndex((i) => i.id === msg.payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = msg.payload;
            return next;
          }
          return [...prev, msg.payload];
        });
        break;
      case "instance_removed":
        setInstances((prev) => prev.filter((i) => i.id !== msg.payload.id));
        break;
      case "log":
        setLogs((prev) => {
          const next = new Map(prev);
          const list = next.get(msg.payload.instanceId) ?? [];
          next.set(msg.payload.instanceId, [...list, msg.payload].slice(-500));
          return next;
        });
        break;
      case "command_result":
        setLogs((prev) => {
          const next = new Map(prev);
          const list = next.get(msg.payload.instanceId) ?? [];
          const entry: LogEntry = {
            id: msg.payload.commandId,
            instanceId: msg.payload.instanceId,
            type: msg.payload.success ? "output" : "error",
            text: msg.payload.output,
            timestamp: new Date().toISOString(),
          };
          next.set(msg.payload.instanceId, [...list, entry].slice(-500));
          return next;
        });
        break;
    }
  }, []);

  const { connected } = useWebSocket(handleMessage);

  const sendCommand = useCallback(async (instanceId: string, text: string) => {
    const res = await apiRequest("POST", `/api/instances/${instanceId}/command`, { text });
    return res.json();
  }, []);

  const sendControl = useCallback(async (instanceId: string, action: "pause" | "resume" | "stop") => {
    const res = await apiRequest("POST", `/api/instances/${instanceId}/control`, { action });
    return res.json();
  }, []);

  const fetchLogs = useCallback(async (instanceId: string) => {
    const res = await fetch(`/api/instances/${instanceId}/logs?limit=200`, { credentials: "include" });
    if (!res.ok) return;
    const data: LogEntry[] = await res.json();
    setLogs((prev) => {
      const next = new Map(prev);
      next.set(instanceId, data);
      return next;
    });
  }, []);

  const getInstanceLogs = useCallback((instanceId: string) => {
    return logs.get(instanceId) ?? [];
  }, [logs]);

  const stats = {
    total: instances.filter(i => i.status !== "disconnected").length,
    active: instances.filter(i => i.status === "active").length,
    hostsOnline: new Set(instances.filter(i => i.status !== "disconnected").map(i => i.host)).size,
  };

  return { instances, connected, stats, sendCommand, sendControl, fetchLogs, getInstanceLogs };
}
