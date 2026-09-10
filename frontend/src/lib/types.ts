export type Choice = {
  id: number;
  text: string;
  order: number;
};

export type Experience = {
  id: number;
  title: string;
  hook: string;
  story: string;
  question: string;
  reveal: string;
  xp_reward: number;
  choices: Choice[];
  order: number;
};

export type Journey = {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  experiences: Experience[];
};

export type AnswerResult = {
  correct: boolean;
  reveal: string;
  xp_awarded: number;
  total_xp: number;
  completed_experiences: number;
};
