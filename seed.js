const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Senha123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@empresa.com.br' },
    update: { password: hash, role: 'ADMIN' },
    create: {
      name: 'Administrador Demo',
      email: 'admin@empresa.com.br',
      password: hash,
      role: 'ADMIN',
    },
  });

  const client = await prisma.client.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: {
      cnpj: '12.345.678/0001-90',
      name: 'Empresa Exemplo LTDA',
      email: 'contato@exemplo.com.br',
      phone: '(11) 98765-4321',
    },
  });

  console.log('SEED OK. Client ID:', client.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
