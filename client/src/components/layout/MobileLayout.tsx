import { Link, useLocation } from "wouter";
import { LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstanceContext } from "@/context/InstanceContext";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { connected, stats } = useInstanceContext();

  const navItems = [
    { href: "/", icon: LayoutGrid, label: "Overview" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black text-white relative shadow-2xl overflow-hidden border-x border-white/10 sm:border-y sm:h-[800px] sm:my-8 sm:rounded-[2.5rem]">

      {/* Top Status Bar */}
      <div className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-wide">BajaSwarm</span>
        </div>
        <div className="flex items-center gap-2">
          {stats.active > 0 && (
            <span className="text-[10px] font-mono text-zinc-500 mr-1">{stats.active} active</span>
          )}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full border",
            connected
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-rose-500/10 border-rose-500/20"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
            <span className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              connected ? "text-emerald-400" : "text-rose-400"
            )}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-black to-black -z-10" />
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 flex-shrink-0 border-t border-white/10 bg-zinc-950 flex items-center justify-around px-6 z-10">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors",
                isActive ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              )}>
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
