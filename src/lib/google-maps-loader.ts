/** Loads the Maps JavaScript API once, asynchronously, and resolves when ready. */
let loader: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps need a browser."));
  if (loader) return loader;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
  if (!key) return Promise.reject(new Error("Map key missing."));

  loader = new Promise((resolve, reject) => {
    const callbackName = "__onlookerMapsReady";
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      resolve(window.google.maps);
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${callbackName}${
      channel ? `&channel=${channel}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the map."));
    document.head.appendChild(script);
  });

  return loader;
}
