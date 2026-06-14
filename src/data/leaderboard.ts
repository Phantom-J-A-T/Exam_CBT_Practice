import { LeaderboardEntry } from '../types';

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'l1', name: 'Chioma Obi', school: 'Loyola Jesuit College', state: 'Abuja (FCT)', score: 96, testsTaken: 12 },
  { id: 'l2', name: 'Tunde Adebayo', school: 'King\'s College', state: 'Lagos', score: 92, testsTaken: 15 },
  { id: 'l3', name: 'Amina Aliyu', school: 'Suleja Academy', state: 'Niger', score: 89, testsTaken: 10 },
  { id: 'l4', name: 'Nkemdilim Udoka', school: 'Federal Government College', state: 'Enugu', score: 85, testsTaken: 8 },
  { id: 'l5', name: 'Bashir Yusuf', school: 'Barewa College', state: 'Kaduna', score: 82, testsTaken: 14 },
  { id: 'l6', name: 'Oluwaseun Ajayi', school: 'Christ\'s School', state: 'Ekiti', score: 79, testsTaken: 9 },
  { id: 'l7', name: 'Blessing Udoh', school: 'Presentation National High', state: 'Edo', score: 76, testsTaken: 11 },
  { id: 'l8', name: 'Fatima Yar\'Adua', school: 'Government Girls College', state: 'Katsina', score: 74, testsTaken: 6 },
  { id: 'l9', name: 'Ibrahim Danjuma', school: 'Gombe High School', state: 'Gombe', score: 71, testsTaken: 7 },
  { id: 'l10', name: 'Ezekiel Bassey', school: 'Hope Waddell Training Inst.', state: 'Cross River', score: 68, testsTaken: 5 }
];

export function getUpdatedLeaderboard(userAverageScore: number, userTestsTaken: number, userName: string, userSchool: string): LeaderboardEntry[] {
  const usersRank: LeaderboardEntry = {
    id: 'user_temp',
    name: userName || 'You (Nigerian Scholar)',
    school: userSchool || 'Your Practice Hub',
    state: 'Active Practice',
    score: Math.round(userAverageScore),
    testsTaken: userTestsTaken,
    isUser: true
  };

  const list = [...INITIAL_LEADERBOARD];
  
  if (userTestsTaken > 0) {
    list.push(usersRank);
  }

  // Sort by score descending, then by testsTaken descending
  return list.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.testsTaken - a.testsTaken;
  });
}
