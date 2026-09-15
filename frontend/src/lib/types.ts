export type Choice = {
  id: number;
  text: string;
  order: number;
};

export type ExperiencePreview = {
  id: number;
  title: string;
  slug: string;
  order: number;
  hook: string;
  story: string;
  question: string;
  xp_reward: number;
  choices: Choice[];
};

export type CourseSummary = {
  id: number;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  order: number;
  question_count: number;
  passed: boolean;
  locked: boolean;
};

export type StartRunResult = {
  question_index: number;
  total_questions: number;
  run_complete: boolean;
  next_experience: ExperiencePreview | null;
};

export type AnswerResult = {
  correct: boolean;
  reveal: string;
  xp_awarded: number;
  total_xp: number;
  run_failed: boolean;
  run_complete: boolean;
  run_passed: boolean | null;
  score_percent: number;
  question_index?: number;
  total_questions?: number;
  next_experience: ExperiencePreview | null;
};
