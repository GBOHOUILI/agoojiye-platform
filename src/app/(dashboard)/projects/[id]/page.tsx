import ProjectDetailView from "@/components/projects/ProjectDetailView";
export default function Page({ params }: { params: { id: string } }) { return <ProjectDetailView id={params.id} />; }
