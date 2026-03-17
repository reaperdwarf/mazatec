import { z } from 'zod';

export const PlantStatusSchema = z.enum(['Rooting', 'Hardening', 'Vegetative', 'Mother', 'Dormant']);

export const DiagnosticLogSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  photoUri: z.string(),
  symptomMatch: z.string().optional(),
  notes: z.string()
});

export const PlantSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().min(1),
  status: PlantStatusSchema,
  dateAcquired: z.date(),
  lastWatered: z.date().optional(),
  lastMisted: z.date().optional(),
  lastFertilized: z.date().optional(),
  rootingStartedAt: z.date().optional(),
  wateringIntervalDays: z.number().optional(),
  imageUrl: z.string().optional(),
  logs: z.array(DiagnosticLogSchema)
});

export type Plant = z.infer<typeof PlantSchema>;
export type PlantStatus = z.infer<typeof PlantStatusSchema>;
