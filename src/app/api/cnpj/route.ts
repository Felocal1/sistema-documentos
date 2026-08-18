import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { validateCNPJ, formatCNPJ, sanitizeString } from "@/lib/validation";

// GET /api/cnpj?q=00.000.000/0000-00
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawCnpj = searchParams.get("q") || "";
  const cleaned = rawCnpj.replace(/[^\d]/g, "");

  if (!cleaned) return NextResponse.json({ error: "CNPJ não informado" }, { status: 400 });
  if (!validateCNPJ(cleaned)) return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { cnpj: formatCNPJ(cleaned) },
    select: {
      id: true,
      cnpj: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  return NextResponse.json({ client });
}

// POST /api/cnpj — Cadastra novo cliente
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem cadastrar clientes" }, { status: 403 });
  }

  try {
    const { cnpj, name, email, phone } = await req.json();
    const cleaned = cnpj?.replace(/[^\d]/g, "");

    if (!cleaned || !validateCNPJ(cleaned)) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome do cliente é obrigatório" }, { status: 400 });
    }

    const existing = await prisma.client.findUnique({ where: { cnpj: formatCNPJ(cleaned) } });
    if (existing) return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });

    const client = await prisma.client.create({
      data: {
        cnpj: formatCNPJ(cleaned),
        name: sanitizeString(name),
        email: email ? sanitizeString(email).toLowerCase() : null,
        phone: phone ? sanitizeString(phone) : null,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Client create error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
