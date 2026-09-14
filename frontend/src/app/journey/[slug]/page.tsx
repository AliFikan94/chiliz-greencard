"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ChiliMascot } from "@/components/ChiliMascot";
import { ClaimRewardButton } from "@/components/ClaimRewardButton";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { ShareButtons } from "@/components/ShareButtons";
import { startCourse, submitAnswer } from "@/lib/learningApi";
import { requestExperienceVoucher } from "@/lib/rewardApi";
import { AnswerResult, ExperiencePreview } from "@/lib/types";

export default function JourneyPage(props: PageProps<"/journey/[slug]">) {
  const { slug } = use(props.params);

  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState<ExperiencePreview | null>(null);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);

  function begin(key: string) {
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSelectedChoice(null);

    startCourse(slug, key)
      .then((result) => {
        setQuestion(result.next_experience);
        setQuestionIndex(result.question_index || 1);
        setTotalQuestions(result.total_questions || 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not start course."))
      .finally(() => setLoading(false));
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
    begin(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleAnswer(choiceId: number) {
    if (!question || submitting || answer || !sessionKey) return;

    setSelectedChoice(choiceId);
    setSubmitting(true);

    try {
      const result = await submitAnswer(question.id, choiceId, sessionKey);
      setAnswer(result);
      if (result.total_questions) setTotalQuestions(result.total_questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer.");
      setSelectedChoice(null);
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (!answer?.next_experience) return;
    setQuestion(answer.next_experience);
    setQuestionIndex((i) => i + 1);
    setAnswer(null);
    setSelectedChoice(null);
  }

  function restart() {
    if (sessionKey) begin(sessionKey);
  }

  const shareText = `I just completed ${slug.replace(/-/g, " ")} on Chiliz Academy and I'm on my way to a Chiliz Greencard! 🌶️`;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <ChiliMascot className="h-10 w-10 animate-pulse" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-sm text-zinc-400">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-chiliz-red underline">
            Back to courses
          </Link>
        </div>
      </main>
    );
  }

  const runComplete = answer?.run_complete;
  const runPassed = answer?.run_passed;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <ChiliMascot className="h-7 w-7" />
            <span className="text-xs font-semibold tracking-[0.2em] text-zinc-300">
              CHILIZ ACADEMY
            </span>
          </Link>
          <ConnectWalletButton sessionKey={sessionKey} />
        </header>

        {!runComplete && (
          <div className="mt-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Question {questionIndex} of {totalQuestions}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-chiliz-red transition-all duration-500 ease-out"
                style={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        )}

        {question && !runComplete && (
          <section className="flex flex-1 flex-col justify-center py-14">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              {question.title}
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-4xl">
              {question.hook}
            </h1>
            <p className="mt-6 max-w-xl whitespace-pre-line text-base leading-7 text-zinc-400">
              {question.story}
            </p>

            {!answer && (
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">
                  {question.question}
                </h2>
                <div className="grid gap-3">
                  {question.choices.map((choice) => {
                    const selected = selectedChoice === choice.id;
                    return (
                      <button
                        key={choice.id}
                        disabled={submitting}
                        onClick={() => handleAnswer(choice.id)}
                        className={[
                          "hover-card rounded-2xl px-5 py-4 text-left transition-all duration-150",
                          selected ? "scale-[0.98] border-chiliz-red" : "",
                          submitting ? "cursor-wait opacity-70" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-base leading-6 text-zinc-100">{choice.text}</span>
                          <span className="text-zinc-600">→</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {answer && !runComplete && (
              <div className="mt-10 animate-pop-in">
                <div className="mb-6 rounded-3xl border border-zinc-800 bg-card p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-chiliz-lime">
                      Correct
                    </span>
                    {answer.xp_awarded > 0 && (
                      <span className="text-sm font-semibold text-white">+{answer.xp_awarded} XP</span>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-base leading-7 text-zinc-300">{answer.reveal}</p>
                </div>

                {sessionKey && (
                  <div className="mb-6">
                    <ClaimRewardButton
                      label="LEARN reward"
                      requestVoucher={() => requestExperienceVoucher(sessionKey, question.id)}
                    />
                  </div>
                )}

                <button
                  onClick={nextQuestion}
                  className="rounded-full bg-chiliz-red px-7 py-4 text-sm font-semibold text-white transition hover:scale-[1.02] hover:brightness-110"
                >
                  Next question →
                </button>
              </div>
            )}
          </section>
        )}

        {runComplete && (
          <section className="flex flex-1 flex-col items-center justify-center py-14 text-center animate-pop-in">
            {runPassed ? (
              <>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-chiliz-lime">
                  100% - Course passed
                </p>
                <h1 className="max-w-lg text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
                  Nailed every question.
                </h1>
                <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">
                  The next course is now unlocked.
                </p>

                {answer && sessionKey && (
                  <div className="mt-8">
                    <ClaimRewardButton
                      label="LEARN reward"
                      requestVoucher={() => requestExperienceVoucher(sessionKey, question!.id)}
                    />
                  </div>
                )}

                <div className="mt-8">
                  <ShareButtons text={shareText} />
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-red-500">
                  Not quite 100%
                </p>
                <h1 className="max-w-lg text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-5xl">
                  One miss ends the run.
                </h1>
                <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">
                  Scored {answer?.score_percent}% ({(answer?.question_index ?? 1) - 1}/
                  {answer?.total_questions} correct). Every question needs to be right, first try,
                  to pass. Give it another go.
                </p>
              </>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={restart}
                className="rounded-full bg-chiliz-red px-7 py-4 text-sm font-semibold text-white transition hover:scale-[1.02] hover:brightness-110"
              >
                {runPassed ? "Replay course" : "Restart course"}
              </button>
              <Link
                href="/"
                className="rounded-full border border-zinc-700 px-7 py-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
              >
                Back to courses
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
