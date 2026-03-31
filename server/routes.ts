import type { Express } from "express";
import type { Server } from "http";
import { store } from "./storage";
import { sendToAgent } from "./ws";
import { setupWebSocket } from "./ws";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup WebSocket on the same HTTP server
  setupWebSocket(httpServer);

  // ---- REST API ----

  // Get all instances
  app.get("/api/instances", (_req, res) => {
    res.json(store.getAll());
  });

  // Get single instance
  app.get("/api/instances/:id", (req, res) => {
    const inst = store.get(req.params.id);
    if (!inst) return res.status(404).json({ message: "Instance not found" });
    res.json(inst);
  });

  // Get instance stats
  app.get("/api/stats", (_req, res) => {
    res.json(store.stats());
  });

  // Get logs for an instance
  app.get("/api/instances/:id/logs", (req, res) => {
    const inst = store.get(req.params.id);
    if (!inst) return res.status(404).json({ message: "Instance not found" });
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(store.getLogs(req.params.id, limit));
  });

  // Send command to an agent
  app.post("/api/instances/:id/command", (req, res) => {
    const inst = store.get(req.params.id);
    if (!inst) return res.status(404).json({ message: "Instance not found" });
    if (inst.status === "disconnected") return res.status(400).json({ message: "Agent is disconnected" });

    const { text } = req.body;
    if (!text || typeof text !== "string") return res.status(400).json({ message: "Missing command text" });

    const commandId = randomUUID();
    const sent = sendToAgent(req.params.id, { type: "command", payload: { commandId, text } });

    if (!sent) return res.status(502).json({ message: "Failed to reach agent" });

    // Log the command
    store.addLog(req.params.id, "command", text);

    res.json({ commandId, status: "sent" });
  });

  // Send control signal to agent (pause/resume/stop)
  app.post("/api/instances/:id/control", (req, res) => {
    const inst = store.get(req.params.id);
    if (!inst) return res.status(404).json({ message: "Instance not found" });

    const { action } = req.body;
    if (!["pause", "resume", "stop"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use pause, resume, or stop" });
    }

    const sent = sendToAgent(req.params.id, { type: action as "pause" | "resume" | "stop" });
    if (!sent) return res.status(502).json({ message: "Failed to reach agent" });

    store.addLog(req.params.id, "system", `Control signal sent: ${action}`);
    res.json({ status: "sent" });
  });

  // Remove a disconnected instance
  app.delete("/api/instances/:id", (req, res) => {
    const inst = store.get(req.params.id);
    if (!inst) return res.status(404).json({ message: "Instance not found" });
    store.remove(req.params.id);
    res.json({ status: "removed" });
  });

  return httpServer;
}
