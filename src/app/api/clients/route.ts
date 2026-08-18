import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
