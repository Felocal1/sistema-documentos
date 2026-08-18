"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  client: { name: string; cnpj: string; id: string };
  uploadedBy: { name: string };
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AllDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/documents/all?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const filtered = docs.filter(d =>
    d.originalName.toLowerCase().includes(search.toLowerCase()) ||
    d.client?.name.toLowerCase().includes(search.toLowerCase()) ||
    d.client?.cnpj.includes(search)
  );

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Todos os Documentos</div>
          <div className="topbar-sub">Histórico completo do sistema</div>
        </div>
      </header>

      <div className="page-container">
        <div className="filters-bar">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Buscar</label>
            <input
              id="docs-search"
              type="text"
              className="form-input"
              placeholder="Nome do arquivo, cliente ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">De</label>
            <input id="docs-date-from" type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Até</label>
            <input id="docs-date-to" type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button id="btn-filtrar-docs" className="btn btn-primary" onClick={fetchDocs}>🔍 Filtrar</button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>Nenhum documento encontrado</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map(doc => (
              <div
                key={doc.id}
                id={`all-doc-${doc.id}`}
                className="card"
                style={{ padding: "14px 18px", cursor: "pointer" }}
                onClick={() => router.push(`/clients/${doc.client?.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: "1.5rem" }}>{doc.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--gray-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.originalName}
                    </div>
                    <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>
                      {doc.client?.name} · {doc.client?.cnpj} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <span style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>{formatBytes(doc.size)}</span>
                  <span style={{ color: "var(--gray-500)" }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
