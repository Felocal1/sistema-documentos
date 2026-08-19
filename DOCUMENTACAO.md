# DocManager — Sistema de Gestão de Documentos

Documentação técnica completa do projeto.

---

## 1. Visão Geral

**DocManager** é um sistema web para gestão e armazenamento seguro de documentos organizados por CNPJ (essoa jurídica). O sistema permite cadastrar clientes, anexar documentos (PDF, imagens), visualizar, baixar, e gerar links externos de acesso sem login.

| Item | Detalhe |
|---|---|
| **Nome** | sistema-documentos (DocManager) |
| **Versão** | 0.1.0 |
| **Idioma** | pt-BR (Português Brasileiro) |
| **Repositório** | https://github.com/Felocal1/sistema-documentos |
| **Produção** | https://sistema-documentos-orcin.vercel.app |

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.3.0 |
| UI Library | React | 19.2.8 |
| Linguagem | TypeScript | ^5 (strict mode) |
| ORM | Prisma | ^5.22.0 |
| Banco de Dados | PostgreSQL (Neon) | Serverless |
| Autenticação | NextAuth.js | ^4.24.15 |
| Armazenamento | Vercel Blob | ^2.8.0 |
| Hash de Senha | bcryptjs | ^3.0.3 |
| Hospedagem | Vercel | Hobby (gratuito) |

---

## 3. Estrutura do Projeto

```
sistema-documentos/
├── prisma/
│   ├── schema.prisma              # Schema do banco de dados
│   └── migrations/                # Migrations do Prisma
├── src/
│   ├── proxy.ts                   # Middleware de autenticação
│   ├── components/
│   │   └── Sidebar.tsx            # Componente de navegação lateral
│   ├── lib/
│   │   ├── api-auth.ts            # Helper de autenticação dual (sessão + link)
│   │   ├── link-token.ts          # Tokens HMAC-SHA256 para links externos
│   │   ├── prisma.ts              # Cliente Prisma (singleton)
│   │   ├── storage.ts             # Operações Vercel Blob (upload/download/delete)
│   │   └── validation.ts          # Validação de CNPJ, senha, arquivos
│   └── app/
│       ├── layout.tsx             # Layout raiz
│       ├── providers.tsx          # SessionProvider (NextAuth)
│       ├── page.tsx               # Página inicial (redireciona para /dashboard)
│       ├── globals.css            # Estilos globais (dark theme)
│       ├── login/page.tsx         # Tela de login
│       ├── register/page.tsx      # Cadastro de usuários
│       ├── dashboard/
│       │   ├── layout.tsx         # Layout com Sidebar
│       │   └── page.tsx           # Dashboard (busca por CNPJ)
│       ├── clients/
│       │   ├── layout.tsx         # Layout com Sidebar
│       │   ├── page.tsx           # Lista de clientes
│       │   └── [id]/page.tsx      # Detalhe do cliente (documentos)
│       ├── documents/
│       │   ├── layout.tsx         # Layout com Sidebar
│       │   └── page.tsx           # Todos os documentos
│       ├── admin/
│       │   ├── layout.tsx         # Layout com Sidebar
│       │   └── clients/page.tsx   # Cadastro de cliente (admin)
│       └── api/
│           ├── auth/[...nextauth]/route.ts   # NextAuth handler
│           ├── users/register/route.ts       # Registro de usuário
│           ├── cnpj/route.ts                 # Busca/Cadastro por CNPJ
│           ├── clients/route.ts              # Listar clientes
│           ├── clients/[id]/route.ts         # Cliente por ID
│           ├── client-link/route.ts          # Gerar link externo
│           ├── documents/route.ts            # Upload/Listar documentos
│           ├── documents/all/route.ts        # Todos os documentos (admin)
│           └── documents/[id]/route.ts       # Download/Deletar documento
├── .env                           # Variáveis de ambiente (local)
├── .env.example                   # Template de variáveis de ambiente
├── .gitignore
├── .vercelignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Modelo de Dados (Prisma)

### Tabela `users`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | String (cuid) | PK | Identificador único |
| `name` | String | Sim | Nome do usuário |
| `email` | String | Sim, unique | E-mail (login) |
| `password` | String | Sim | Senha bcrypt |
| `role` | String | Sim | `ADMIN` ou `OPERATOR` (padrão: `OPERATOR`) |
| `active` | Boolean | Sim | Ativo/inativo (padrão: `true`) |
| `createdAt` | DateTime | Auto | Data de criação |
| `updatedAt` | DateTime | Auto | Última atualização |

### Tabela `clients`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | String (cuid) | PK | Identificador único |
| `cnpj` | String | Sim, unique | CNPJ formatado (00.000.000/0000-00) |
| `name` | String | Sim | Razão social |
| `email` | String | Não | E-mail de contato |
| `phone` | String | Não | Telefone de contato |
| `active` | Boolean | Sim | Ativo/inativo (padrão: `true`) |
| `createdAt` | DateTime | Auto | Data de criação |
| `updatedAt` | DateTime | Auto | Última atualização |

### Tabela `documents`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | String (cuid) | PK | Identificador único |
| `originalName` | String | Sim | Nome original do arquivo |
| `filename` | String | Sim | Nome no storage (`{clientId}/{uuid}.{ext}`) |
| `mimeType` | String | Sim | Tipo MIME (application/pdf, etc.) |
| `size` | Int | Sim | Tamanho em bytes |
| `path` | String | Sim | URL do Vercel Blob |
| `description` | String | Não | Descrição do documento |
| `clientId` | String | Sim, FK | Referência ao cliente |
| `uploadedById` | String | Sim, FK | Referência ao usuário que fez upload |
| `createdAt` | DateTime | Auto | Data de criação |
| `updatedAt` | DateTime | Auto | Última atualização |

### Relacionamentos

```
User  1 ──── N  Document  N ──── 1  Client
```

---

## 5. Rotas da Aplicação

### Páginas

| Rota | Arquivo | Descrição | Acesso |
|---|---|---|---|
| `/` | `page.tsx` | Redireciona para `/dashboard` | Público |
| `/login` | `login/page.tsx` | Tela de login | Público |
| `/register` | `register/page.tsx` | Cadastro de usuário | Público |
| `/dashboard` | `dashboard/page.tsx` | Dashboard com busca CNPJ | Autenticado |
| `/clients` | `clients/page.tsx` | Lista de clientes | Autenticado |
| `/clients/[id]` | `clients/[id]/page.tsx` | Detalhe do cliente + documentos | Autenticado ou Link |
| `/documents` | `documents/page.tsx` | Todos os documentos | Autenticado |
| `/admin/clients` | `admin/clients/page.tsx` | Cadastro de cliente | ADMIN |

### API Routes

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Autenticação NextAuth | Público |
| POST | `/api/users/register` | Registrar usuário | Público (rate-limit) |
| GET | `/api/cnpj?q=00.000.000/0000-00` | Buscar cliente por CNPJ | Autenticado |
| POST | `/api/cnpj` | Cadastrar cliente | ADMIN |
| GET | `/api/clients` | Listar clientes ativos | Autenticado |
| GET | `/api/clients/[id]` | Buscar cliente por ID | Autenticado ou Link |
| POST | `/api/client-link` | Gerar link externo | ADMIN |
| GET | `/api/documents?clientId=` | Listar documentos do cliente | Autenticado ou Link |
| POST | `/api/documents` | Upload de documento | Autenticado |
| GET | `/api/documents/all` | Todos os documentos | Autenticado |
| GET | `/api/documents/[id]` | Download/visualizar documento | Autenticado ou Link |
| DELETE | `/api/documents/[id]` | Deletar documento | ADMIN |

---

## 6. Sistema de Autenticação

### NextAuth.js (JWT Strategy)

- **Provider:** Credentials (email + password)
- **Strategy:** JWT (sem database sessions)
- **Roles:** `ADMIN`, `OPERATOR` (campo `role` na tabela `users`)

### Fluxo de Login

1. Usuário envia `email` + `senha` via formulário
2. NextAuth busca o usuário no banco pelo e-mail
3. Compara a senha com bcrypt
4. Se válido, gera JWT com `{ id, name, email, role }`
5. Token salvo em cookie `next-auth.session-token`

### Autenticação Dual (API Routes)

A função `authorizeClientAccess()` em `src/lib/api-auth.ts` verifica:

1. **Sessão de usuário** — `getServerSession(authOptions)` retorna sessão válida
2. **Link externo** — Query param `linkToken` assinado com HMAC-SHA256

Se nenhum estiver presente, retorna `null` (não autorizado).

### Links Externos (Acesso sem Login)

- Tokens assinados com **HMAC-SHA256** usando `CLIENT_LINK_SECRET`
- Formato: `base64url(clientId.exp).base64url(signature)`
- Validade padrão: **7 dias** (configurável via `CLIENT_LINK_TTL_DAYS`)
- Acesso: apenas visualização (somente leitura) dos documentos do cliente

---

## 7. Armazenamento de Arquivos

### Vercel Blob

| Configuração | Valor |
|---|---|
| Store ID | `store_92xMDxxOh5LfR9ef` |
| Acesso | Privado (requer token) |
| Tamanho máximo por arquivo | 20 MB (configurável via `MAX_FILE_SIZE_MB`) |
| Tipos permitidos | PDF, JPG, JPEG, PNG, WebP, TIFF |

### Estrutura de Armazenamento

```
{clientId}/{uuid}.{ext}
```

Exemplo: `cmsz31sa40000rabhbwkn1jrb/318a2c93-c2d6-44dd-be01-4c42824e3a6d.pdf`

### Operações

| Função | Arquivo | Descrição |
|---|---|---|
| `saveFile()` | `storage.ts` | Upload para Vercel Blob (privado) |
| `deleteFile()` | `storage.ts` | Delete do Vercel Blob |
| `readFileAsBuffer()` | `storage.ts` | Leitura com autenticação (Bearer token) |
| `getFileUrl()` | `storage.ts` | Retorna URL do blob |

### Autenticação de Leitura

Para blobs privados, a leitura requer header `Authorization: Bearer {BLOB_READ_WRITE_TOKEN}`. A função `readFileAsBuffer()` adiciona automaticamente esse header quando detecta uma URL do Vercel Blob.

---

## 8. Validações

### CNPJ

- Algoritmo oficial de validação (dígitos verificadores)
- Formatação automática: `00.000.000/0000-00`
- Rejeita CNPJs com todos dígitos iguais

### Senha

| Regra | Mínimo |
|---|---|
| Caracteres | 8 |
| Letra maiúscula | 1 |
| Número | 1 |
| Caractere especial | 1 |

### Arquivo

| Validação | Regra |
|---|---|
| Extensão | `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.tif` |
| MIME Type | `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/tiff` |
| Tamanho | Máximo 20 MB (configurável) |

---

## 9. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL (pooler, SSL) |
| `DIRECT_URL` | Sim | URL de conexão direta (sem pooler) |
| `NEXTAUTH_SECRET` | Sim | Segredo para assinatura de JWT |
| `NEXTAUTH_URL` | Sim | URL base da aplicação |
| `CLIENT_LINK_SECRET` | Sim | Segredo para HMAC-SHA256 dos links externos |
| `CLIENT_LINK_TTL_DAYS` | Não | Validade dos links em dias (padrão: 7) |
| `BLOB_READ_WRITE_TOKEN` | Sim | Token Vercel Blob (leitura/escrita) |
| `MAX_FILE_SIZE_MB` | Não | Tamanho máximo de upload em MB (padrão: 20) |
| `PORT` | Não | Porta do servidor local (padrão: 3002) |

---

## 10. Capacidade e Limites

### Banco de Dados (Neon PostgreSQL)

| Recurso | Limite | Uso Atual |
|---|---|---|
| Armazenamento | 512 MB (gratuito) | ~7,8 MB |
| Tabelas | — | 3 (users, clients, documents) |
| Registros | — | 3 users, 1 client, 2 documents |

### Armazenamento de Arquivos (Vercel Blob)

| Recurso | Limite (Hobby) | Uso Atual |
|---|---|---|
| Armazenamento | 1 GB/mês | ~245 KB |
| Transferência | 10 GB/mês | — |
| Tamanho máximo/arquivo | 5 TB (sistema: 20 MB) | — |
| Operações de leitura | 1.200/min | — |
| Operações de upload | 900/min | — |

### Capacidade Estimada de Documentos

| Tamanho médio por doc | Capacidade |
|---|---|
| ~1 MB (PDF leve) | ~1.000 documentos |
| ~5 MB (PDF com imagens) | ~200 documentos |
| ~10 MB (PDF grande) | ~100 documentos |

### Vercel (Hobby)

| Recurso | Limite |
|---|---|
| Function Invocations | 1.000.000/mês |
| Function Duration | 10s (Hobby) / 60s (Pro) |
| Build | 100 GB-hours/mês |
| Bandwidth | 100 GB/mês |

---

## 11. Guia de Deploy (Passo a Passo)

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18+ instalado
- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com) (vinculada ao GitHub)
- Conta no [Neon](https://neon.tech) (banco PostgreSQL)

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/Felocal1/sistema-documentos.git
cd sistema-documentos
```

### Passo 2 — Instalar dependências

```bash
npm install
```

### Passo 3 — Configurar variáveis de ambiente

Copie o `.env.example` para `.env` e preencha os valores:

```bash
cp .env.example .env
```

Variáveis obrigatórias para funcionamento local:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="seu-segredo-aqui"
NEXTAUTH_URL="http://localhost:3002"
CLIENT_LINK_SECRET="seu-segredo-aqui"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
MAX_FILE_SIZE_MB=20
PORT=3002
```

### Passo 4 — Gerar Prisma Client

```bash
npx prisma generate
```

### Passo 5 — Rodar migrations

```bash
npx prisma migrate deploy
```

### Passo 6 — Criar usuário admin

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@sistema.com', password: hash, role: 'ADMIN' }
  });
  console.log('Admin criado!');
  await prisma.\$disconnect();
})();
"
```

### Passo 7 — Iniciar servidor local

```bash
npm run dev
```

Acesse: http://localhost:3002

### Passo 8 — Deploy no Vercel

#### Via CLI:

```bash
npx vercel --prod
```

#### Via Git (automático):

1. Faça push para o repositório GitHub
2. A Vercel detecta automaticamente e faz deploy

### Passo 9 — Configurar variáveis de ambiente no Vercel

No painel do Vercel → Settings → Environment Variables, adicione:

| Variável | Ambiente | Valor |
|---|---|---|
| `DATABASE_URL` | Production | URL do Neon (pooler) |
| `DIRECT_URL` | Production | URL do Neon (direta) |
| `NEXTAUTH_SECRET` | Production | Segredo forte |
| `NEXTAUTH_URL` | Production | https://sistema-documentos-orcin.vercel.app |
| `CLIENT_LINK_SECRET` | Production | Segredo forte |
| `CLIENT_LINK_TTL_DAYS` | Production | 7 |
| `BLOB_READ_WRITE_TOKEN` | Production | Token do Vercel Blob |
| `MAX_FILE_SIZE_MB` | Production | 20 |

### Passo 10 — Criar tabela de迁移 no Neon

Se o banco é novo, execute:

```bash
npx prisma migrate deploy
```

Ou crie o admin no Neon:

```bash
DATABASE_URL="postgresql://..." node -e "..."
```

---

## 12. Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Iniciar servidor de desenvolvimento (porta 3002) |
| `npm run build` | Build de produção (prisma generate + migrate + next build) |
| `npm run start` | Iniciar servidor de produção |
| `npm run lint` | Verificar código com ESLint |
| `npx prisma studio` | Abrir Prisma Studio (GUI do banco) |
| `npx prisma migrate dev` | Criar nova migration |
| `npx prisma migrate deploy` | Aplicar migrations pendentes |
| `npx prisma generate` | Gerar Prisma Client |
| `npx vercel --prod` | Deploy manual para produção |
| `npx vercel env ls` | Listar variáveis de ambiente no Vercel |
| `npx vercel logs <url>` | Ver logs de function no Vercel |
| `npx vercel inspect <url>` | Informações do deploy |

---

## 13. Fluxos Principais

### Upload de Documento

```
1. Usuário clica "Anexar documento"
2. Seleciona arquivo (drag & drop ou clique)
3. Adiciona descrição (opcional)
4. Clica "Salvar"
5. Frontend envia POST /api/documents (FormData)
6. API valida: sessão, tipo MIME, tamanho
7. Salva no Vercel Blob → retorna URL
8. Cria registro no banco (Document)
9. Retorna 201 com dados do documento
```

### Visualização de Documento

```
1. Usuário clica no card do documento
2. Frontend abre modal com iframe (PDF) ou img (imagem)
3. GET /api/documents/[id] → serve o arquivo
4. API busca URL do blob → fetch com token → retorna buffer
5. Retorna binário com Content-Type correto
```

### Geração de Link Externo

```
1. Admin clica "Gerar link"
2. POST /api/client-link → gera token HMAC-SHA256
3. Token = base64url(clientId.exp).base64url(signature)
4. URL = /clients/{id}?linkToken={token}
5. Link copiado para clipboard
6. Qualquer pessoa com o link vê os documentos (somente leitura)
```

### Geração de HTML

```
1. Usuário clica "Gerar HTML"
2. Frontend busca link externo via POST /api/client-link
3. Gera HTML self-contained com CSS inline
4. Inclui: dados do cliente, tabela de documentos, links
5. Browser baixa arquivo {Nome_Cliente}_documentos.html
```

---

## 14. Segurança

| Aspecto | Implementação |
|---|---|
| Senhas | bcrypt (hash + salt) |
| Sessões | JWT via NextAuth.js |
| Links externos | HMAC-SHA256 com `timingSafeEqual` |
| Upload | Validação MIME + extensão + tamanho |
| Armazenamento | Vercel Blob privado (requer token) |
| Rotas | Middleware proxy verifica sessão ou link token |
| Roles | ADMIN / OPERATOR (verificação por rota) |
| Rate limiting | No registro de usuário |
| Sanitização | Remove `<` e `>` de inputs |

---

## 15. Resolução de Problemas

| Erro | Causa | Solução |
|---|---|---|
| `Erro ao salvar documento` | `BLOB_READ_WRITE_TOKEN` ausente | Adicionar token no `.env` |
| `Cannot use public access` | Store é privada, código usa `access: "public"` | Usar `access: "private"` |
| `Blob credentials not found` | Token não configurado | Verificar `BLOB_READ_WRITE_TOKEN` |
| `E-mail ou senha incorretos` | NEXTAUTH_SECRET diferente entre build e runtime | Verificar variáveis no Vercel |
| `Unauthorized` | Sessão expirada ou link token inválido | Refazer login ou gerar novo link |
| Build falha no Prisma | Migration não aplicada | `npx prisma migrate deploy` |
