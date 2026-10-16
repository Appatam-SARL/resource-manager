-- CreateEnum
CREATE TYPE "EquipmentScope" AS ENUM ('ROOM', 'VEHICLE', 'BOTH');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_EQUIPMENT_UPDATED';

-- AlterTable
ALTER TABLE "MeetingRoom" ADD COLUMN     "fixedEquipment" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "scope" "EquipmentScope" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationEquipment" (
    "reservationId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationEquipment_pkey" PRIMARY KEY ("reservationId","equipmentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_name_key" ON "Equipment"("name");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "ReservationEquipment_equipmentId_idx" ON "ReservationEquipment"("equipmentId");

-- AddForeignKey
ALTER TABLE "ReservationEquipment" ADD CONSTRAINT "ReservationEquipment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEquipment" ADD CONSTRAINT "ReservationEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
