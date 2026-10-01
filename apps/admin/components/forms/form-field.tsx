import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from 'cn';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Spans both columns of a FormSection grid. */
  wide?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint / error, with the error announced to assistive technologies. */
export function FormField({ label, htmlFor, error, hint, required, wide, children, className }: FormFieldProps) {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;
  return (
    <div className={cn('space-y-1.5', wide && '@md:col-span-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
