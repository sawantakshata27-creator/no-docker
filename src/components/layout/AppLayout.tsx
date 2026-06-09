import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ChatBot } from "@/components/chat/ChatBot";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <ChatBot />
    </div>
  );
}
