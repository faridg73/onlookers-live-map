// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { fetchWeatherAlerts } from "@/lib/weather-alerts.functions";

/** NOAA/NWS alerts as their own card. Renders nothing when no alert is active. */
export function WeatherAlertsBanner({ latitude, longitude }: { latitude: number; longitude: number }) {
  const fetchAlerts = useServerFn(fetchWeatherAlerts);
  const { data: alerts = [] } = useQuery({
    queryKey: ["nws-alerts", latitude.toFixed(2), longitude.toFixed(2)],
    queryFn: () => fetchAlerts({ data: { latitude, longitude } }),
    staleTime: 5 * 60_000,
  });
  if (alerts.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl border border-destructive/50 bg-destructive/10 p-4" aria-label="Official weather alerts">
      <p className="inline-flex items-center gap-2 text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-destructive">
        <AlertTriangle className="size-3.5" aria-hidden /> Official alerts · National Weather Service
      </p>
      <ul className="mt-2 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="text-sm text-foreground">
            <span className="font-extrabold">{alert.event}</span>
            {alert.severity && <span className="text-muted-foreground"> · {alert.severity}</span>}
            {alert.headline && <p className="text-xs text-muted-foreground">{alert.headline}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
