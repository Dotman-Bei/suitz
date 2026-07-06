type ClassValue = string | number | null | false | undefined;

/** Tiny classnames joiner — no dependency, falsy values dropped. */
export function clsx(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
