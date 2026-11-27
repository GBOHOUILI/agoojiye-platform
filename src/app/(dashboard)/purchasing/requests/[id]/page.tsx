import RequestDetailView from "@/components/purchasing/RequestDetailView";
export default function Page({ params }: { params: { id: string } }) { return <RequestDetailView id={params.id} />; }
