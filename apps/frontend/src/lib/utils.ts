import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isPersonAccountEmail(email?: string | null): boolean {
  if (!email) return false;

  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;

  const personDomains = ['gmail', 'yahoo', 'hotmail', 'rediffmail', 'outlook'];
  return personDomains.some(d => domain.startsWith(d));
}
