"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateCNPJ, formatCNPJ } from "@/lib/validation";

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

  // Modal cadastro rápido
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ cnpj: "", name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchClients = () => {
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  );

  const handleCnpjChange = (v: string) => {
    setForm(f => ({ ...f, cnpj: formatCNPJ(v) }));
    if (formErrors.cnpj) setFormErrors(e => ({ ...e, cnpj: "" }));
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    const cleaned = form.cnpj.replace(/[^\d]/g, "");
    const errs: Record<string, string> = {};
    if (!validateCNPJ(cleaned)) errs.cnpj = "CNPJ inválido";
    if (!form.name.trim() || form.name.trim().length < 3) errs.name = "Razão Social deve ter ao menos 3 caracteres";
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setFormLoading(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: form.cnpj, name: form.name }),
    });
    const data = await res.json();
    setFormLoading(false);

    if (!res.ok) {
      setFormError(data.error || "Erro ao cadastrar");
    } else {
      setFormSuccess(`"${data.client.name}" cadastrado! Redirecionando...`);
      setForm({ cnpj: "", name: "" });
      fetchClients();
      setTimeout(() => router.push(`/clients/${data.client.id}`), 1200);
    }
  };

  const openModal = () => {
    setForm({ cnpj: "", name: "" });
    setFormErrors({});
    setFormError(""); setFormSuccess("");
    setShowModal(true);
  };

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Clientes</div>
          <div className="topbar-sub">Lista de todos os clientes cadastrados</div>
        </div>
      </header>

      <div className="page-container">
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
            <span>🔍</span>
            <input
              id="search-clients"
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            id="btn-novo-cliente-rapido"
            className="btn btn-primary"
            onClick={openModal}
            style={{ whiteSpace: "nowrap", height: 48 }}
          >
            + Novo Cliente
          </button>
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
            <p>{search ? "Ajuste a busca ou cadastre um novo cliente." : "Cadastre o primeiro cliente."}</p>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>🏢 Novo Cliente</h2>
              <button
                id="close-modal-cliente"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "var(--gray-400)", fontSize: "1.4rem", cursor: "pointer", padding: 4 }}
              >✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {formError}</div>}
              {formSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {formSuccess}</div>}

              <form onSubmit={handleQuickCreate} id="form-cliente-rapido" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="quick-cnpj">CNPJ *</label>
                  <input
                    id="quick-cnpj"
                    type="text"
                    className={`form-input ${formErrors.cnpj ? "error" : ""}`}
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={e => handleCnpjChange(e.target.value)}
                    maxLength={18}
                    autoFocus
                  />
                  {formErrors.cnpj && <span className="form-error">⚠ {formErrors.cnpj}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="quick-name">Razão Social *</label>
                  <input
                    id="quick-name"
                    type="text"
                    className={`form-input ${formErrors.name ? "error" : ""}`}
                    placeholder="Nome da empresa"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (formErrors.name) setFormErrors(er => ({ ...er, name: "" })); }}
                  />
                  {formErrors.name && <span className="form-error">⚠ {formErrors.name}</span>}
                </div>

                <button
                  id="btn-salvar-rapido"
                  type="submit"
                  className={`btn btn-primary btn-lg ${formLoading ? "btn-loading" : ""}`}
                  disabled={formLoading}
                  style={{ marginTop: 8 }}
                >
                  {!formLoading && "✅ Cadastrar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
