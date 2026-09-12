import { supabase } from "@/integrations/supabase/client";

/** How and how far someone wants to hear about new bounties near them. */
export type AlertPreferences = {
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  phone: string;
  radius_miles: number;
  area_label: string;
};

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  push_enabled: true,
  sms_enabled: false,
  email_enabled: false,
  phone: "",
  radius_miles: 5,
  area_label: "",
};

export const RADIUS_CHOICES = [2, 5, 10, 25] as const;

const COLUMNS = "push_enabled, sms_enabled, email_enabled, phone, radius_miles, area_label";

/** Reads the signed-in person's alert settings, falling back to the defaults. */
export async function fetchAlertPreferences(): Promise<AlertPreferences> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return DEFAULT_ALERT_PREFERENCES;

  const { data, error } = await supabase
    .from("alert_preferences")
    .select(COLUMNS)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !data) return DEFAULT_ALERT_PREFERENCES;

  return {
    push_enabled: data.push_enabled,
    sms_enabled: data.sms_enabled,
    email_enabled: data.email_enabled,
    phone: data.phone ?? "",
    radius_miles: Number(data.radius_miles),
    area_label: data.area_label ?? "",
  };
}

/** Saves the alert settings for the signed-in person. */
export async function saveAlertPreferences(prefs: AlertPreferences) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("You must be signed in.");

  const { error } = await supabase.from("alert_preferences").upsert(
    {
      user_id: auth.user.id,
      push_enabled: prefs.push_enabled,
      sms_enabled: prefs.sms_enabled,
      email_enabled: prefs.email_enabled,
      phone: prefs.phone.trim(),
      radius_miles: prefs.radius_miles,
      area_label: prefs.area_label.trim(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
