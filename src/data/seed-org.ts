import type { Department, SystemRole, Team, User } from "@/types";
// Fictitious organization — no real AGOOJIYÉ staff data.
export const DEFAULT_USER_ID = "U-DIR";

export const DEPARTMENTS0: Department[] = [
  { id: "D-DIR", code: "DIR", name: "Direction", headId: "U-DIR" },
  { id: "D-ENG", code: "ING", name: "Ingénierie", headId: "U-KAR" },
  { id: "D-QUA", code: "QUA", name: "Qualité", headId: "U-QUA" },
  { id: "D-SUP", code: "SUP", name: "Support (RH, Finance, Achats)", headId: "U-RH" },
  { id: "D-SI", code: "SI", name: "Systèmes d’information", headId: "U-ADM" },
];

export const TEAMS0: Team[] = [
  { id: "T-ENE", name: "Équipe Énergie", departmentId: "D-ENG", leadId: "U-ABL" },
  { id: "T-PRO", name: "Équipe Propulsion", departmentId: "D-ENG", leadId: "U-MAT" },
  { id: "T-ESS", name: "Équipe Essais", departmentId: "D-ENG", leadId: "U-SEG" },
  { id: "T-ELE", name: "Équipe Électronique", departmentId: "D-ENG", leadId: "U-FIF" },
  { id: "T-QUA", name: "Équipe Qualité", departmentId: "D-QUA", leadId: "U-QUA" },
  { id: "T-SUP", name: "Équipe Support", departmentId: "D-SUP", leadId: "U-RH" },
];

type Row = [id: string, first: string, last: string, role: SystemRole, job: string, dept: string, team: string | null, manager: string | null];
const ROWS: Row[] = [
  ["U-DIR", "Hervé", "Agbodjan", "DIRECTOR", "Directeur général", "D-DIR", null, null],
  ["U-ADM", "Rachid", "Bello", "ADMIN", "Administrateur des systèmes", "D-SI", null, "U-DIR"],
  ["U-KAR", "Karim", "Adjovi", "PROJECT_MANAGER", "Chef de projet véhicule urbain", "D-ENG", null, "U-DIR"],
  ["U-NAD", "Nadia", "Sossou", "PROJECT_MANAGER", "Cheffe de projet utilitaire", "D-ENG", null, "U-DIR"],
  ["U-YAN", "Yann", "Hounkpè", "PROJECT_MANAGER", "Chef de projet mobilité expérimentale", "D-ENG", null, "U-DIR"],
  ["U-ABL", "Abla", "Mensah", "TEAM_LEAD", "Responsable équipe Énergie", "D-ENG", "T-ENE", "U-KAR"],
  ["U-SEG", "Ségla", "Ahouansou", "TEAM_LEAD", "Responsable équipe Essais", "D-ENG", "T-ESS", "U-NAD"],
  ["U-AWA", "Awa", "Dossou", "ENGINEER", "Ingénieure batterie", "D-ENG", "T-ENE", "U-ABL"],
  ["U-FIF", "Fifamè", "Zinsou", "ENGINEER", "Ingénieure électronique", "D-ENG", "T-ELE", "U-YAN"],
  ["U-MAT", "Mathieu", "Kpodo", "ENGINEER", "Ingénieur propulsion", "D-ENG", "T-PRO", "U-KAR"],
  ["U-INT", "Paul", "Assogba", "ENGINEER", "Ingénieur méthodes", "D-ENG", null, "U-YAN"],
  ["U-KOF", "Kofi", "Amoussou", "TECHNICIAN", "Technicien d’essais", "D-ENG", "T-ESS", "U-SEG"],
  ["U-ROM", "Romuald", "Gbaguidi", "TECHNICIAN", "Technicien batterie", "D-ENG", "T-ENE", "U-ABL"],
  ["U-ESP", "Espérance", "Houngbo", "TECHNICIAN", "Technicienne mécanique", "D-ENG", "T-PRO", "U-MAT"],
  ["U-QUA", "Clarisse", "Agossou", "QUALITY_MANAGER", "Responsable qualité", "D-QUA", "T-QUA", "U-DIR"],
  ["U-QU2", "Bertin", "Lokossou", "QUALITY_MANAGER", "Auditeur qualité", "D-QUA", "T-QUA", "U-QUA"],
  ["U-RH", "Mariam", "Saka", "HR", "Responsable ressources humaines", "D-SUP", "T-SUP", "U-DIR"],
  ["U-FIN", "Olivier", "Dansou", "FINANCE", "Contrôleur de gestion", "D-SUP", "T-SUP", "U-DIR"],
  ["U-ACH", "Josiane", "Akplogan", "PURCHASING", "Acheteuse industrielle", "D-SUP", "T-SUP", "U-DIR"],
  ["U-MAG", "Ulrich", "Tchibozo", "TECHNICIAN", "Magasinier", "D-SUP", "T-SUP", "U-ACH"],
];
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
export const USERS0: User[] = ROWS.map(([id, firstName, lastName, systemRole, jobTitle, departmentId, team, manager]) => ({
  id, firstName, lastName, systemRole, jobTitle, departmentId, active: true,
  email: `${slug(firstName)}.${slug(lastName)}@agoojiye.demo`,
  ...(team ? { teamId: team } : {}), ...(manager ? { managerId: manager } : {}),
}));
