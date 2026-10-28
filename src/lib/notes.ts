import type { Note } from './types';

/** The newest note for each loan, by loan id. */
export function latestNoteByLoan(notes: Note[]): Record<string, Note> {
  const latest: Record<string, Note> = {};
  for (const n of notes) {
    const cur = latest[n.loanId];
    if (!cur || n.createdAt > cur.createdAt) latest[n.loanId] = n;
  }
  return latest;
}

/** "cfavot@pirillolaw.com" becomes "cfavot". */
export const authorName = (email: string) => email.split('@')[0] || email;
