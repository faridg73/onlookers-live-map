// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
