import RequestsView from "@/components/purchasing/RequestsView";
export default function Page({ searchParams }: { searchParams: { new?: string } }) { return <RequestsView openNew={searchParams.new === "1"} />; }
