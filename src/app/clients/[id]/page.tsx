"use client";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface Document {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  uploadedBy: { name: string };
}

interface Client {
  id: string;
  cnpj: string;
  name: string;
  email: string | null;
  phone: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DocIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <div className="doc-icon doc-icon-pdf">📄</div>;
  return <div className="doc-icon doc-icon-image">🖼️</div>;
}

export default function ClientPage() {
  return (
    <Suspense>
      <ClientContent />
    </Suspense>
  );
}

function ClientContent() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = params.id as string;
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  // Acesso externo via link assinado
  const linkToken = searchParams.get("linkToken");
  const isLinkMode = !!linkToken;
  const queryWithToken = linkToken ? `?linkToken=${encodeURIComponent(linkToken)}` : "";

  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Uso global do store
  const [storeUsage, setStoreUsage] = useState<{ totalSize: number; totalCount: number; byType: { mimeType: string; size: number; count: number }[] } | null>(null);

  // Filtros
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Upload
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gerar link
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [generatedLink, setGeneratedLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Viewer
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null);
  const [viewerUrl, setViewerUrl] = useState("");

  // Gerar HTML
  const [htmlLoading, setHtmlLoading] = useState(false);

  // Deleta
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const fetchClient = useCallback(async () => {
    try {
      // Busca cliente por ID via CNPJ API (ajuste se tiver endpoint de ID)
      const res = await fetch(`/api/clients/${clientId}${queryWithToken}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
      }
    } catch {}
  }, [clientId, queryWithToken]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ clientId });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (linkToken) params.set("linkToken", linkToken);
      const res = await fetch(`/api/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      setError("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }, [clientId, dateFrom, dateTo, linkToken]);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/documents/all?usage=1");
      if (res.ok) {
        const data = await res.json();
        setStoreUsage(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchClient();
    fetchDocuments();
    fetchUsage();
  }, [fetchClient, fetchDocuments, fetchUsage]);

  // Upload handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadError("");
    setUploadProgress(10);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("clientId", clientId);
    if (uploadDesc) formData.append("description", uploadDesc);

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      setUploadProgress(80);
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Erro ao enviar documento");
      } else {
        setUploadProgress(100);
        setUploadSuccess(true);
        setUploadFile(null);
        setUploadDesc("");
        setTimeout(() => {
          setShowUpload(false);
          setUploadSuccess(false);
          setUploadProgress(0);
          fetchDocuments();
          fetchUsage();
        }, 1200);
      }
    } catch {
      setUploadError("Erro de conexão");
    } finally {
      setUploadLoading(false);
    }
  };

  // Viewer
  const openViewer = (doc: Document) => {
    setViewerDoc(doc);
    setViewerUrl(`/api/documents/${doc.id}${queryWithToken}`);
  };

  const closeViewer = () => {
    setViewerDoc(null);
    setViewerUrl("");
  };

  // Delete
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments(d => d.filter(doc => doc.id !== id));
      setDeleteId(null);
      fetchUsage();
    }
  };

  // Download em lote
  const handleBulkDownload = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const a = document.createElement("a");
      a.href = `/api/documents/${id}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  // Exclusão em lote
  const [bulkDeleteId, setBulkDeleteId] = useState<string | null>(null);

  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) deleted++;
    }
    setDocuments(d => d.filter(doc => !selectedIds.has(doc.id)));
    setSelectedIds(new Set());
    setBulkDeleteId(null);
    setBulkActionLoading(false);
    fetchUsage();
  };

  // Drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setUploadFile(f);
  };

  // Gerar link de acesso externo
  const handleGenerateLink = async () => {
    setLinkLoading(true);
    setLinkError("");
    setGeneratedLink(null);
    setCopied(false);
    try {
      const res = await fetch("/api/client-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error || "Erro ao gerar link");
      } else {
        setGeneratedLink({
          url: data.link.url,
          expiresAt: new Date(data.link.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        });
      }
    } catch {
      setLinkError("Erro de conexão");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Gerar HTML com dados do cliente e links dos documentos
  const handleGenerateHtml = async () => {
    if (!client) return;
    setHtmlLoading(true);
    try {
      // Gera link externo para acesso aos documentos
      let clientLinkUrl = "";
      const linkRes = await fetch("/api/client-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        clientLinkUrl = linkData.link?.url || "";
      }

      // Fallback: construir URL manualmente se a API não retornou
      if (!clientLinkUrl) {
        const origin = window.location.origin;
        clientLinkUrl = `${origin}/clients/${clientId}`;
      }

      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${clientLinkUrl}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${client.name} — Redirecionando...</title>
  <script>window.location.href="${clientLinkUrl}";</script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; padding: 48px; }
    .icon { font-size: 3rem; margin-bottom: 16px; animation: pulse 1.5s ease-in-out infinite; }
    h1 { font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: .9rem; margin-bottom: 24px; }
    a { color: #60a5fa; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📋</div>
    <h1>${client.name}</h1>
    <p>Redirecionando para o ambiente de anexos...</p>
    <a href="${clientLinkUrl}">Clique aqui se não redirecionar automaticamente</a>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_documentos.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
    } finally {
      setHtmlLoading(false);
    }
  };

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            id="btn-voltar"
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm"
            style={{ padding: "6px 10px" }}
          >
            ← Voltar
          </button>
          <div>
            <div className="topbar-title">{client?.name || "Carregando..."}</div>
            <div className="topbar-sub">{client?.cnpj}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && !isLinkMode && (
            <button
              id="btn-gerar-link"
              className="btn btn-outline"
              onClick={() => setShowLinkModal(true)}
            >
              🔗 Gerar link
            </button>
          )}
          {!isLinkMode && documents.length > 0 && (
            <button
              id="btn-gerar-html"
              className="btn btn-outline"
              onClick={handleGenerateHtml}
              disabled={htmlLoading}
            >
              {htmlLoading ? "⏳ Gerando..." : "📄 Gerar HTML"}
            </button>
          )}
          {!isLinkMode && (
            <button
              id="btn-anexar"
              className="btn btn-primary"
              onClick={() => setShowUpload(true)}
            >
              📎 Anexar documento
            </button>
          )}
        </div>
      </header>

      {isLinkMode && (
        <div className="alert" style={{ margin: "16px 24px 0", animation: "slideUp .3s ease" }} role="status">
          🔗 <strong>Acesso externo via link</strong> — você está visualizando os documentos deste cliente em modo somente leitura.
        </div>
      )}

      <div className="page-container">
        {/* Client header card */}
        {client && (
          <div className="client-header" style={{ animation: "slideUp .4s ease" }}>
            <div className="client-avatar">🏢</div>
            <div style={{ flex: 1 }}>
              <div className="client-name">{client.name}</div>
              <div className="client-cnpj">{client.cnpj}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                {client.email && <span style={{ fontSize: ".8rem", color: "var(--gray-400)" }}>✉️ {client.email}</span>}
                {client.phone && <span style={{ fontSize: ".8rem", color: "var(--gray-400)" }}>📞 {client.phone}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--gray-50)" }}>{documents.length}</div>
              <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>documento{documents.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
        )}

        {/* Indicador de armazenamento global do store */}
        {storeUsage && storeUsage.totalCount > 0 && (() => {
          const { totalSize, totalCount } = storeUsage;
          const pdfCount = documents.filter(d => d.mimeType === "application/pdf").length;
          const imgCount = documents.length - pdfCount;
          const maxStorage = 1024 * 1024 * 1024;
          const pct = Math.min((totalSize / maxStorage) * 100, 100);
          const pctLabel = pct < 1 ? pct.toFixed(1) : pct.toFixed(0);
          const barColor = pct > 80 ? "var(--danger)" : pct > 50 ? "var(--warning)" : "var(--brand-500)";

          return (
            <div className="card" style={{ padding: "20px 24px", animation: "slideUp .5s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: ".9rem", fontWeight: 600, color: "var(--gray-200)" }}>📊 Armazenamento do Store</div>
                <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>{formatBytes(totalSize)} / 1 GB</div>
              </div>
              <div style={{ background: "var(--gray-800)", borderRadius: 999, height: 10, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ width: `${pctLabel}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width .6s ease" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div style={{ textAlign: "center", padding: "10px 0", background: "var(--gray-800)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--gray-50)" }}>{totalCount}</div>
                  <div style={{ fontSize: ".7rem", color: "var(--gray-500)", marginTop: 2 }}>Total Store</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 0", background: "rgba(239,68,68,.08)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444" }}>{pdfCount}</div>
                  <div style={{ fontSize: ".7rem", color: "var(--gray-500)", marginTop: 2 }}>PDFs</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 0", background: "rgba(59,130,246,.08)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#3b82f6" }}>{imgCount}</div>
                  <div style={{ fontSize: ".7rem", color: "var(--gray-500)", marginTop: 2 }}>Imagens</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 0", background: "var(--gray-800)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--gray-50)" }}>{formatBytes(totalSize)}</div>
                  <div style={{ fontSize: ".7rem", color: "var(--gray-500)", marginTop: 2 }}>Espaço</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filtros */}
        <div className="filters-bar">
          <div className="form-group">
            <label className="form-label">Data inicial</label>
            <input
              id="filter-date-from"
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data final</label>
            <input
              id="filter-date-to"
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
          <button
            id="btn-filtrar"
            className="btn btn-outline"
            onClick={fetchDocuments}
          >
            🔍 Filtrar
          </button>
          {(dateFrom || dateTo) && (
            <button
              id="btn-limpar-filtro"
              className="btn btn-ghost btn-sm"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
            >
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Documentos */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {documents.length > 0 && !isLinkMode && (
                <input
                  id="select-all-docs"
                  type="checkbox"
                  checked={selectedIds.size === documents.length && documents.length > 0}
                  onChange={toggleSelectAll}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--brand-500)" }}
                />
              )}
              <h2 style={{ margin: 0 }}>📂 Histórico de documentos</h2>
            </div>
            <span style={{ fontSize: ".8rem", color: "var(--gray-500)" }}>
              {selectedIds.size > 0
                ? `${selectedIds.size} selecionado${selectedIds.size > 1 ? "s" : ""}`
                : `${documents.length} arquivo${documents.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>Nenhum documento encontrado</h3>
              <p>Clique em "Anexar documento" para adicionar o primeiro arquivo deste cliente.</p>
              {!isLinkMode && (
                <button className="btn btn-primary btn-sm" id="btn-primeiro-anexo" onClick={() => setShowUpload(true)}>
                  📎 Anexar agora
                </button>
              )}
            </div>
          ) : (
            <div className="docs-grid">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`doc-card ${selectedIds.has(doc.id) ? "doc-card-selected" : ""}`}
                  id={`doc-${doc.id}`}
                  onClick={() => openViewer(doc)}
                >
                  {isAdmin && !isLinkMode && (
                    <input
                      id={`select-${doc.id}`}
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand-500)", zIndex: 2 }}
                    />
                  )}
                  <DocIcon mimeType={doc.mimeType} />
                  <div className="doc-name">{doc.originalName}</div>
                  <div className="doc-date">{formatDate(doc.createdAt)}</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <span className={`badge ${doc.mimeType === "application/pdf" ? "badge-pdf" : "badge-image"}`}>
                      {doc.mimeType === "application/pdf" ? "PDF" : "Imagem"}
                    </span>
                    <span className="doc-size">{formatBytes(doc.size)}</span>
                  </div>
                  {doc.description && (
                    <div style={{ fontSize: ".72rem", color: "var(--gray-500)", fontStyle: "italic" }}>{doc.description}</div>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-danger btn-sm"
                      id={`btn-delete-${doc.id}`}
                      style={{ position: "absolute", top: 8, right: 8, padding: "2px 6px", fontSize: ".7rem", borderRadius: "var(--radius-sm)" }}
                      onClick={e => { e.stopPropagation(); setDeleteId(doc.id); }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barra de ações em lote */}
      {selectedIds.size > 0 && !isLinkMode && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--gray-900)", border: "1px solid var(--gray-700)",
          borderRadius: "var(--radius-lg)", padding: "12px 20px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 900,
          animation: "slideUp .2s ease",
        }}>
          <span style={{ fontSize: ".85rem", color: "var(--gray-300)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div style={{ width: 1, height: 24, background: "var(--gray-700)" }} />
          <button
            id="btn-bulk-download"
            className="btn btn-outline btn-sm"
            onClick={handleBulkDownload}
            disabled={bulkActionLoading}
          >
            ⬇ Baixar
          </button>
          {isAdmin && (
            <button
              id="btn-bulk-delete"
              className="btn btn-danger btn-sm"
              onClick={() => setBulkDeleteId("bulk")}
              disabled={bulkActionLoading}
            >
              🗑 Excluir
            </button>
          )}
          <button
            id="btn-bulk-cancel"
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedIds(new Set())}
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal confirmação exclusão em lote */}
      {bulkDeleteId && (
        <div className="modal-overlay" onClick={() => setBulkDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Excluir documentos</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setBulkDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--gray-300)" }}>
                Tem certeza que deseja excluir <strong>{selectedIds.size} arquivo{selectedIds.size > 1 ? "s" : ""}</strong>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setBulkDeleteId(null)}>Cancelar</button>
              <button
                id="btn-confirm-bulk-delete"
                className={`btn btn-danger btn-sm ${bulkActionLoading ? "btn-loading" : ""}`}
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
              >
                {!bulkActionLoading && `Excluir ${selectedIds.size} arquivo${selectedIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL GERAR LINK ===== */}
      {showLinkModal && (
        <div className="modal-overlay" id="modal-gerar-link" onClick={e => { if (e.target === e.currentTarget) setShowLinkModal(false); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>🔗 Link de acesso externo</h3>
              <button id="btn-fechar-link" className="btn btn-ghost btn-sm" onClick={() => setShowLinkModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--gray-300)", fontSize: ".875rem", marginBottom: 16 }}>
                Gere um link para <strong>{client?.name}</strong> e cole no outro sistema (histórico financeiro). Quem
                abrir o link acessa a tela de anexos deste cliente <strong>sem precisar de login</strong>, em modo
                somente leitura.
              </p>

              {linkError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {linkError}</div>}

              {!generatedLink ? (
                <button
                  id="btn-confirmar-gerar-link"
                  className={`btn btn-primary btn-full btn-lg ${linkLoading ? "btn-loading" : ""}`}
                  onClick={handleGenerateLink}
                  disabled={linkLoading}
                >
                  {!linkLoading && "🔗 Gerar link"}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: ".8rem", color: "var(--gray-400)" }}>
                    ⏳ Válido até <strong>{generatedLink.expiresAt}</strong>
                  </div>
                  <div className="search-bar">
                    <input
                      id="link-resultado"
                      type="text"
                      readOnly
                      value={generatedLink.url}
                      onFocus={e => e.target.select()}
                    />
                    <button id="btn-copiar-link" className="btn btn-primary" onClick={handleCopyLink}>
                      {copied ? "✅ Copiado!" : "📋 Copiar"}
                    </button>
                  </div>
                  <button id="btn-gerar-outro-link" className="btn btn-ghost" onClick={handleGenerateLink} disabled={linkLoading}>
                    🔄 Gerar outro link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL UPLOAD ===== */}
      {showUpload && (
        <div className="modal-overlay" id="modal-upload" onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>📎 Anexar documento</h3>
              <button id="btn-fechar-upload" className="btn btn-ghost btn-sm" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <div className="modal-body">
              {uploadSuccess ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div style={{ fontSize: "3rem" }}>✅</div>
                  <h3 style={{ color: "var(--success)" }}>Documento salvo com sucesso!</h3>
                </div>
              ) : (
                <form onSubmit={handleUpload} id="upload-form">
                  {uploadError && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {uploadError}</div>
                  )}

                  {/* Drop zone */}
                  <div
                    id="upload-dropzone"
                    className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{ marginBottom: 16 }}
                  >
                    {uploadFile ? (
                      <>
                        <div style={{ fontSize: "2.5rem" }}>{uploadFile.type === "application/pdf" ? "📄" : "🖼️"}</div>
                        <h3 style={{ color: "var(--gray-100)" }}>{uploadFile.name}</h3>
                        <p>{formatBytes(uploadFile.size)}</p>
                        <span className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Trocar arquivo</span>
                      </>
                    ) : (
                      <>
                        <div className="upload-zone-icon">📁</div>
                        <h3>Arraste o arquivo aqui</h3>
                        <p>ou clique para selecionar</p>
                        <p style={{ fontSize: ".75rem", marginTop: 8 }}>PDF, JPG, PNG, TIFF — máx. {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 20}MB</p>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
                    style={{ display: "none" }}
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  />

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label" htmlFor="upload-desc">Descrição (opcional)</label>
                    <input
                      id="upload-desc"
                      type="text"
                      className="form-input"
                      placeholder="Ex: Contrato assinado jan/2025"
                      value={uploadDesc}
                      onChange={e => setUploadDesc(e.target.value)}
                      maxLength={200}
                    />
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="progress-bar" style={{ marginBottom: 12 }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  <button
                    id="btn-salvar-doc"
                    type="submit"
                    className={`btn btn-primary btn-full btn-lg ${uploadLoading ? "btn-loading" : ""}`}
                    disabled={!uploadFile || uploadLoading}
                  >
                    {!uploadLoading && "💾 Salvar documento"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL VIEWER ===== */}
      {viewerDoc && (
        <div className="modal-overlay" id="modal-viewer" onClick={e => { if (e.target === e.currentTarget) closeViewer(); }}>
          <div className="modal" style={{ maxWidth: "95vw", maxHeight: "95vh" }}>
            <div className="modal-header">
              <div>
                <h3 style={{ marginBottom: 2 }}>{viewerDoc.originalName}</h3>
                <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>
                  {formatDate(viewerDoc.createdAt)} · {formatBytes(viewerDoc.size)} · por {viewerDoc.uploadedBy.name}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  id="btn-download"
                  href={viewerUrl}
                  download={viewerDoc.originalName}
                  className="btn btn-outline btn-sm"
                >
                  ⬇️ Baixar
                </a>
                <button id="btn-fechar-viewer" className="btn btn-ghost btn-sm" onClick={closeViewer}>✕ Fechar</button>
              </div>
            </div>
            <div className="modal-body" style={{ padding: 0, overflow: "hidden", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
              {viewerDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={viewerUrl}
                  style={{ width: "100%", height: "75vh", border: "none" }}
                  title={viewerDoc.originalName}
                  id="pdf-viewer-iframe"
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--gray-950)", minHeight: "50vh" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewerUrl}
                    alt={viewerDoc.originalName}
                    id="img-viewer"
                    style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius)" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CONFIRMA DELETE ===== */}
      {deleteId && (
        <div className="modal-overlay" id="modal-delete">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>🗑️ Excluir documento</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--gray-300)" }}>
                Tem certeza que deseja excluir este documento? Esta ação <strong>não pode ser desfeita</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button id="btn-cancelar-delete" className="btn btn-outline" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button id="btn-confirmar-delete" className="btn btn-danger" onClick={() => handleDelete(deleteId)}>🗑️ Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
