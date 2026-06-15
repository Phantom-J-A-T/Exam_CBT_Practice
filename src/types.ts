export type SubjectType = 'maths' | 'english' | 'physics' | 'chemistry' | 'biology';
export type ExamType = 'waec' | 'neco' | 'gce' | 'jamb';

export interface Question {
  id: string;
  subject: SubjectType;
  topic: string;
  questionText: string;
  options: string[]; // 4 options (A, B, C, D)
  correctOptionIndex: number; // 0 for A, 1 for B, 2 for C, 3 for D
  explanation: string;
  examType?: ExamType;
  examYear?: string;
}

export interface ExamSession {
  id: string;
  subject: SubjectType;
  examType: ExamType;
  totalQuestions: number;
  answeredQuestions: Record<string, number>; // questionId -> selectedOptionIndex
  flaggedQuestions: string[]; // array of questionIds
  timeSpentSeconds: number;
  timeRemainingSeconds: number;
  score: number;
  percentage: number;
  timestamp: number;
  completed: boolean;
}

export interface UserStats {
  maths_scores: number[];
  english_scores: number[];
  physics_scores: number[];
  chemistry_scores: number[];
  biology_scores: number[];
  testsCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  studyStreakDays: number;
  lastActiveTimestamp: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  school: string;
  state: string;
  score: number; // Avg exam score out of 100
  testsTaken: number;
  isUser?: boolean;
}
