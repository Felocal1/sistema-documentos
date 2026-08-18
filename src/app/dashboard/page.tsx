"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatCNPJ, validateCNPJ } from "@/lib/validation";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleCnpjChange = (v: string) => {
    setCnpj(formatCNPJ(v));
    setError("");
    setResult(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cnpj.replace(/[^\d]/g, "");
    if (!validateCNPJ(cleaned)) {
      setError("CNPJ inválido. Verifique o número digitado.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cnpj?q=${cleaned}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao buscar cliente");
      } else {
        setResult(data.client);
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewClient = () => {
    if (result) router.push(`/clients/${result.id}`);
  };

  const initials = session?.user?.name?.slice(0, 2).toUpperCase() || "?";

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-sub">Busca de cliente por CNPJ</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isAdmin && (
            <Link href="/admin/clients" className="btn btn-primary btn-sm" id="btn-cadastrar-cliente">
              ➕ Cadastrar Cliente
            </Link>
          )}
          <div className="user-avatar" title={session?.user?.name || ""}>{initials}</div>
        </div>
      </header>

      <div className="page-container">
        {/* Hero */}
        <div style={{ marginBottom: 32, animation: "slideUp .4s ease" }}>
          <h1 style={{ marginBottom: 8 }}>
            Olá, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p>Busque um cliente pelo CNPJ para acessar o histórico de documentos.</p>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(37,99,235,.12)" }}>🏢</div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Clientes cadastrados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(16,185,129,.12)" }}>📄</div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Documentos armazenados</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "rgba(245,158,11,.12)" }}>📅</div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Enviados hoje</div>
            </div>
          </div>
        </div>

        {/* Busca por CNPJ */}
        <div className="card" style={{ animation: "slideUp .5s ease", marginBottom: 24 }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>🔍 Buscar cliente por CNPJ</h2>
          </div>

          <form onSubmit={handleSearch} id="cnpj-search-form">
            <div className="search-bar" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: "1.2rem" }}>🏢</span>
              <input
                id="input-cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={e => handleCnpjChange(e.target.value)}
                maxLength={18}
                style={{ fontSize: "1.1rem", letterSpacing: ".03em" }}
                autoFocus
              />
              <button
                id="btn-buscar-cnpj"
                type="submit"
                className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
                disabled={loading || cnpj.replace(/[^\d]/g, "").length !== 14}
              >
                {!loading && "Buscar"}
              </button>
            </div>

            {error && (
              <div className="alert alert-error" role="alert">
                <span>⚠️</span> {error}
              </div>
            )}
          </form>

          {/* Resultado */}
          {result && (
            <div
              style={{
                marginTop: 20, padding: 20,
                background: "var(--gray-800)", borderRadius: "var(--radius-lg)",
                border: "1px solid var(--gray-700)",
                animation: "slideUp .3s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 52, height: 52,
                    background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
                    borderRadius: "var(--radius-lg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24
                  }}>🏢</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--gray-50)" }}>{result.name}</div>
                    <div style={{ fontFamily: "monospace", color: "var(--gray-400)", fontSize: ".875rem" }}>{result.cnpj}</div>
                  </div>
                </div>
                <button
                  id="btn-ver-historico"
                  className="btn btn-primary"
                  onClick={handleViewClient}
                >
                  📂 Ver histórico
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Acesso rápido */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16 }}>
          <Link href="/documents" className="card" style={{ textDecoration: "none", cursor: "pointer" }} id="link-todos-docs">
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>📂</div>
            <h3 style={{ color: "var(--gray-100)", marginBottom: 4 }}>Todos os documentos</h3>
            <p style={{ fontSize: ".875rem" }}>Visualize e filtre por data</p>
          </Link>
          <Link href="/clients" className="card" style={{ textDecoration: "none", cursor: "pointer" }} id="link-clientes">
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🏢</div>
            <h3 style={{ color: "var(--gray-100)", marginBottom: 4 }}>Lista de clientes</h3>
            <p style={{ fontSize: ".875rem" }}>Todos os clientes cadastrados</p>
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className="card" style={{ textDecoration: "none", cursor: "pointer" }} id="link-usuarios">
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>👥</div>
              <h3 style={{ color: "var(--gray-100)", marginBottom: 4 }}>Usuários</h3>
              <p style={{ fontSize: ".875rem" }}>Gerenciar acessos ao sistema</p>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
