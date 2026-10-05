'use client';

import type { InputHTMLAttributes } from 'react';

/** A checkbox that submits its parent GET form as soon as it is toggled. */
export default function AutoSubmitCheckbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'>) {
  return (
    <input
      key={String(props.defaultChecked ?? false)}
      {...props}
      type="checkbox"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    />
  );
}
