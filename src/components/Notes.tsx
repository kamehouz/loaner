import { useState } from 'react';
import { fmtDateTime } from '../lib/format';
import { authorName } from '../lib/notes';
import type { Note } from '../lib/types';

interface Props {
  /** Notes for this loan, newest first */
  notes: Note[];
  onAdd: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** A running log for one loan: type an update, and it is stamped with the date and who wrote it. */
export function Notes({ notes, onAdd, onDelete }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const add = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      await onAdd(body);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the note.');
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    try {
      await onDelete(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the note.');
    }
  };

  return (
    <div className="card panel">
      <div className="notes-head">
        <h2>Notes</h2>
        <span>{notes.length === 0 ? 'Why it is waiting, who has what' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}, newest first`}</span>
      </div>

      <div className="note-add">
        <textarea
          className="textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }}
          placeholder="Add an update, e.g. Waiting for customer to deliver financial info" aria-label="New note"
        />
        <div className="note-add-row">
          <span className="field-hint">Saved with today's date and your name.</span>
          <button className="btn btn-primary" style={{ height: 40 }} onClick={add} disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Add note'}</button>
        </div>
        {error && <div className="error-note" role="alert">{error}</div>}
      </div>

      {notes.length === 0 ? (
        <p className="notes-empty">No notes yet. Use notes to keep track of what each loan is waiting on.</p>
      ) : (
        <ul className="notes-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              <div className="note-meta">
                <span>{fmtDateTime(n.createdAt)} · {authorName(n.author)}</span>
                {confirmId === n.id ? (
                  <span className="note-confirm">
                    Delete this note?
                    <button className="link" style={{ color: 'var(--red)' }} onClick={() => remove(n.id)}>Yes, delete</button>
                    <button className="link" onClick={() => setConfirmId(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="link note-delete" onClick={() => setConfirmId(n.id)} aria-label="Delete note">Delete</button>
                )}
              </div>
              <p className="note-body">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
