import { z } from "zod";
import { PRIORITIES } from "@/types";
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
export const projectSchema = z.object({
  name: z.string().trim().min(3, "Le nom doit contenir au moins 3 caractères."),
  description: z.string().trim().default(""),
  priority: z.enum(PRIORITIES),
  startDate: isoDate, dueDate: isoDate,
  ownerId: z.string().min(1, "Choisissez un chef de projet."),
  departmentId: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
}).refine(p => p.dueDate >= p.startDate, { message: "L’échéance doit suivre la date de début.", path: ["dueDate"] });
export type ProjectInput = z.input<typeof projectSchema>;
