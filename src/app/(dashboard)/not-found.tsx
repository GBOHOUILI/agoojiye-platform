import Link from "next/link";
export default function NotFound() { return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl font-semibold">Page introuvable</h1><Link href="/dashboard" className="mt-3 inline-block text-gold-700">Retour au tableau de bord</Link></div>; }
