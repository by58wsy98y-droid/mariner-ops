// In-page dialogs. The claude.ai viewer blocks the browser's own confirm() and alert().
import { useState, type ReactElement, type ReactNode } from 'react';

export type Ask = (message: string, yes: string, danger?: boolean) => Promise<boolean>;

export function Modal({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="modal-box">{children}</div>
    </div>
  );
}

interface Question {
  message: string;
  yes: string;
  danger?: boolean;
  done: (ok: boolean) => void;
}

export function useAsk(): [Ask, ReactElement | null] {
  const [q, setQ] = useState<Question | null>(null);
  const ask: Ask = (message, yes, danger) => new Promise((done) => setQ({ message, yes, danger, done }));
  const close = (ok: boolean) => {
    q?.done(ok);
    setQ(null);
  };
  const dialog = q && (
    <Modal labelledBy="ask-msg">
      <p id="ask-msg">{q.message}</p>
      <div className="actions end">
        <button id="ask-no" className="secondary" onClick={() => close(false)}>Cancel</button>
        <button id="ask-yes" className={q.danger ? 'danger-solid' : ''} onClick={() => close(true)} autoFocus>
          {q.yes}
        </button>
      </div>
    </Modal>
  );
  return [ask, dialog];
}
