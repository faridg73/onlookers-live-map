import { supabase } from "@/integrations/supabase/client";
import type { CommunityCategory } from "@/lib/community";

/** The three trust levels an account can hold. */
export type TrustLevel = 1 | 2 | 3;

export type TrustTierDef = {
  level: TrustLevel;
  name: string;
  blurb: string;
  /** What this level unlocks. */
  unlocks: string;
  /** The single next step to move up, or null at the top. */
  nextStep: string | null;
  badge: string;
};

export const TRUST_TIERS: TrustTierDef[] = [
  {
    level: 1,
    name: "Reader / Flagger",
    blurb: "Signed in, reading and flagging",
    unlocks: "Read every feed, flag outdated posts and validate markers.",
    nextStep: "Confirm your mobile number to become a Provisional Contributor.",
    badge: "border-border bg-surface-raised text-muted-foreground",
  },
  {
    level: 2,
    name: "Provisional Contributor",
    blurb: "Number confirmed or reputation earned",
    unlocks: "Post ordinary community reports, photos and meetups.",
    nextStep: "Get the verified creator mark to file emergency and live alerts.",
    badge: "border-signal/50 bg-signal/10 text-signal",
  },
  {
    level: 3,
    name: "Verified Creator / First Responder",
    blurb: "Verified mark or responder grant",
    unlocks: "File emergency and live alerts: fire, police, medical and hazard.",
    nextStep: null,
    badge: "border-crisis/60 bg-crisis/25 text-foreground",
  },
];

export function trustTier(level: TrustLevel): TrustTierDef {
  return TRUST_TIERS.find((tier) => tier.level === level) ?? TRUST_TIERS[0]!;
}

/** Incident lanes offered by the Create Community Report form. */
export type IncidentType = {
  id: "fire" | "police" | "medical" | "traffic" | "hazard" | "general";
  label: string;
  /** True when only level 3 accounts may file it. */
  emergency: boolean;
  tag: string;
  category: CommunityCategory;
};

export const INCIDENT_TYPES: IncidentType[] = [
  { id: "fire", label: "Fire", emergency: true, tag: "incident:fire", category: "breaking" },
  { id: "police", label: "Police", emergency: true, tag: "incident:police", category: "breaking" },
  { id: "medical", label: "Medical", emergency: true, tag: "incident:medical", category: "breaking" },
  { id: "traffic", label: "Traffic", emergency: false, tag: "incident:traffic", category: "traffic" },
  { id: "hazard", label: "Hazard", emergency: false, tag: "incident:hazard", category: "traffic" },
  { id: "general", label: "Community", emergency: false, tag: "incident:general", category: "general" },
];

export function incidentById(id: string): IncidentType | undefined {
  return INCIDENT_TYPES.find((incident) => incident.id === id);
}

export const EMERGENCY_LOCKED_NOTE =
  "Emergency lanes need the verified creator mark. Verify on your profile to unlock them.";

/** Trust level for the signed-in member, defaulting to level 1. */
export async function fetchMyTrustLevel(): Promise<TrustLevel> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 1;
  const { data, error } = await supabase.rpc("trust_level", { _user_id: auth.user.id });
  const level = Number(data);
  if (error || !Number.isFinite(level)) return 1;
  return (Math.min(3, Math.max(1, Math.round(level))) as TrustLevel);
}
