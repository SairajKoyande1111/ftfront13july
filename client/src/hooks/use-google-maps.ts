import { useState, useEffect } from "react";

const SCRIPT_ID = "google-maps-js";

function isLoaded(): boolean {
  return typeof window !== "undefined" && !!window.google?.maps;
}

function isInDom(): boolean {
  return !!document.getElementById(SCRIPT_ID);
}

const _callbacks: Array<() => void> = [];

export function useGoogleMaps(): boolean {
  const [ready, setReady] = useState(isLoaded);

  useEffect(() => {
    if (isLoaded()) { setReady(true); return; }

    const onLoad = () => setReady(true);
    _callbacks.push(onLoad);

    if (!isInDom()) {
      const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
      if (!key) {
        console.error("[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY is not set");
        _callbacks.splice(_callbacks.indexOf(onLoad), 1);
        return;
      }
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        _callbacks.forEach(cb => cb());
        _callbacks.length = 0;
      };
      script.onerror = () => {
        console.error("[GoogleMaps] Failed to load script");
        _callbacks.splice(_callbacks.indexOf(onLoad), 1);
      };
      document.head.appendChild(script);
    }

    return () => {
      const idx = _callbacks.indexOf(onLoad);
      if (idx >= 0) _callbacks.splice(idx, 1);
    };
  }, []);

  return ready;
}
