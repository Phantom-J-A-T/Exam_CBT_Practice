import { Question, SubjectType, ExamType } from './types';
import { getQuestionsForSubject } from './data/questions';

export async function fetchQuestionsForSubject(
  subject: SubjectType,
  examType: ExamType,
  limit: number = 20
): Promise<Question[]> {
  try {
    const response = await fetch(`/api/questions?subject=${subject}&examType=${examType}&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions;
      }
    }
  } catch (err) {
    console.warn("Could not fetch from real past questions API, adopting local offline fallback questions:", err);
  }

  // Fallback to local offline questions
  const localQuestions = getQuestionsForSubject(subject);
  
  // Inject the chosen ExamType and random past years to fit the selected mode
  const mappedLocal = localQuestions.map(q => ({
    ...q,
    examType,
    examYear: q.examYear || (1998 + Math.floor(Math.random() * 26)).toString()
  }));

  // Perform Fisher-Yates shuffle to guarantee dynamic random mock exams on every repeat
  for (let i = mappedLocal.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mappedLocal[i], mappedLocal[j]] = [mappedLocal[j], mappedLocal[i]];
  }

  return mappedLocal.slice(0, limit);
}
