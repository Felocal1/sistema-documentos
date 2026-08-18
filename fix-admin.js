const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "admin@sistema.com" },
    select: { email: true, password: true },
  });

  if (!user) {
    console.log("Usuário não encontrado");
    return;
  }

  console.log("Hash armazenado:", user.password);
  const match = await bcrypt.compare("Admin@123", user.password);
  console.log("Senha confere:", match);

  if (!match) {
    console.log("Recriando usuário com hash correto...");
    const newHash = await bcrypt.hash("Admin@123", 12);
    console.log("Novo hash:", newHash);
    await prisma.user.update({
      where: { email: "admin@sistema.com" },
      data: { password: newHash },
    });
    console.log("✅ Usuário recriado com sucesso!");
  }
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
