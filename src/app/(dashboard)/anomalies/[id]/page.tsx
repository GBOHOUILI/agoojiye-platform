import AnomalyDetailView from "@/components/anomalies/AnomalyDetailView";
export default function Page({ params }: { params: { id: string } }) { return <AnomalyDetailView id={params.id} />; }
