const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@sistema.com";
  const password = "Admin@123";
  const name = "Administrador";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Usuário admin já existe:", email);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("✅ Usuário admin criado com sucesso:");
  console.log(user);
}

main()
  .catch((e) => {
    console.error("Erro ao criar admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
