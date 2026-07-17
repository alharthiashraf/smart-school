"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { Check } from "lucide-react";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  className?: string;
};

export default function Checkbox({
  label,
  description,
  error,
  className,
  id,
  checked,
  disabled,
  required,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  const descriptionId = description
    ? `${checkboxId}-description`
    : undefined;

  const errorId = error ? `${checkboxId}-error` : undefined;

  const describedBy = errorId ?? descriptionId;

  return (
    <div
      className={[
        "w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={checkboxId}
        className={[
          "flex items-start gap-3",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
        ].join(" ")}
      >
        <span className="relative mt-0.5 flex shrink-0">
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className="peer sr-only"
            {...props}
          />

          <span
            aria-hidden="true"
            className={[
              "flex h-5 w-5 items-center justify-center rounded-[var(--app-radius-sm)] border transition",
              "border-[var(--app-input)] bg-[var(--app-card)] text-transparent",
              "peer-checked:border-[var(--app-primary)] peer-checked:bg-[var(--app-primary)] peer-checked:text-[var(--app-primary-foreground)]",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--app-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--app-background)]",
              error
                ? "border-[var(--app-destructive)]"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Check className="h-3.5 w-3.5" />
          </span>
        </span>

        {(label || description) && (
          <span className="min-w-0">
            {label && (
              <span className="block text-sm font-black text-[var(--app-text)]">
                {label}

                {required && (
                  <span className="mr-1 text-[var(--app-destructive)]">
                    *
                  </span>
                )}
              </span>
            )}

            {description && (
              <span
                id={descriptionId}
                className="mt-1 block text-xs leading-6 text-[var(--app-text-muted)]"
              >
                {description}
              </span>
            )}
          </span>
        )}
      </label>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-bold text-[var(--app-destructive)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}