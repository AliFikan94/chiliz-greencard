"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ClaimRewardButton } from "@/components/ClaimRewardButton";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { LEARNING_API } from "@/lib/learningApi";
import { requestExperienceVoucher, requestJourneyVoucher } from "@/lib/rewardApi";
import { AnswerResult, Experience, Journey } from "@/lib/types";

export default function JourneyPage(props: PageProps<"/journey/[slug]">) {
  const { slug } = use(props.params);

  const [experience, setExperience] = useState<Experience | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [completedExperiences, setCompletedExperiences] = useState(0);

  const [journeyComplete, setJourneyComplete] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  async function loadProgress(key: string) {
    try {
      const response = await fetch(
        `${LEARNING_API}/${slug}/progress/${key}/`,
        { cache: "no-store" }
      );

      if (!response.ok) return;

      const data = await response.json();

      setTotalXp(data.xp);
      setCompletedExperiences(data.completed_experiences);

      if (data.journey_complete) {
        setJourneyComplete(true);
        return;
      }

      if (data.next_experience) {
        setExperience(data.next_experience);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadJourney() {
    try {
      const response = await fetch(
        `${LEARNING_API}/${slug}/`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to load journey");
      }

      const data: Journey = await response.json();

      setJourney(data);

      if (data.experiences.length > 0) {
        setExperience(data.experiences[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(choiceId: number) {
    if (!experience || submitting || answer || !sessionKey) return;

    setSelectedChoice(choiceId);
    setSubmitting(true);

    try {
      const response = await fetch(
        `${LEARNING_API}/experience/${experience.id}/answer/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            choice_id: choiceId,
            session_key: sessionKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit answer");
      }

      const result: AnswerResult = await response.json();

      setAnswer(result);
      setTotalXp(result.total_xp);
      setCompletedExperiences(result.completed_experiences);
    } catch (error) {
      console.error(error);
      setSelectedChoice(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function nextExperience() {
    if (!experience || loadingNext) return;

    setLoadingNext(true);

    try {
      const response = await fetch(
        `${LEARNING_API}/experience/${experience.id}/next/`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Failed to load next experience");
      }

      const result = await response.json();

      if (result.complete) {
        setJourneyComplete(true);
        return;
      }

      setExperience(result.next);
      setSelectedChoice(null);
      setAnswer(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNext(false);
    }
  }

  useEffect(() => {
    let storedKey = localStorage.getItem("greencard_session");
    if (!storedKey) {
      storedKey = crypto.randomUUID();
      localStorage.setItem("greencard_session", storedKey);
    }
    const key: string = storedKey;
    // localStorage only exists client-side, so reading it (and thus knowing
    // the session key) can only happen after mount, not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionKey(key);

    async function initialize() {
      await loadJourney();
      await loadProgress(key);
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0]">
        <div className="text-sm text-neutral-500">
          Loading...
        </div>
      </main>
    );
  }

  if (journeyComplete) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] text-[#111]">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8 md:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="text-xs font-semibold tracking-[0.2em]">
              CHILIZ GREENCARD
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm">
                {totalXp} XP
              </div>
              <ConnectWalletButton sessionKey={sessionKey} />
            </div>
          </header>

          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Journey complete
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-7xl">
              You just scratched the surface.
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-neutral-600">
              You completed {completedExperiences} discoveries and earned{" "}
              <strong>{totalXp} XP</strong>.
            </p>

            {sessionKey && journey && (
              <div className="mt-10">
                <ClaimRewardButton
                  label="achievement badge"
                  requestVoucher={() => requestJourneyVoucher(sessionKey, journey.slug)}
                />
              </div>
            )}

            <Link
              href="/"
              className="mt-8 rounded-full border border-black px-7 py-4 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              Back to journeys
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!experience || !journey) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f0]">
        <div className="text-sm text-neutral-500">
          Unable to load experience.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xs font-semibold tracking-[0.2em]">
            CHILIZ GREENCARD
          </Link>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm">
              {totalXp} XP
            </div>
            <ConnectWalletButton sessionKey={sessionKey} />
          </div>
        </header>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-black transition-all duration-500"
            style={{
              width: `${Math.min(
                (((experience?.order ?? 1) - 1) / 5) * 100,
                100
              )}%`,
            }}
          />
        </div>

        <section className="flex flex-1 flex-col justify-center py-16">
          <div className="max-w-4xl">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              {journey.title} · 0{experience.order}
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
              {experience.hook}
            </h1>

            <p className="mt-8 max-w-2xl whitespace-pre-line text-lg leading-8 text-neutral-600">
              {experience.story}
            </p>
          </div>

          {!answer && (
            <div className="mt-14 max-w-3xl">
              <h2 className="mb-5 text-xl font-semibold tracking-tight">
                {experience.question}
              </h2>

              <div className="grid gap-3">
                {experience.choices.map((choice) => {
                  const selected = selectedChoice === choice.id;

                  return (
                    <button
                      key={choice.id}
                      disabled={submitting}
                      onClick={() => submitAnswer(choice.id)}
                      className={[
                        "group rounded-2xl border bg-white px-5 py-5 text-left transition-all duration-200",
                        "hover:-translate-y-0.5 hover:border-black hover:shadow-md",
                        selected
                          ? "border-black shadow-md"
                          : "border-neutral-200",
                        submitting
                          ? "cursor-wait opacity-70"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-base leading-6">
                          {choice.text}
                        </span>

                        <span className="text-neutral-300 transition group-hover:text-black">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {answer && (
            <div className="mt-14 max-w-3xl">
              <div
                className={[
                  "mb-8 rounded-3xl p-6 md:p-8",
                  answer.correct
                    ? "bg-black text-white"
                    : "bg-neutral-200 text-black",
                ].join(" ")}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    {answer.correct ? "Correct" : "Not quite"}
                  </span>

                  {answer.xp_awarded > 0 && (
                    <span className="text-sm font-semibold">
                      +{answer.xp_awarded} XP
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-line text-lg leading-8">
                  {answer.reveal}
                </p>
              </div>

              {answer.correct && sessionKey && (
                <div className="mb-8">
                  <ClaimRewardButton
                    label="LEARN reward"
                    requestVoucher={() => requestExperienceVoucher(sessionKey, experience.id)}
                  />
                </div>
              )}

              <button
                onClick={nextExperience}
                disabled={loadingNext}
                className="rounded-full bg-black px-7 py-4 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50"
              >
                {loadingNext ? "Loading..." : "Next discovery →"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
