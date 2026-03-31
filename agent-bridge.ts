#!/usr/bin/env npx tsx
/**
 * Agent Bridge — connects a local AI coding agent to the BajaSwarm server.
 *
 * Usage:
 *   npx tsx agent-bridge.ts --name "Claude Code" --provider Anthropic --host macbook-pro.local --server ws://localhost:5000/ws
 *   npx tsx agent-bridge.ts --name "Codex" --provider OpenAI --host macbook-pro.local --server ws://localhost:5000/ws
 *
 * The bridge:
 *   1. Connects to the BajaSwarm WebSocket server
 *   2. Registers itself as an agent
 *   3. Sends periodic heartbeats with system stats
 *   4. Listens for commands and executes them
 *   5. Streams output back to the server
 */

import { WebSocket } from "ws";
import { execSync, spawn } from "child_process";
import os from "os";

// ---- CLI Args ----
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const NAME = getArg("name", "Claude Code");
const PROVIDER = getArg("provider", "Anthropic");
const HOST = getArg("host", os.hostname());
const SERVER = getArg("server", "ws://localhost:5000/ws");
const HEARTBEAT_INTERVAL = 5000; // 5s

// ---- System Stats ----
function getSystemStats(): Record<string, string> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // CPU usage approximation
  const cpuLoad = os.loadavg()[0]; // 1-min load average
  const cpuPercent = Math.round((cpuLoad / cpus.length) * 100);

  return {
    cpu: `${Math.min(cpuPercent, 100)}%`,
    memory: `${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB`,
    platform: `${os.platform()} ${os.arch()}`,
    node: process.version,
  };
}

// ---- Process Discovery ----
function detectRunningAgents(): { name: string; provider: string; pid: number }[] {
  const agents: { name: string; provider: string; pid: number }[] = [];
  try {
    const ps = execSync("ps aux", { encoding: "utf-8" });
    for (const line of ps.split("\n")) {
      if (line.includes("claude") && (line.includes("--task") || line.includes("claude-code") || line.includes("claude_code"))) {
        const pid = parseInt(line.trim().split(/\s+/)[1]);
        if (pid) agents.push({ name: "Claude Code", provider: "Anthropic", pid });
      }
      if (line.includes("codex") && !line.includes("agent-bridge")) {
        const pid = parseInt(line.trim().split(/\s+/)[1]);
        if (pid) agents.push({ name: "Codex", provider: "OpenAI", pid });
      }
    }
  } catch {}
  return agents;
}

// ---- WebSocket Client ----
let ws: WebSocket;
let instanceId: string | null = null;
let currentTask: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval>;

function connect() {
  console.log(`[bridge] Connecting to ${SERVER}...`);
  ws = new WebSocket(SERVER);

  ws.on("open", () => {
    console.log(`[bridge] Connected. Registering as "${NAME}" (${PROVIDER})...`);
    ws.send(JSON.stringify({
      type: "register",
      payload: {
        name: NAME,
        provider: PROVIDER,
        host: HOST,
        metadata: getSystemStats(),
      },
    }));

    // Start heartbeat
    heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "heartbeat",
          payload: {
            status: currentTask ? "active" : "idle",
            currentTask,
            metadata: getSystemStats(),
          },
        }));
      }
    }, HEARTBEAT_INTERVAL);
  });

  ws.on("message", (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "registered") {
      instanceId = msg.instanceId;
      console.log(`[bridge] Registered with ID: ${instanceId}`);

      // Send initial log
      ws.send(JSON.stringify({
        type: "log",
        payload: {
          logType: "system",
          text: `Agent bridge started. ${NAME} ready on ${HOST}.`,
        },
      }));

      // Detect other local agents
      const locals = detectRunningAgents();
      if (locals.length > 0) {
        ws.send(JSON.stringify({
          type: "log",
          payload: {
            logType: "system",
            text: `Detected ${locals.length} local agent process(es): ${locals.map(a => `${a.name} (PID ${a.pid})`).join(", ")}`,
          },
        }));
      }
    }

    if (msg.type === "command") {
      const { commandId, text } = msg.payload;
      console.log(`[bridge] Received command: ${text}`);
      currentTask = text;

      // Log that we're executing
      ws.send(JSON.stringify({
        type: "log",
        payload: { logType: "output", text: `Executing: ${text}` },
      }));

      // Execute the command in a shell
      const child = spawn("sh", ["-c", text], {
        cwd: process.cwd(),
        env: { ...process.env },
      });

      let output = "";

      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        ws.send(JSON.stringify({
          type: "log",
          payload: { logType: "output", text: chunk.trimEnd() },
        }));
      });

      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        ws.send(JSON.stringify({
          type: "log",
          payload: { logType: "error", text: chunk.trimEnd() },
        }));
      });

      child.on("close", (code) => {
        currentTask = null;
        ws.send(JSON.stringify({
          type: "command_result",
          payload: {
            commandId,
            output: output || `Process exited with code ${code}`,
            success: code === 0,
          },
        }));
      });
    }

    if (msg.type === "pause") {
      console.log("[bridge] Pause requested");
      ws.send(JSON.stringify({ type: "log", payload: { logType: "system", text: "Agent paused by remote control" } }));
    }

    if (msg.type === "resume") {
      console.log("[bridge] Resume requested");
      ws.send(JSON.stringify({ type: "log", payload: { logType: "system", text: "Agent resumed by remote control" } }));
    }

    if (msg.type === "stop") {
      console.log("[bridge] Stop requested");
      ws.send(JSON.stringify({ type: "log", payload: { logType: "system", text: "Agent stopped by remote control" } }));
      process.exit(0);
    }
  });

  ws.on("close", () => {
    clearInterval(heartbeatTimer);
    console.log("[bridge] Disconnected. Reconnecting in 3s...");
    setTimeout(connect, 3000);
  });

  ws.on("error", (err) => {
    console.error(`[bridge] Error: ${err.message}`);
  });
}

// ---- Start ----
console.log(`
╔══════════════════════════════════════╗
║        BajaSwarm Agent Bridge        ║
╠══════════════════════════════════════╣
║  Name:     ${NAME.padEnd(25)}║
║  Provider: ${PROVIDER.padEnd(25)}║
║  Host:     ${HOST.padEnd(25)}║
║  Server:   ${SERVER.padEnd(25)}║
╚══════════════════════════════════════╝
`);

connect();
