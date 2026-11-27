"use client";
import { Avatar } from "@/components/shared/Avatar";
import { RoleBadge } from "@/components/shared/StatusBadge";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { BLOCKS, SPACE_BLOCKS, SPACE_INTRO } from "./space-config";

export default function SpaceView() {
  const { currentUser: me, teams, departments } = useDemoStore();
  const where = [teams.find(t => t.id === me.teamId)?.name, departments.find(d => d.id === me.departmentId)?.name].filter(Boolean).join(", ");
  return (<>
    <header className="mb-6 flex flex-wrap items-center gap-4">
      <Avatar user={me} size="lg" />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold sm:text-2xl">{displayName(me)}</h1><RoleBadge role={me.systemRole} /></div>
        <p className="text-sm text-slate-600">{me.jobTitle}{where ? `, ${where}` : ""}</p>
        <p className="mt-1 text-sm text-slate-500">{SPACE_INTRO[me.systemRole]}</p></div></header>
    <div className="grid gap-4 lg:grid-cols-2">{SPACE_BLOCKS[me.systemRole].map(id => { const B = BLOCKS[id]; return <B key={id} />; })}</div></>);
}
