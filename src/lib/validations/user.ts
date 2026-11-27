import { z } from "zod";
import { SYSTEM_ROLES } from "@/types";
export const userUpdateSchema = z.object({
  systemRole: z.enum(SYSTEM_ROLES).optional(),
  jobTitle: z.string().trim().min(2, "La fonction doit contenir au moins 2 caractères.").optional(),
  teamId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
});
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
