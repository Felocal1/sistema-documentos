import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { validateCNPJ, formatCNPJ, sanitizeString } from "@/lib/validation";

// GET /api/clients — Lista todos os clientes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { active: true },
    select: { id: true, cnpj: true, name: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ clients });
}

// POST /api/clients — Cadastro rápido (razão social + CNPJ)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { cnpj, name } = await req.json();
    const cleaned = cnpj?.replace(/[^\d]/g, "");

    if (!cleaned || !validateCNPJ(cleaned)) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }
    if (!name?.trim() || name.trim().length < 3) {
      return NextResponse.json({ error: "Razão Social deve ter ao menos 3 caracteres" }, { status: 400 });
    }

    const formatted = formatCNPJ(cleaned);
    const existing = await prisma.client.findUnique({ where: { cnpj: formatted } });
    if (existing) return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });

    const client = await prisma.client.create({
      data: { cnpj: formatted, name: sanitizeString(name) },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Client create error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
