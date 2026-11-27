import OrderDetailView from "@/components/purchasing/OrderDetailView";
export default function Page({ params }: { params: { id: string } }) { return <OrderDetailView id={params.id} />; }
