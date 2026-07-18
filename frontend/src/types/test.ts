export type Difficulty = 'junior' | 'middle' | 'senior';
export type VerificationLevel = 'none' | 'junior' | 'middle' | 'senior';

/** Question as delivered to the client — never contains the answer key. */
export interface PublicQuestion {
  _id: string;
  text: string;
  options: string[];
  difficulty: Difficulty;
  category: string;
}

export interface StartTestResponse {
  sessionId: string;
  direction: string;
  technologies: string[];
  startTime: string;
  deadline: string;
  perQuestionSeconds: number;
  questions: PublicQuestion[];
}

export interface TechResult {
  technology: string;
  correct: number;
  total: number;
  passed: boolean;
}

export interface SubmitTestResponse {
  sessionId: string;
  status: 'submitted' | 'expired' | 'terminated';
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  awardedLevel: VerificationLevel;
  passedCount: number;
  technologies: TechResult[];
  tabSwitchCount: number;
  late: boolean;
}

export interface TabSwitchResponse {
  tabSwitchCount: number;
  maxTabSwitches: number;
  terminated: boolean;
  status: string;
}

/** The form shape: maps questionId -> selected option index (as string). */
export type AnswersForm = Record<string, string>;
