"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  pendingLabel,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || disabled} className={`${className} disabled:opacity-50`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
