import TasksView from "@/components/tasks/TasksView";
export default function Page({ searchParams }: { searchParams: { scope?: string; project?: string; late?: string; new?: string } }) {
  return <TasksView initialScope={searchParams.scope} initialProject={searchParams.project ?? ""} initialLate={searchParams.late === "1"} openNew={searchParams.new === "1"} />;
}
