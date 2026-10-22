import { useState, type InputHTMLAttributes } from 'react';
import { fmtIn, parseNum } from './calc';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  id: string;
  value: number | null | undefined;
  onChange: (n: number | null) => void;
};

/** A number box that keeps what you type while you type (so "24." isn't snapped back), saves every readable value. */
export default function NumField({ id, value, onChange, ...rest }: Props) {
  const [text, setText] = useState<string | null>(null); // null = not being edited
  const shown = text ?? fmtIn(value);
  const bad = text != null && parseNum(text) === undefined;
  return (
    <input
      {...rest}
      id={id}
      inputMode="decimal"
      autoComplete="off"
      className={`${rest.className ?? ''}${bad ? ' bad' : ''}`}
      value={shown}
      onFocus={(e) => {
        setText(fmtIn(value));
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseNum(e.target.value);
        if (n !== undefined && n !== value) onChange(n);
      }}
      onBlur={(e) => {
        setText(null);
        rest.onBlur?.(e);
      }}
    />
  );
}
