import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ISO from the API -> value an <input type="date"> can display.
export function isoToDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ""
}
