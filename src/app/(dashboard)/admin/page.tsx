import AdminView from "@/components/admin/AdminView";
export default function Page({ searchParams }: { searchParams: { tab?: string; user?: string } }) { return <AdminView initialTab={searchParams.tab} userId={searchParams.user} />; }
