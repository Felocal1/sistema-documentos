const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@sistema.com";
  const password = "Admin@123";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, password: true, role: true, active: true },
  });

  console.log("Usuário encontrado:", user ? "SIM" : "NÃO");
  if (user) {
    console.log("  - email:", user.email);
    console.log("  - active:", user.active);
    console.log("  - role:", user.role);
    console.log("  - hash:", user.password);
    
    const match = await bcrypt.compare(password, user.password);
    console.log("  - senha confere:", match);
    
    if (!match) {
      console.log("\nRecriando senha...");
      const newHash = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { email }, data: { password: newHash } });
      console.log("  - novo hash:", newHash);
      const match2 = await bcrypt.compare(password, newHash);
      console.log("  - nova senha confere:", match2);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
