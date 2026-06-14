import { UserStats, SubjectType } from '../types';
import { Flame, Award, BookOpen, Clock, Activity, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  stats: UserStats;
  onResetStats: () => void;
  onSelectSubject: (subject: SubjectType) => void;
}

const SUBJECT_COLORS: Record<SubjectType, { primary: string; light: string; text: string }> = {
  maths: { primary: 'bg-indigo-600', light: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
  english: { primary: 'bg-teal-600', light: 'bg-teal-50 border-teal-200', text: 'text-teal-600' },
  physics: { primary: 'bg-amber-600', light: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
  chemistry: { primary: 'bg-blue-600', light: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
  biology: { primary: 'bg-pink-600', light: 'bg-pink-50 border-pink-200', text: 'text-pink-600' }
};

const SUBJECT_LABELS: Record<SubjectType, string> = {
  maths: 'Mathematics',
  english: 'English Language',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology'
};

export default function Dashboard({ stats, onResetStats, onSelectSubject }: DashboardProps) {
  // Compute overall statistics
  const totalCorrect = stats.totalCorrectAnswers;
  const totalAnswered = stats.totalQuestionsAnswered;
  const generalAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Compute average score for each subject
  const getAverage = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getAccuracyColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const subjects: SubjectType[] = ['maths', 'english', 'physics', 'chemistry', 'biology'];

  // Weakest and strongest subjects based on tests taken
  const subjectAverages = subjects.map(sub => ({
    key: sub,
    name: SUBJECT_LABELS[sub],
    avg: getAverage(stats[`${sub}_scores` as keyof UserStats] as number[]),
    tests: (stats[`${sub}_scores` as keyof UserStats] as number[]).length
  }));

  const attemptedSubjects = subjectAverages.filter(s => s.tests > 0);
  const weakestSubject = attemptedSubjects.length > 0 
    ? [...attemptedSubjects].sort((a, b) => a.avg - b.avg)[0]
    : null;

  const strongestSubject = attemptedSubjects.length > 0 
    ? [...attemptedSubjects].sort((a, b) => b.avg - a.avg)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Study Streak */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm transition-all hover:shadow-md flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <Flame className="animate-pulse" size={26} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Practice Streak</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.studyStreakDays} {stats.studyStreakDays === 1 ? 'Day' : 'Days'}</div>
            <div className="text-xs text-slate-500 mt-0.5">Keep learning offline daily</div>
          </div>
        </div>

        {/* Accuracy Rate */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm transition-all hover:shadow-md flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <Award size={26} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overall Accuracy</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{generalAccuracy}%</div>
            <div className="text-xs text-slate-500 mt-0.5">{totalCorrect} correct of {totalAnswered}</div>
          </div>
        </div>

        {/* Exams Taken */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm transition-all hover:shadow-md flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <BookOpen size={26} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Simulated Exams</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.testsCompleted}</div>
            <div className="text-xs text-slate-500 mt-0.5">Mock sessions logged</div>
          </div>
        </div>

        {/* Practice Velocity */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm transition-all hover:shadow-md flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock size={26} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Learning Status</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {stats.testsCompleted >= 5 ? 'Pro Practitioner' : 'Beginner'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">UTME Practice Plan active</div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-by-Subject Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-slate-500" />
              Syllabus Coverage & Average Scores
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">100% Offline Tracker</span>
          </div>

          <div className="space-y-6">
            {subjectAverages.map(({ key, name, avg, tests }) => {
              const colors = SUBJECT_COLORS[key as SubjectType];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <button 
                      onClick={() => onSelectSubject(key as SubjectType)}
                      className="font-medium text-slate-700 hover:text-slate-900 transition-colors hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${colors.primary}`}></span>
                      {name}
                    </button>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-500 font-mono">{tests} mock taken</span>
                      <span className={`font-bold font-mono ${getAccuracyColor(avg)}`}>{avg > 0 ? `${avg}%` : 'No attempts'}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors.primary} rounded-full transition-all duration-500`}
                      style={{ width: `${avg > 0 ? avg : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagnostic Weaknesses & Insights Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-amber-500 animate-bounce" />
              Diagnostic Evaluation
            </h3>

            {attemptedSubjects.length === 0 ? (
              <div className="text-slate-500 text-sm space-y-4 py-6 text-center">
                <p>Complete at least one practice subject exam to generate your custom syllabus insights.</p>
                <div className="p-3 bg-slate-50 rounded-lg text-xs leading-relaxed text-left border border-slate-100 italic">
                  "The standard JAMB exams consist of 4 subjects. Practice with time limit to simulate real examination conditions."
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {weakestSubject && weakestSubject.avg < 60 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="font-bold text-amber-800 flex items-center gap-1">
                      Focus Required: {weakestSubject.name}
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      Your current average is {weakestSubject.avg}%. We suggest focusing on custom single practice mode to review incorrect questions.
                    </p>
                  </div>
                )}

                {strongestSubject && strongestSubject.avg >= 70 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="font-bold text-emerald-800">
                      Strength Asset: {strongestSubject.name}
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">
                      Outstanding work! An average score of {strongestSubject.avg}% indicates high preparedness in this UTME/WAEC subject area.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="font-bold text-indigo-800">Exam Pace Advice</div>
                    <p className="text-xs text-indigo-700 mt-1">
                      Keep practicing with the active mock exam session to master your speed. Aim for less than 40 seconds per question!
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">UTME Subject Targets</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex justify-between">
                      <span>• Minimum University Target:</span>
                      <span className="font-bold font-mono">200 / 400</span>
                    </li>
                    <li className="flex justify-between">
                      <span>• Competitive Course (e.g. Medicine):</span>
                      <span className="font-bold font-mono">280+ / 400</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center">
            <button 
              onClick={onResetStats}
              className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
            >
              Reset All Progress
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Build v2.1 (Offline-Safe)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
