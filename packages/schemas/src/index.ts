import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCompanySchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(32).optional(),
  description: z.string().max(500).optional(),
});

export const createDirectionSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(32).optional(),
  description: z.string().max(500).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['GROUP_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']),
  companyId: z.string().min(1),
  directionId: z.string().min(1).nullable().optional(),
});

export const createVehicleSchema = z.object({
  companyId: z.string().min(1),
  registrationNumber: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  seats: z.number().int().positive(),
  description: z.string().optional(),
});

export const createRoomSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  location: z.string().optional(),
  capacity: z.number().int().positive(),
  description: z.string().optional(),
});

export const createReservationSchema = z
  .object({
    resourceType: z.enum(['VEHICLE', 'ROOM']),
    vehicleId: z.string().optional(),
    roomId: z.string().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    destination: z.string().optional(),
    missionReason: z.string().optional(),
    passengerCount: z.number().int().positive().optional(),
    meetingSubject: z.string().optional(),
    participantCount: z.number().int().positive().optional(),
    comment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.resourceType === 'VEHICLE' && !data.vehicleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'vehicleId requis',
        path: ['vehicleId'],
      });
    }
    if (data.resourceType === 'ROOM' && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'roomId requis',
        path: ['roomId'],
      });
    }
  });

export const rejectReservationSchema = z.object({
  rejectionReason: z.string().min(3),
});
