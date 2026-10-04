'use client';

import type { ChangeEvent, SelectHTMLAttributes } from 'react';

/** A <select> that submits its parent GET form as soon as the value changes (no Apply button). */
export default function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const apply = (e: ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  return <select {...props} onChange={apply} />;
}
