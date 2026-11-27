import OrganizationView from "@/components/organization/OrganizationView";
export default function Page({ searchParams }: { searchParams: { tab?: string; user?: string } }) {
  return <OrganizationView initialTab={searchParams.tab ?? (searchParams.user ? "people" : undefined)} userId={searchParams.user} />;
}
