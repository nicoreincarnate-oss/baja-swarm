import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Terminal, AlertCircle, ChevronRight, Server, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstanceContext } from "@/context/InstanceContext";
import type { AgentInstance } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

function StatusIcon({ status }: { status: AgentInstance["status"] }) {
  if (status === "active") return <Play className="w-5 h-5 fill-current" />;
  if (status === "error") return <AlertCircle className="w-5 h-5" />;
  if (status === "disconnected") return <WifiOff className="w-5 h-5" />;
  return <Pause className="w-5 h-5 fill-current" />;
}

function statusColor(status: AgentInstance["status"]) {
  if (status === "active") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
  if (status === "error") return "bg-rose-500/10 border-rose-500/30 text-rose-500";
  if (status === "disconnected") return "bg-zinc-800/50 border-zinc-700/50 text-zinc-600";
  return "bg-zinc-800 border-zinc-700 text-zinc-400";
}

export default function Dashboard() {
  const { instances, connected, stats } = useInstanceContext();

  const liveInstances = instances.filter(i => i.status !== "disconnected");
  const disconnected = instances.filter(i => i.status === "disconnected");

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-8 space-y-6">

        {/* Header & Stats */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Machines</h1>
            <div className="flex items-center gap-2">
              {connected ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Offline</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-medium text-zinc-400">Hosts Online</span>
              </div>
              <p className="text-2xl font-semibold">{stats.hostsOnline}</p>
            </div>
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-medium text-zinc-400">Active Agents</span>
              </div>
              <p className="text-2xl font-semibold">{stats.active}</p>
            </div>
          </div>
        </div>

        {/* Connected Instances */}
        {liveInstances.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Connected Instances</h2>
            {liveInstances.map((instance) => (
              <Link key={instance.id} href={`/instance/${instance.id}`}>
                <a className="block">
                  <Card className="bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:border-white/20 transition-all overflow-hidden rounded-xl">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", statusColor(instance.status))}>
                            <StatusIcon status={instance.status} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                              {instance.name}
                              <span className="text-[10px] font-normal text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                {instance.provider}
                              </span>
                            </h3>
                            <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", instance.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-zinc-600")} />
                              {instance.host}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      </div>

                      <div className="bg-black/40 rounded-lg p-2.5 border border-white/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">Current Task</span>
                          <span className="text-[10px] text-zinc-500">
                            {formatDistanceToNow(new Date(instance.lastHeartbeat), { addSuffix: true })}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs font-mono truncate",
                          instance.status === "error" ? "text-rose-400" : "text-zinc-300"
                        )}>
                          &gt; {instance.currentTask ?? "Idle — waiting for commands"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Disconnected */}
        {disconnected.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-600 uppercase tracking-wider mb-2">Disconnected</h2>
            {disconnected.map((instance) => (
              <div key={instance.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-3 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", statusColor(instance.status))}>
                    <StatusIcon status={instance.status} />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-400 text-sm">{instance.name}</h3>
                    <p className="text-[10px] text-zinc-600">{instance.host}</p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {formatDistanceToNow(new Date(instance.lastHeartbeat), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {instances.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center">
              <Terminal className="w-8 h-8 text-zinc-600" />
            </div>
            <div>
              <p className="text-zinc-400 font-medium">No agents connected</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-[250px] mx-auto">
                Run the agent bridge on your desktop to connect Claude Code or Codex instances
              </p>
            </div>
          </div>
        )}

        {/* Connect button */}
        <button className="w-full py-3.5 rounded-xl border border-dashed border-white/20 text-sm font-medium text-zinc-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
          <Terminal className="w-4 h-4" />
          Connect New Agent
        </button>
      </div>
    </ScrollArea>
  );
}
