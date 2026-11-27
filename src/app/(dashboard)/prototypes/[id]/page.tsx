import { notFound } from "next/navigation";
import PrototypeDetailView from "@/components/prototypes/PrototypeDetailView";
import { prototypeExists } from "@/services/prototypes.service";
export default function Page({ params }: { params: { id: string } }) {
  if (!prototypeExists(params.id)) notFound();
  return <PrototypeDetailView id={params.id} />;
}
