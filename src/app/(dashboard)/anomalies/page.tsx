import AnomaliesView from "@/components/anomalies/AnomaliesView";
export default function Page({ searchParams }: { searchParams: { g?: string; open?: string; declare?: string } }) { return <AnomaliesView initialG={searchParams.g ?? ""} initialOpen={searchParams.open === "1"} initialDeclare={searchParams.declare === "1"} />; }
