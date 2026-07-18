"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  className?: string;
};

export default function Radio({
  label,
  description,
  error,
  className,
  id,
  checked,
  disabled,
  required,
  ...props
}: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;

  const descriptionId = description
    ? `${radioId}-description`
    : undefined;

  const errorId = error
    ? `${radioId}-error`
    : undefined;

  const describedBy = [descriptionId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div
      data-invalid={error ? "true" : undefined}
      className={["w-full", className]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={radioId}
        className={[
          "flex items-start gap-3",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
        ].join(" ")}
      >
        <span className="relative mt-0.5 flex shrink-0">
          <input
            id={radioId}
            type="radio"
            checked={checked}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            className="peer sr-only"
            {...props}
          />

          <span
            aria-hidden="true"
            className={[
              "flex h-5 w-5 items-center justify-center rounded-full border transition",
              "border-[var(--app-input)] bg-[var(--app-card)]",
              "peer-focus-visible:ring-2",
              "peer-focus-visible:ring-[var(--app-primary)]",
              "peer-focus-visible:ring-offset-2",
              "peer-focus-visible:ring-offset-[var(--app-background)]",
              error
                ? "border-[var(--app-destructive)]"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className={[
                "h-2.5 w-2.5 rounded-full transition",
                checked
                  ? "bg-[var(--app-primary)]"
                  : "bg-transparent",
              ].join(" ")}
            />
          </span>
        </span>

        {(label || description) && (
          <span className="min-w-0">
            {label && (
              <span className="block text-sm font-black text-[var(--app-text)]">
                {label}

                {required && (
                  <span
                    aria-hidden="true"
                    className="mr-1 text-[var(--app-destructive)]"
                  >
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
