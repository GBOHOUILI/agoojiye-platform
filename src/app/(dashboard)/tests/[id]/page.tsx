import { notFound } from "next/navigation";
import TestDetailView from "@/components/tests/TestDetailView";
import { testExists } from "@/services/tests.service";
export default function Page({ params }: { params: { id: string } }) {
  if (!testExists(params.id)) notFound();
  return <TestDetailView id={params.id} />;
}
