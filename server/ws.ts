import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { store } from "./storage";
import { registerInstanceSchema } from "@shared/schema";
import type { WSMessageFromAgent, WSMessageToAgent, WSMessageToClient } from "@shared/schema";
import { log } from "./index";

// Track connected sockets
const agentSockets = new Map<string, WebSocket>(); // instanceId -> ws
const clientSockets = new Set<WebSocket>();

export function broadcastToClients(msg: WSMessageToClient) {
  const data = JSON.stringify(msg);
  clientSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

export function sendToAgent(instanceId: string, msg: WSMessageToAgent): boolean {
  const ws = agentSockets.get(instanceId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const role = url.searchParams.get("role"); // "agent" or "client"

    if (role === "client") {
      handleClientConnection(ws);
    } else {
      handleAgentConnection(ws);
    }
  });

  // Heartbeat timeout checker — mark agents disconnected if no heartbeat in 30s
  setInterval(() => {
    const now = Date.now();
    agentSockets.forEach((_ws, id) => {
      const inst = store.get(id);
      if (!inst) return;
      const lastBeat = new Date(inst.lastHeartbeat).getTime();
      if (now - lastBeat > 30_000 && inst.status !== "disconnected") {
        store.disconnect(id);
        broadcastToClients({ type: "instance_update", payload: store.get(id)! });
      }
    });
  }, 10_000);

  log("WebSocket server ready on /ws");
}

function handleClientConnection(ws: WebSocket) {
  clientSockets.add(ws);
  log("Client connected via WebSocket");

  // Send current state immediately
  ws.send(JSON.stringify({ type: "instances", payload: store.getAll() } satisfies WSMessageToClient));

  ws.on("close", () => {
    clientSockets.delete(ws);
    log("Client disconnected");
  });
}

function handleAgentConnection(ws: WebSocket) {
  let instanceId: string | null = null;

  ws.on("message", (raw) => {
    let msg: WSMessageFromAgent;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case "register": {
        const parsed = registerInstanceSchema.safeParse(msg.payload);
        if (!parsed.success) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid registration" }));
          return;
        }
        instanceId = randomUUID();
        agentSockets.set(instanceId, ws);
        const instance = store.register(instanceId, parsed.data);
        ws.send(JSON.stringify({ type: "registered", instanceId }));
        broadcastToClients({ type: "instance_update", payload: instance });
        log(`Agent registered: ${instance.name} (${instanceId})`);
        break;
      }

      case "heartbeat": {
        if (!instanceId) return;
        const updated = store.updateHeartbeat(
          instanceId,
          msg.payload.status,
          msg.payload.currentTask,
          msg.payload.metadata
        );
        if (updated) {
          broadcastToClients({ type: "instance_update", payload: updated });
        }
        break;
      }

      case "log": {
        if (!instanceId) return;
        const entry = store.addLog(instanceId, msg.payload.logType, msg.payload.text);
        broadcastToClients({ type: "log", payload: entry });
        break;
      }

      case "command_result": {
        if (!instanceId) return;
        const { commandId, output, success } = msg.payload;
        store.addLog(instanceId, success ? "output" : "error", output);
        broadcastToClients({
          type: "command_result",
          payload: { instanceId, commandId, output, success },
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    if (instanceId) {
      agentSockets.delete(instanceId);
      const inst = store.disconnect(instanceId);
      if (inst) {
        broadcastToClients({ type: "instance_update", payload: inst });
        log(`Agent disconnected: ${inst.name} (${instanceId})`);
      }
    }
  });

  ws.on("error", (err) => {
    log(`Agent WS error: ${err.message}`);
  });
}
