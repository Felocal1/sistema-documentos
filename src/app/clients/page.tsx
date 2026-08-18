"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  cnpj: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  );

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Clientes</div>
          <div className="topbar-sub">Lista de todos os clientes cadastrados</div>
        </div>
      </header>

      <div className="page-container">
        <div className="search-bar" style={{ marginBottom: 24 }}>
          <span>🔍</span>
          <input
            id="search-clients"
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3>Nenhum cliente encontrado</h3>
            <p>Ajuste a busca ou cadastre um novo cliente.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => (
              <div
                key={c.id}
                id={`client-row-${c.id}`}
                className="card"
                style={{ padding: "16px 20px", cursor: "pointer" }}
                onClick={() => router.push(`/clients/${c.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "var(--radius)",
                    background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0
                  }}>🏢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--gray-100)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: ".8rem", color: "var(--gray-400)" }}>{c.cnpj}</div>
                  </div>
                  <span style={{ color: "var(--gray-500)", fontSize: "1.2rem" }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
