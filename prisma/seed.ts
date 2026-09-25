/**
 * Development seed only.
 * Credentials below are for local/dev environments — never use them in production.
 */
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Dev-only password for all seeded users. */
const DEV_PASSWORD = 'Password123!';

async function main() {
  console.log('Seeding Resource Manager (development)...');

  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.direction.deleteMany();
  await prisma.company.deleteMany();
  await prisma.group.deleteMany();

  const passwordHash = await argon2.hash(DEV_PASSWORD);

  const group = await prisma.group.create({
    data: { name: 'Groupe Appatam' },
  });

  const companyWithDirections = await prisma.company.create({
    data: {
      groupId: group.id,
      name: 'Appatam',
      code: 'APP',
      description: 'Entreprise avec directions',
    },
  });

  const companyWithoutDirections = await prisma.company.create({
    data: {
      groupId: group.id,
      name: 'Entreprise B',
      code: 'ENTB',
      description: 'Entreprise sans niveau Direction',
    },
  });

  const directionTechnique = await prisma.direction.create({
    data: {
      companyId: companyWithDirections.id,
      name: 'Direction Technique',
      code: 'TECH',
    },
  });

  const users = [
    {
      email: 'group.admin@appatam.dev',
      firstName: 'Grace',
      lastName: 'GroupAdmin',
      role: Role.GROUP_ADMIN,
      companyId: companyWithDirections.id,
      directionId: null as string | null,
    },
    {
      email: 'company.admin@appatam.dev',
      firstName: 'Camille',
      lastName: 'CompanyAdmin',
      role: Role.COMPANY_ADMIN,
      companyId: companyWithDirections.id,
      directionId: null,
    },
    {
      email: 'manager.direction@appatam.dev',
      firstName: 'Morgan',
      lastName: 'ManagerDir',
      role: Role.MANAGER,
      companyId: companyWithDirections.id,
      directionId: directionTechnique.id,
    },
    {
      email: 'manager.company@entrepriseb.dev',
      firstName: 'Alex',
      lastName: 'ManagerNoDir',
      role: Role.MANAGER,
      companyId: companyWithoutDirections.id,
      directionId: null,
    },
    {
      email: 'employee@appatam.dev',
      firstName: 'Eden',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
      companyId: companyWithDirections.id,
      directionId: directionTechnique.id,
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });
  }

  console.log('Seed completed.');
  console.log('Dev password for all users:', DEV_PASSWORD);
  console.log(
    'Users:',
    users.map((u) => `${u.role} <${u.email}>`).join(', '),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
