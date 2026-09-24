// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ChevronRight, Loader2, MapPin, UserRound } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PRO_VISIT_DRAFT_KEY, type ProVisitDraft } from "@/lib/pro-plans";
import { listMyProVisitBookings, type ProVisitBooking } from "@/lib/pro-visits.functions";

function statusFor(booking: ProVisitBooking) {
  if (booking.bookingStatus === "draft") return { label: "Needs confirmation", tone: "text-signal" };
  if (booking.bookingStatus === "cancelled") return { label: "Cancelled", tone: "text-muted-foreground" };
  if (!booking.requestId) return { label: "Cancelled", tone: "text-muted-foreground" };
  if (booking.requestStatus === "completed") return { label: "Completed", tone: "text-foreground" };
  if (booking.requestStatus === "claimed") return { label: "In progress", tone: "text-signal" };
  if (booking.requestStatus === "expired") return { label: "Expired", tone: "text-muted-foreground" };
  if (booking.requestStatus === "open" && booking.requestExpiresAt && Date.parse(booking.requestExpiresAt) <= Date.now()) {
    return { label: "Expired", tone: "text-muted-foreground" };
  }
  if (booking.requestStatus === "open") return { label: "Open", tone: "text-signal" };
  return { label: "Cancelled", tone: "text-muted-foreground" };
}

export function ProfessionalVisitsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listBookings = useServerFn(listMyProVisitBookings);
  const [rows, setRows] = useState<ProVisitBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bookings = await listBookings();
      setRows(bookings);
      setAvailable(true);
    } catch {
      setRows([]);
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [user, listBookings]);

  useEffect(() => { void load(); }, [load]);

  const resume = (booking: ProVisitBooking) => {
    const draft: ProVisitDraft = {
      bookingId: booking.id,
      address: booking.address,
      purpose: booking.purpose,
      startAt: booking.scheduledStartAt,
      agentName: booking.contactName,
      agentPhone: booking.contactPhone,
      agentEmail: booking.contactEmail,
    };
    try {
      window.sessionStorage.setItem(PRO_VISIT_DRAFT_KEY, JSON.stringify(draft));
      void navigate({ to: "/post", search: { mode: "bounty" } });
    } catch {
      toast.error("Could not reopen this visit. Please try again.");
    }
  };

  if (!user || (!loading && !available)) return null;

  return (
    <section className="mt-8" aria-labelledby="verified-visits-dashboard">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="verified-visits-dashboard" className="font-display text-lg text-foreground">
            <span className="text-signal">Verified</span> Visits
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Scheduled property visits and their live progress.</p>
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading visits" />}
      </div>

      {!loading && rows.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No verified visits scheduled yet.</p>
          <Button asChild variant="outline" className="mt-3 rounded-xl">
            <Link to="/verification" hash="request-visit">Schedule a visit</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((booking) => {
            const status = statusFor(booking);
            return (
              <article key={booking.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">{booking.purpose}</p>
                  <span className={`shrink-0 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                </div>
                <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-signal" />
                  <span className="line-clamp-2">{booking.address}</span>
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5 shrink-0" />
                  {booking.scheduledStartAt
                    ? format(new Date(booking.scheduledStartAt), "MMM d, yyyy 'at' h:mm a")
                    : "Time arranged after confirmation"}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="size-3.5 shrink-0" /> {booking.contactName}
                </p>
                <div className="mt-4 border-t border-border pt-3">
                  {booking.requestId ? (
                    <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                      <Link to="/b/$id" params={{ id: booking.requestId }}>View bounty <ChevronRight className="size-4" /></Link>
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => resume(booking)} className="h-10 w-full rounded-xl bg-signal font-bold text-signal-foreground hover:brightness-110">
                      Continue setup <ChevronRight className="size-4" />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}