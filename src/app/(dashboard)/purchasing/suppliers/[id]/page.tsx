import SupplierDetailView from "@/components/purchasing/SupplierDetailView";
export default function Page({ params }: { params: { id: string } }) { return <SupplierDetailView id={params.id} />; }
