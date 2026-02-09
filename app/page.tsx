"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex items-center justify-center h-screen bg-neutral-950 text-white">
      <button
        onClick={() => router.push("/sign-in")}
        className="border border-white text-white font-medium px-6 py-2 rounded-md hover:bg-neutral-800"
      >
        Sign In
      </button>
    </main>
  );
}
