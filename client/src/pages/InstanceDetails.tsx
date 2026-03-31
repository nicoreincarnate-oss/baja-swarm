import { useRoute, Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Terminal, Play, Pause, Square, Send, MoreVertical, Cpu, MemoryStick, Clock, WifiOff } from "lucide-react";
import { useInstanceContext } from "@/context/InstanceContext";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export default function InstanceDetails() {
  const [, params] = useRoute("/instance/:id");
  const instanceId = params?.id ?? "";
  const { instances, sendCommand, sendControl, fetchLogs, getInstanceLogs } = useInstanceContext();
  const instance = instances.find((i) => i.id === instanceId);
  const logs = getInstanceLogs(instanceId);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch historical logs on mount
  useEffect(() => {
    if (instanceId) fetchLogs(instanceId);
  }, [instanceId, fetchLogs]);

  // Auto-scroll on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !instanceId || sending) return;
    setSending(true);
    try {
      await sendCommand(instanceId, input.trim());
      setInput("");
    } catch {}
    setSending(false);
  };

  const handleControl = async (action: "pause" | "resume" | "stop") => {
    if (!instanceId) return;
    try {
      await sendControl(instanceId, action);
    } catch {}
  };

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
        <WifiOff className="w-10 h-10" />
        <p className="text-sm">Instance not found or disconnected</p>
        <Link href="/">
          <a className="text-indigo-400 text-sm hover:underline">Back to Dashboard</a>
        </Link>
      </div>
    );
  }

  const uptime = formatDistanceToNow(new Date(instance.connectedAt));

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-white/10 bg-zinc-950 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <a className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </a>
          </Link>
          <div>
            <h1 className="font-semibold text-sm leading-tight flex items-center gap-2">
              {instance.name}
              <div className={cn(
                "w-2 h-2 rounded-full",
                instance.status === "active" ? "bg-emerald-500 animate-pulse" :
                instance.status === "error" ? "bg-rose-500" :
                instance.status === "idle" ? "bg-amber-500" :
                "bg-zinc-500"
              )} />
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">{instance.host} &middot; {instance.provider}</p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* Stats Bar */}
      <div className="flex-shrink-0 grid grid-cols-3 border-b border-white/5 bg-zinc-900/30">
        <div className="p-2 border-r border-white/5 flex flex-col items-center justify-center">
          <Cpu className="w-3.5 h-3.5 text-zinc-500 mb-1" />
          <span className="text-xs font-mono">{instance.metadata.cpu ?? "—"}</span>
        </div>
        <div className="p-2 border-r border-white/5 flex flex-col items-center justify-center">
          <MemoryStick className="w-3.5 h-3.5 text-zinc-500 mb-1" />
          <span className="text-xs font-mono">{instance.metadata.memory ?? "—"}</span>
        </div>
        <div className="p-2 flex flex-col items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-zinc-500 mb-1" />
          <span className="text-xs font-mono">{uptime}</span>
        </div>
      </div>

      {/* Terminal Output */}
      <ScrollArea className="flex-1 bg-[#0c0c0c] p-4">
        <div className="space-y-4 pb-4">
          {logs.length === 0 && (
            <div className="text-xs font-mono text-zinc-600 text-center py-8">
              No logs yet. Send a command to get started.
            </div>
          )}
          {logs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={log.id} className="text-xs font-mono leading-relaxed">
                {log.type === "system" && (
                  <div className="text-zinc-500 flex gap-2">
                    <span className="opacity-50 select-none">[{time}]</span>
                    <span>{log.text}</span>
                  </div>
                )}
                {log.type === "command" && (
                  <div className="text-indigo-400 flex gap-2">
                    <span className="opacity-50 text-zinc-500 select-none">[{time}]</span>
                    <span className="flex gap-2">
                      <span className="text-zinc-600 select-none">$</span>
                      {log.text}
                    </span>
                  </div>
                )}
                {log.type === "output" && (
                  <div className="text-zinc-300 flex gap-2">
                    <span className="opacity-50 text-zinc-500 select-none">[{time}]</span>
                    <span className="whitespace-pre-wrap">{log.text}</span>
                  </div>
                )}
                {log.type === "error" && (
                  <div className="text-rose-400 flex gap-2">
                    <span className="opacity-50 text-zinc-500 select-none">[{time}]</span>
                    <span className="whitespace-pre-wrap">{log.text}</span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Controls & Input */}
      <div className="flex-shrink-0 bg-zinc-950 border-t border-white/10 p-3">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleControl("resume")}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Resume
          </button>
          <button
            onClick={() => handleControl("pause")}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg py-2 flex items-center justify-center gap-2 text-xs font-medium text-amber-400 transition-colors"
          >
            <Pause className="w-3.5 h-3.5 fill-current" /> Pause
          </button>
          <button
            onClick={() => handleControl("stop")}
            className="w-10 bg-zinc-900 hover:bg-rose-950/30 border border-white/10 hover:border-rose-500/30 rounded-lg flex items-center justify-center text-rose-500 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="relative">
          <Terminal className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={instance.status === "disconnected" ? "Agent disconnected" : "Send command to agent..."}
            disabled={instance.status === "disconnected"}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-12 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || instance.status === "disconnected"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
