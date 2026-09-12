"use client";

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...rest }: InputProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-zinc-300">{label}</span>}
      <input
        id={id}
        className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors hover:border-zinc-600 focus:border-accent ${
          error ? "border-revoked" : "border-zinc-700"
        } ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-revoked">{error}</span>}
    </label>
  );
}
