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

  useEffect(() => {
    fetchClient();
    fetchDocuments();
  }, [fetchClient, fetchDocuments]);

  // Auto-abrir viewer quando vier docId na URL (link externo do HTML)
  useEffect(() => {
    const docIdParam = searchParams.get("docId");
    if (docIdParam && documents.length > 0) {
      const doc = documents.find(d => d.id === docIdParam);
      if (doc) openViewer(doc);
    }
  }, [searchParams, documents]);

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
    }
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
      let externalUrl = "";
      const linkRes = await fetch("/api/client-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        externalUrl = linkData.link?.url || "";
      }

      const docRows = documents.map((doc, i) => {
        const docUrl = externalUrl
          ? `${externalUrl}${externalUrl.includes("?") ? "&" : "?"}docId=${doc.id}`
          : "#";
        const dateStr = new Date(doc.createdAt).toLocaleDateString("pt-BR");
        const sizeStr = formatBytes(doc.size);
        const typeLabel = doc.mimeType === "application/pdf" ? "PDF" : "Imagem";
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#374151;">${i + 1}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:500;">
              <a href="${docUrl}" target="_blank" style="color:#2563eb;text-decoration:none;">${doc.originalName}</a>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${dateStr}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${sizeStr}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">
              <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:.72rem;font-weight:600;${doc.mimeType === "application/pdf" ? "background:#fef2f2;color:#dc2626;" : "background:#eff6ff;color:#2563eb;"}">${typeLabel}</span>
            </td>
          </tr>`;
      }).join("");

      const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${client.name} — Documentos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; color: #111827; padding: 32px; }
    .container { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; padding: 28px 32px; }
    .header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: .875rem; opacity: .85; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; padding: 24px 32px; border-bottom: 1px solid #e5e7eb; }
    .info-item { font-size: .85rem; }
    .info-label { color: #6b7280; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
    .info-value { color: #111827; font-weight: 500; }
    .docs-title { padding: 20px 32px 12px; font-size: 1rem; font-weight: 600; color: #374151; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 14px; text-align: left; font-size: .72rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #e5e7eb; background: #f9fafb; }
    .footer { padding: 16px 32px; text-align: center; font-size: .72rem; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    @media print { body { padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${client.name}</h1>
      <p>Documentos anexados</p>
    </div>
    <div class="info">
      <div class="info-item">
        <div class="info-label">CNPJ</div>
        <div class="info-value">${client.cnpj}</div>
      </div>
      ${client.email ? `<div class="info-item"><div class="info-label">E-mail</div><div class="info-value">${client.email}</div></div>` : ""}
      ${client.phone ? `<div class="info-item"><div class="info-label">Telefone</div><div class="info-value">${client.phone}</div></div>` : ""}
      <div class="info-item">
        <div class="info-label">Total de documentos</div>
        <div class="info-value">${documents.length}</div>
      </div>
    </div>
    ${documents.length > 0 ? `
    <div class="docs-title">Documentos</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Arquivo</th>
          <th>Data</th>
          <th>Tamanho</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>${docRows}</tbody>
    </table>` : `<div style="padding:32px;text-align:center;color:#9ca3af;">Nenhum documento anexado.</div>`}
    <div class="footer">
      Gerado automaticamente por DocManager em ${now}
      ${externalUrl ? ` · <a href="${externalUrl}" target="_blank" style="color:#2563eb;">Acessar documentos online</a>` : ""}
    </div>
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
            <h2 style={{ margin: 0 }}>📂 Histórico de documentos</h2>
            <span style={{ fontSize: ".8rem", color: "var(--gray-500)" }}>
              {documents.length} arquivo{documents.length !== 1 ? "s" : ""}
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
                <div key={doc.id} className="doc-card" id={`doc-${doc.id}`} onClick={() => openViewer(doc)}>
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
