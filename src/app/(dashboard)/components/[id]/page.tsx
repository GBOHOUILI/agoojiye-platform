import { notFound } from "next/navigation";
import ComponentDetailView from "@/components/components/ComponentDetailView";
import { getComponent } from "@/services/components.service";
export default function Page({ params }: { params: { id: string } }) {
  if (!getComponent(params.id)) notFound();
  return <ComponentDetailView id={params.id} />;
}
