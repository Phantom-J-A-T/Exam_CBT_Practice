import { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Award, Search, Trophy, School, HelpCircle } from 'lucide-react';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
}

export default function LeaderboardView({ entries }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = entries.filter(
    entry =>
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="text-amber-500 fill-amber-100" size={22} />
            National Merit Leaderboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Foster healthy academic competition. Complete timed mock exams to stand shoulder-to-shoulder with the finest students from Nigeria's top schools.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            className="w-full md:w-64 pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 bg-slate-50 placeholder-slate-400 focus:bg-white transition-all"
            placeholder="Search by student, school or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="overflow-x-auto mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4">Secondary School & State</th>
              <th className="py-3 px-4 text-center">Tests Taken</th>
              <th className="py-3 px-4 text-right">Avg Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredEntries.map((entry, index) => {
              const rank = index + 1;
              const isUser = entry.isUser;

              return (
                <tr
                  key={entry.id + '-' + rank}
                  className={`transition-colors ${
                    isUser
                      ? 'bg-indigo-50/60 font-semibold border-l-4 border-l-indigo-600 hover:bg-indigo-50'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Rank Column */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center items-center">
                      {rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shadow-sm">
                          🥇
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shadow-sm">
                          🥈
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-900 text-xs font-bold flex items-center justify-center shadow-sm">
                          🥉
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono font-medium">{rank}</span>
                      )}
                    </div>
                  </td>

                  {/* Name Column */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5 text-xs">
                        {entry.name}
                        {isUser && (
                          <span className="text-[9px] bg-indigo-600 text-white font-mono uppercase px-1.5 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* School & State Column */}
                  <td className="py-4 px-4 text-xs text-slate-600">
                    <div className="flex flex-col">
                      <span className="text-slate-800 flex items-center gap-1">
                        <School size={12} className="text-slate-400" />
                        {entry.school}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono pl-4">{entry.state}</span>
                    </div>
                  </td>

                  {/* Tests Taken */}
                  <td className="py-4 px-4 text-center text-xs text-slate-600 font-mono">
                    {entry.testsTaken}
                  </td>

                  {/* Score Column */}
                  <td className="py-4 px-4 text-right">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-1 rounded-md ${
                        entry.score >= 85
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : entry.score >= 70
                          ? 'bg-blue-50 text-blue-800 border border-blue-100'
                          : 'bg-slate-50 text-slate-700 border border-slate-100'
                      }`}
                    >
                      {entry.score}%
                    </span>
                  </td>
                </tr>
              );
            })}

            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-slate-400 text-xs">
                  No students found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-lg flex items-start gap-2.5 text-xs text-slate-500">
        <HelpCircle size={16} className="text-slate-400 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700">How to increase your rank:</span> Your average score is calculated on completion of standard 50-question mock tests. Work hard, maintain high accuracy, and increase exams taken to secure your position at the top!
        </div>
      </div>
    </div>
  );
}
