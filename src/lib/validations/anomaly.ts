import { z } from "zod";
export const anomalySchema = z.object({
  titre: z.string().trim().min(5, "Le titre doit contenir au moins 5 caractères."),
  proto: z.string().min(1), comp: z.string().min(1),
  g: z.enum(["Faible", "Moyenne", "Élevée", "Critique"]), resp: z.string().min(1), respTeamId: z.string().optional(), desc: z.string().trim().optional(),
});
export type AnomalyInput = z.infer<typeof anomalySchema>;
export const noteSchema = z.string().trim().min(3, "Observation trop courte (3 caractères minimum).");
export const justificationSchema = z.string().trim().min(5, "Justification de vérification requise (5 caractères minimum).");
