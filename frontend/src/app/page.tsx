"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { LEARNING_API } from "@/lib/learningApi";
import { Journey } from "@/lib/types";

export default function Home() {
  const [journeys, setJourneys] = useState<Journey[] | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  useEffect(() => {
    let key = localStorage.getItem("greencard_session");
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem("greencard_session", key);
    }
    // localStorage only exists client-side, so reading it (and thus knowing
    // the session key) can only happen after mount, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionKey(key);

    async function loadJourneys() {
      try {
        const response = await fetch(`${LEARNING_API}/`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load journeys");
        setJourneys(await response.json());
      } catch (error) {
        console.error(error);
        setJourneys([]);
      }
    }

    loadJourneys();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="text-xs font-semibold tracking-[0.2em]">
            CHILIZ GREENCARD
          </div>
          <ConnectWalletButton sessionKey={sessionKey} />
        </header>

        <section className="py-16">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
            Learn crypto. Earn onchain.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
            Bite-sized journeys into crypto and the Chiliz ecosystem. Answer
            correctly, earn XP, and claim real onchain rewards on Chiliz
            Chain.
          </p>

          {journeys === null && (
            <p className="mt-14 text-sm text-neutral-500">Loading journeys...</p>
          )}

          {journeys && journeys.length === 0 && (
            <p className="mt-14 text-sm text-neutral-500">
              No journeys published yet. Check back soon.
            </p>
          )}

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {journeys?.map((journey) => (
              <Link
                key={journey.slug}
                href={`/journey/${journey.slug}`}
                className="group rounded-3xl border border-neutral-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-black hover:shadow-md"
              >
                <h2 className="text-xl font-semibold tracking-tight">
                  {journey.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {journey.description}
                </p>
                <p className="mt-4 text-sm font-medium">
                  {journey.experiences.length} discoveries{" "}
                  <span className="text-neutral-300 transition group-hover:text-black">
                    →
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
