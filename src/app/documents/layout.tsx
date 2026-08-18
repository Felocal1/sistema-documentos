import { Sidebar } from "@/components/Sidebar";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}
