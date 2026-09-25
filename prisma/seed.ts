/**
 * Development seed only — never use these credentials in production.
 */
import {
  PrismaClient,
  Role,
  UserStatus,
  EntityStatus,
  ResourceStatus,
  ResourceType,
  ReservationStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const DEV_PASSWORD = 'Password123!';

async function main() {
  console.log('Seeding Resource Manager (development)...');

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.meetingRoom.deleteMany();
  await prisma.user.deleteMany();
  await prisma.direction.deleteMany();
  await prisma.company.deleteMany();
  await prisma.group.deleteMany();

  const passwordHash = await argon2.hash(DEV_PASSWORD);

  const group = await prisma.group.create({
    data: { name: 'Groupe Appatam' },
  });

  const companyA = await prisma.company.create({
    data: {
      groupId: group.id,
      name: 'Appatam',
      code: 'APP',
      description: 'Entreprise A — plusieurs directions',
      status: EntityStatus.ACTIVE,
    },
  });

  const companyB = await prisma.company.create({
    data: {
      groupId: group.id,
      name: 'Entreprise B',
      code: 'ENTB',
      description: 'Entreprise B — une direction',
      status: EntityStatus.ACTIVE,
    },
  });

  const companyC = await prisma.company.create({
    data: {
      groupId: group.id,
      name: 'Entreprise C',
      code: 'ENTC',
      description: 'Entreprise C — sans direction',
      status: EntityStatus.ACTIVE,
    },
  });

  const dirTech = await prisma.direction.create({
    data: {
      companyId: companyA.id,
      name: 'Direction Technique',
      code: 'TECH',
    },
  });
  const dirCom = await prisma.direction.create({
    data: {
      companyId: companyA.id,
      name: 'Direction Commerciale',
      code: 'COM',
    },
  });
  const dirB = await prisma.direction.create({
    data: {
      companyId: companyB.id,
      name: 'Direction Générale',
      code: 'DG',
    },
  });

  const usersData = [
    {
      email: 'group.admin@appatam.dev',
      firstName: 'Grace',
      lastName: 'GroupAdmin',
      role: Role.GROUP_ADMIN,
      companyId: companyA.id,
      directionId: null as string | null,
    },
    {
      email: 'company.admin@appatam.dev',
      firstName: 'Camille',
      lastName: 'CompanyAdmin',
      role: Role.COMPANY_ADMIN,
      companyId: companyA.id,
      directionId: null,
    },
    {
      email: 'manager.tech@appatam.dev',
      firstName: 'Morgan',
      lastName: 'ManagerTech',
      role: Role.MANAGER,
      companyId: companyA.id,
      directionId: dirTech.id,
    },
    {
      email: 'manager.company@entreprisec.dev',
      firstName: 'Alex',
      lastName: 'ManagerNoDir',
      role: Role.MANAGER,
      companyId: companyC.id,
      directionId: null,
    },
    {
      email: 'employee@appatam.dev',
      firstName: 'Eden',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
      companyId: companyA.id,
      directionId: dirTech.id,
    },
    {
      email: 'employee.b@entrepriseb.dev',
      firstName: 'Sam',
      lastName: 'EmployeeB',
      role: Role.EMPLOYEE,
      companyId: companyB.id,
      directionId: dirB.id,
    },
  ];

  const users = [];
  for (const u of usersData) {
    users.push(
      await prisma.user.create({
        data: { ...u, passwordHash, status: UserStatus.ACTIVE },
      }),
    );
  }

  const [groupAdmin, , , , employeeA] = users;

  const vehicleA1 = await prisma.vehicle.create({
    data: {
      companyId: companyA.id,
      registrationNumber: 'AA-123-BB',
      brand: 'Toyota',
      model: 'Corolla',
      seats: 5,
      status: ResourceStatus.AVAILABLE,
    },
  });
  await prisma.vehicle.create({
    data: {
      companyId: companyA.id,
      registrationNumber: 'AA-456-CC',
      brand: 'Renault',
      model: 'Trafic',
      seats: 9,
      status: ResourceStatus.MAINTENANCE,
    },
  });
  await prisma.vehicle.create({
    data: {
      companyId: companyC.id,
      registrationNumber: 'CC-789-DD',
      brand: 'Peugeot',
      model: '308',
      seats: 5,
      status: ResourceStatus.AVAILABLE,
    },
  });

  const roomA1 = await prisma.meetingRoom.create({
    data: {
      companyId: companyA.id,
      name: 'Salle Atlas',
      location: 'Bâtiment A — 2e étage',
      capacity: 12,
      status: ResourceStatus.AVAILABLE,
    },
  });
  await prisma.meetingRoom.create({
    data: {
      companyId: companyB.id,
      name: 'Salle Horizon',
      location: 'Siège B',
      capacity: 8,
      status: ResourceStatus.AVAILABLE,
    },
  });

  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  await prisma.reservation.create({
    data: {
      companyId: companyA.id,
      userId: employeeA.id,
      directionId: dirTech.id,
      resourceType: ResourceType.VEHICLE,
      vehicleId: vehicleA1.id,
      startAt: start,
      endAt: end,
      destination: 'Abidjan Plateau',
      missionReason: 'Réunion client',
      passengerCount: 2,
      status: ReservationStatus.PENDING,
    },
  });

  const start2 = new Date(start);
  start2.setDate(start2.getDate() + 1);
  const end2 = new Date(start2);
  end2.setHours(11, 0, 0, 0);

  await prisma.reservation.create({
    data: {
      companyId: companyA.id,
      userId: employeeA.id,
      directionId: dirTech.id,
      resourceType: ResourceType.ROOM,
      roomId: roomA1.id,
      startAt: start2,
      endAt: end2,
      meetingSubject: 'Stand-up technique',
      participantCount: 6,
      status: ReservationStatus.APPROVED,
    },
  });

  console.log('Seed completed.');
  console.log('Dev password:', DEV_PASSWORD);
  console.log(
    'Users:',
    usersData.map((u) => `${u.role} <${u.email}>`).join(', '),
  );
  void groupAdmin;
  void dirCom;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
