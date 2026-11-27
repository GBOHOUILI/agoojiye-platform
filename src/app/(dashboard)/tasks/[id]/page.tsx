import TaskDetailView from "@/components/tasks/TaskDetailView";
export default function Page({ params }: { params: { id: string } }) { return <TaskDetailView id={params.id} />; }
