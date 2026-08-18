"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", icon: "🔍", label: "Busca por CNPJ" },
  { href: "/clients",   icon: "🏢", label: "Clientes" },
  { href: "/documents", icon: "📂", label: "Todos os Documentos" },
];

const adminItems = [
  { href: "/admin/users",   icon: "👥", label: "Usuários" },
  { href: "/admin/clients", icon: "➕", label: "Cadastrar Cliente" },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() || "??";

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">📋</div>
        <div>
          <div className="sidebar-logo-text">DocManager</div>
          <div className="sidebar-logo-sub">Gestão de Documentos</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
            id={`nav-${item.href.replace("/", "").replace("/", "-")}`}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div style={{ padding: "12px 12px 4px", fontSize: ".68rem", fontWeight: 700, color: "var(--gray-600)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Administração
            </div>
            {adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname.startsWith(item.href) ? "active" : ""}
                id={`nav-${item.href.replace(/\//g, "-").slice(1)}`}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="user-avatar" style={{ width: 36, height: 36, fontSize: ".75rem" }}>{initials}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--gray-200)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {session?.user?.name}
            </div>
            <div style={{ fontSize: ".68rem", color: "var(--gray-500)" }}>
              {isAdmin ? "Administrador" : "Operador"}
            </div>
          </div>
        </div>
        <button
          id="btn-logout"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-ghost btn-sm btn-full"
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  );
}
