import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Key, Database, ChevronRight, LogOut } from "lucide-react";

export default function Settings() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>
        
        <div className="space-y-6">
          
          {/* Account */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Account</h2>
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              <div className="flex items-center justify-between p-4 bg-zinc-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Developer</p>
                    <p className="text-xs text-zinc-500">Pro Plan</p>
                  </div>
                </div>
                <button className="text-xs font-medium text-indigo-400 hover:text-indigo-300">Manage</button>
              </div>
            </div>
          </div>

          {/* Connections */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Connections</h2>
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium">API Keys</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>
              <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium">Remote Hosts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">2 Active</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Preferences</h2>
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-xs text-zinc-500">Task completion & errors</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium">Biometric Lock</p>
                    <p className="text-xs text-zinc-500">Require FaceID to open</p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          <button className="w-full py-4 rounded-xl text-rose-500 text-sm font-medium hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

        </div>
      </div>
    </ScrollArea>
  );
}
