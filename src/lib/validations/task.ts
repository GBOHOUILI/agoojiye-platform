import { z } from "zod";
import { PRIORITIES } from "@/types";
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
export const taskSchema = z.object({
  projectId: z.string().min(1, "Choisissez un projet."),
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  description: z.string().trim().default(""),
  priority: z.enum(PRIORITIES),
  dueDate: isoDate,
  assigneeId: z.string().optional(),
  validatorId: z.string().optional(),
  anomalyId: z.string().optional(),
});
export type TaskInput = z.input<typeof taskSchema>;
export const rejectionSchema = z.string().trim().min(5, "Un commentaire de rejet est requis (5 caractères minimum).");
