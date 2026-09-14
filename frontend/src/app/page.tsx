"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

import { ChiliMascot } from "@/components/ChiliMascot";
import { ClaimRewardButton } from "@/components/ClaimRewardButton";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { GreencardNFT } from "@/components/GreencardNFT";
import { ShareButtons } from "@/components/ShareButtons";
import { StreakBadge } from "@/components/StreakBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchCourses } from "@/lib/learningApi";
import { fetchGreencardStatus, requestGreencardVoucher, GreencardStatus } from "@/lib/rewardApi";
import { CourseSummary } from "@/lib/types";

function CourseCard({ course }: { course: CourseSummary }) {
  const base =
    "hover-card relative flex flex-col justify-between rounded-2xl p-5 min-h-[150px]";

  const inner = (
    <>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
            Course {course.order}
          </span>
          {course.passed && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
              Passed
            </span>
          )}
          {course.locked && (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{course.title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{course.description}</p>
      </div>
      <p className="mt-4 text-xs font-medium text-muted">
        {course.question_count} questions ·{" "}
        {course.locked ? "Locked" : course.passed ? "Replay" : "Start"} →
      </p>
    </>
  );

  if (course.locked) {
    return <div className={`${base} cursor-not-allowed opacity-50`}>{inner}</div>;
  }

  return (
    <Link href={`/journey/${course.slug}`} className={base}>
      {inner}
    </Link>
  );
}

export default function Home() {
  const { address } = useAccount();
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [greencard, setGreencard] = useState<GreencardStatus | null>(null);

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
  }, []);

  useEffect(() => {
    if (!sessionKey) return;

    fetchCourses(sessionKey)
      .then(setCourses)
      .catch(() => setCourses([]));

    fetchGreencardStatus(sessionKey)
      .then(setGreencard)
      .catch(() => {});
  }, [sessionKey]);

  const shareText = "I just unlocked my Chiliz Greencard on Chiliz Academy! 🌶️";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChiliMascot className="h-8 w-8" />
            <span className="text-xs font-semibold tracking-[0.2em]">CHILIZ ACADEMY</span>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge />
            <ThemeToggle />
            <ConnectWalletButton sessionKey={sessionKey} />
          </div>
        </header>

        <section className="py-14">
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">
            Learn crypto.
            <br />
            Earn your <span className="text-chiliz-red">Greencard</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            7 bite-sized courses on Chiliz, Fan Tokens, and Web3. Pass every
            course with a 100% score to unlock your onchain Chiliz Greencard.
          </p>
        </section>

        <section className="pb-14">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <GreencardNFT
              walletAddress={address ?? null}
              coursesPassed={greencard?.courses_passed ?? 0}
              totalCourses={greencard?.total_courses ?? 7}
              unlocked={!!greencard?.voucher}
            />

            <div className="flex flex-col gap-4">
              {greencard?.eligible && !greencard.voucher && sessionKey && (
                <ClaimRewardButton
                  label="your Chiliz Greencard"
                  requestVoucher={() => requestGreencardVoucher(sessionKey)}
                />
              )}
              {greencard?.voucher && <ShareButtons text={shareText} />}
              {!greencard?.eligible && (
                <p className="max-w-xs text-sm text-muted">
                  {greencard
                    ? `${greencard.courses_passed}/${greencard.total_courses} courses passed - keep going to unlock your Greencard.`
                    : "Connect a wallet and start course 1 to begin."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Core curriculum
          </h2>

          {courses === null && <p className="text-sm text-muted">Loading courses...</p>}
          {courses && courses.length === 0 && (
            <p className="text-sm text-muted">No courses published yet. Check back soon.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {courses?.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
