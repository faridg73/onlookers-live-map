// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export type AuthState = { user: User | null; loading: boolean };

/**
 * Kept in its own module so hot reloads of the provider never create a second
 * context instance (which used to blank the page with "must be used inside
 * AuthProvider").
 */
export const AuthContext = createContext<AuthState | null>(null);
