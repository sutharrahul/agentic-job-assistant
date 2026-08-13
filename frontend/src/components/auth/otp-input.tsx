"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

// Six boxes rather than one text field. It isn't decoration: it tells
// the user how long the code is before they go and read it, and it makes
// a wrong-length paste obvious instead of silently failing on submit.
//
// The value is still a single string in the parent — the boxes are a
// view over it, so verification code handling never has to reassemble
// digits from six pieces of state.
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LENGTH, " ").slice(0, LENGTH).split("");

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
    return clean;
  }

  function handleInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;

    // Typing over a filled box replaces that digit; a multi-character
    // value means the OS autofilled the whole code into one box.
    const next =
      typed.length > 1
        ? typed
        : value.slice(0, index) + typed[0] + value.slice(index + 1);

    const clean = commit(next);
    const focus = Math.min(typed.length > 1 ? clean.length : index + 1, LENGTH - 1);
    boxes.current[focus]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent) {
    if (event.key === "Backspace") {
      event.preventDefault();
      // Backspace on an empty box steps back and clears the previous
      // one, which is what every OTP field people have used does.
      const target = value[index] ? index : Math.max(index - 1, 0);
      commit(value.slice(0, target) + value.slice(target + 1));
      boxes.current[target]?.focus();
      return;
    }
    if (event.key === "ArrowLeft") boxes.current[Math.max(index - 1, 0)]?.focus();
    if (event.key === "ArrowRight")
      boxes.current[Math.min(index + 1, LENGTH - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el;
          }}
          value={digit.trim()}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => {
            e.preventDefault();
            const clean = commit(e.clipboardData.getData("text"));
            boxes.current[Math.min(clean.length, LENGTH - 1)]?.focus();
          }}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1}`}
          className={cn(
            "size-12 rounded-xl border border-input bg-card text-center text-lg font-medium outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50 dark:bg-surface-3",
          )}
        />
      ))}
    </div>
  );
}
