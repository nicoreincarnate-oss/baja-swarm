import { z } from "zod";

// ---- Agent Instance ----
export const instanceStatusSchema = z.enum(["active", "idle", "error", "disconnected"]);
export type InstanceStatus = z.infer<typeof instanceStatusSchema>;

export interface AgentInstance {
  id: string;
  name: string;
  provider: string; // "Anthropic", "OpenAI", etc.
  host: string;
  status: InstanceStatus;
  connectedAt: string; // ISO timestamp
  lastHeartbeat: string;
  currentTask: string | null;
  metadata: Record<string, string>; // cpu, memory, uptime, etc.
}

export const registerInstanceSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  host: z.string().min(1),
  metadata: z.record(z.string()).optional(),
});
export type RegisterInstance = z.infer<typeof registerInstanceSchema>;

// ---- Log Entry ----
export interface LogEntry {
  id: string;
  instanceId: string;
  type: "system" | "command" | "output" | "error";
  text: string;
  timestamp: string;
}

// ---- WebSocket Protocol ----
export type WSMessageFromAgent =
  | { type: "register"; payload: RegisterInstance }
  | { type: "heartbeat"; payload: { status: InstanceStatus; currentTask: string | null; metadata?: Record<string, string> } }
  | { type: "log"; payload: { logType: LogEntry["type"]; text: string } }
  | { type: "command_result"; payload: { commandId: string; output: string; success: boolean } };

export type WSMessageToAgent =
  | { type: "command"; payload: { commandId: string; text: string } }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" };

export type WSMessageToClient =
  | { type: "instances"; payload: AgentInstance[] }
  | { type: "instance_update"; payload: AgentInstance }
  | { type: "instance_removed"; payload: { id: string } }
  | { type: "log"; payload: LogEntry }
  | { type: "command_result"; payload: { instanceId: string; commandId: string; output: string; success: boolean } };
