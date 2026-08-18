import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { verifyClientLink } from "@/lib/link-token";

export interface AuthorizedAccess {
  user: { id: string; role: string; name?: string | null } | null;
  viaLink: boolean;
}

// Autoriza acesso à tela de anexos: sessão de usuário OU token de link externo
// vinculado ao clientId informado.
export async function authorizeClientAccess(
  req: NextRequest,
  clientId?: string
): Promise<AuthorizedAccess | null> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return { user: session.user, viaLink: false };
  }

  if (clientId) {
    const linkToken = new URL(req.url).searchParams.get("linkToken");
    if (linkToken) {
      const payload = verifyClientLink(linkToken);
      if (payload && payload.clientId === clientId) {
        return { user: null, viaLink: true };
      }
    }
  }

  return null;
}
