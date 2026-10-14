'use client';

import type { ChangeEvent, SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Names of other fields in the form to reset before submitting (e.g. upazila when the district changes). */
  clears?: string[];
};

/** A <select> that submits its parent GET form as soon as the value changes (no Apply button). */
export default function AutoSubmitSelect({ clears, ...props }: Props) {
  const apply = (e: ChangeEvent<HTMLSelectElement>) => {
    const form = e.currentTarget.form;
    for (const name of clears ?? []) {
      const field = form?.elements.namedItem(name);
      if (field instanceof HTMLSelectElement || field instanceof HTMLInputElement) field.value = '';
    }
    form?.requestSubmit();
  };
  // Uncontrolled selects only read defaultValue on mount; remount when links change the URL filter.
  return <select key={String(props.defaultValue ?? '')} {...props} onChange={apply} />;
}
