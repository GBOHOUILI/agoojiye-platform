export const SYSTEM_ROLES = ["DIRECTOR", "PROJECT_MANAGER", "TEAM_LEAD", "TECHNICIAN", "ENGINEER", "QUALITY_MANAGER", "HR", "FINANCE", "PURCHASING", "ADMIN"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export interface Department { id: string; code: string; name: string; headId?: string }
export interface Team { id: string; name: string; departmentId: string; leadId?: string }
export interface User {
  id: string; firstName: string; lastName: string; email: string;
  systemRole: SystemRole; jobTitle: string; departmentId: string; teamId?: string; managerId?: string; active: boolean;
}
