import TestsView from "@/components/tests/TestsView";
export default function Page({ searchParams }: { searchParams: { res?: string } }) { return <TestsView initialRes={searchParams.res ?? ""} />; }
