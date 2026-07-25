import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { hasPublicEnv } from "@/lib/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = hasPublicEnv;
