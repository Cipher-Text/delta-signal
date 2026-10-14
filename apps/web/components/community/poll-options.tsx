'use client';

import { useState, useTransition } from 'react';
import { castFeedVoteAction } from '../../lib/community-actions';
import NavIcon from '../nav-icons';

type Option = { id: string; text: string; votes: number };

/** Poll options as result bars. Pick once to see results; picking another option changes your vote. */
export default function PollOptions({
  postId,
  options,
  votedId,
  closed,
  canVote,
  meta,
}: {
  postId: string;
  options: Option[];
  votedId: string | null;
  closed: boolean;
  canVote: boolean;
  meta: string;
}) {
  const [mine, setMine] = useState<string | null>(votedId);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  // Optimistic totals: take the previous server vote off, put the new one on.
  const counts = options.map((o) => o.votes - (votedId === o.id ? 1 : 0) + (mine === o.id ? 1 : 0));
  const total = counts.reduce((a, b) => a + b, 0);
  const showResults = mine !== null || closed;

  function vote(id: string) {
    if (!canVote || closed || pending || id === mine) return;
    const prev = mine;
    setMine(id);
    setError('');
    start(async () => {
      const res = await castFeedVoteAction(postId, id);
      if (res.error) {
        setMine(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="cm-poll">
      {options.map((o, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const on = mine === o.id;
        return (
          <button
            key={o.id}
            type="button"
            className="cm-opt"
            aria-pressed={on}
            disabled={!canVote || closed}
            data-on={on}
            onClick={() => vote(o.id)}
          >
            <span className="cm-opt-fill" style={{ width: showResults ? `${pct}%` : '0%' }} />
            <span className="cm-opt-text">
              {o.text}
              {on && <NavIcon name="check" />}
            </span>
            <span className="cm-opt-pct">{pct}%</span>
          </button>
        );
      })}
      <span className="cm-poll-meta">
        {total === 1 ? '1 vote' : `${total} votes`} · {meta}
        {mine && !closed ? ' · You voted' : canVote && !closed ? ' · Select an option to vote' : ''}
      </span>
      {error && <span className="cm-poll-error" role="alert">{error}</span>}
    </div>
  );
}
