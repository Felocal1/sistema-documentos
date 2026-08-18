import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createClientLink, buildClientLinkUrl } from "@/lib/link-token";

// POST /api/client-link — Gera link de acesso direto à tela de anexos (apenas ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem gerar links" }, { status: 403 });
  }

  try {
    const { clientId } = await req.json();
    if (!clientId) {
      return NextResponse.json({ error: "clientId é obrigatório" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, cnpj: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const { token, expiresAt } = createClientLink(client.id);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const origin = host ? `${protocol}://${host}` : undefined;

    const url = buildClientLinkUrl(client.id, token, origin);

    return NextResponse.json({ link: { url, expiresAt, clientId: client.id } }, { status: 201 });
  } catch (error) {
    console.error("Client link create error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
