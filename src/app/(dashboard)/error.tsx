"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) { return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl font-semibold">Une erreur est survenue</h1><button className="btn mt-4" onClick={reset}>Réessayer</button></div>; }
