import { randomUUID } from "crypto";
import type { AgentInstance, LogEntry, InstanceStatus } from "@shared/schema";

export class InstanceStore {
  private instances: Map<string, AgentInstance> = new Map();
  private logs: Map<string, LogEntry[]> = new Map(); // instanceId -> logs
  private maxLogsPerInstance = 500;

  // ---- Instances ----

  getAll(): AgentInstance[] {
    return Array.from(this.instances.values());
  }

  get(id: string): AgentInstance | undefined {
    return this.instances.get(id);
  }

  register(id: string, data: { name: string; provider: string; host: string; metadata?: Record<string, string> }): AgentInstance {
    const now = new Date().toISOString();
    const instance: AgentInstance = {
      id,
      name: data.name,
      provider: data.provider,
      host: data.host,
      status: "active",
      connectedAt: now,
      lastHeartbeat: now,
      currentTask: null,
      metadata: data.metadata ?? {},
    };
    this.instances.set(id, instance);
    this.logs.set(id, []);
    this.addLog(id, "system", `${data.name} connected from ${data.host}`);
    return instance;
  }

  updateHeartbeat(id: string, status: InstanceStatus, currentTask: string | null, metadata?: Record<string, string>): AgentInstance | undefined {
    const inst = this.instances.get(id);
    if (!inst) return undefined;
    inst.status = status;
    inst.lastHeartbeat = new Date().toISOString();
    inst.currentTask = currentTask;
    if (metadata) Object.assign(inst.metadata, metadata);
    return inst;
  }

  disconnect(id: string): AgentInstance | undefined {
    const inst = this.instances.get(id);
    if (!inst) return undefined;
    inst.status = "disconnected";
    this.addLog(id, "system", `${inst.name} disconnected`);
    return inst;
  }

  remove(id: string): boolean {
    this.logs.delete(id);
    return this.instances.delete(id);
  }

  // ---- Logs ----

  addLog(instanceId: string, type: LogEntry["type"], text: string): LogEntry {
    const entry: LogEntry = {
      id: randomUUID(),
      instanceId,
      type,
      text,
      timestamp: new Date().toISOString(),
    };
    let list = this.logs.get(instanceId);
    if (!list) {
      list = [];
      this.logs.set(instanceId, list);
    }
    list.push(entry);
    if (list.length > this.maxLogsPerInstance) {
      list.splice(0, list.length - this.maxLogsPerInstance);
    }
    return entry;
  }

  getLogs(instanceId: string, limit = 100): LogEntry[] {
    const list = this.logs.get(instanceId) ?? [];
    return list.slice(-limit);
  }

  // ---- Stats ----

  stats() {
    const all = this.getAll();
    const active = all.filter(i => i.status === "active").length;
    const idle = all.filter(i => i.status === "idle").length;
    const error = all.filter(i => i.status === "error").length;
    const hosts = new Set(all.filter(i => i.status !== "disconnected").map(i => i.host)).size;
    return { total: all.length, active, idle, error, hostsOnline: hosts };
  }
}

export const store = new InstanceStore();
