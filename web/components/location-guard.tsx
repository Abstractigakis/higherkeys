"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { LocateFixed, MapPinOff } from "lucide-react";

interface LocationContextType {
  location: { lat: number; lng: number } | null;
  error: string | null;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  error: null,
  isLoading: true,
});

export const useLocation = () => useContext(LocationContext);

export function LocationGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setError(null);
      setIsLoading(false);
    };

    const handleError = (error: GeolocationPositionError) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setError(
            "Location permission denied. This app requires location access to function."
          );
          break;
        case error.POSITION_UNAVAILABLE:
          setError("Location information is unavailable.");
          break;
        case error.TIMEOUT:
          setError("The request to get user location timed out.");
          break;
        default:
          setError("An unknown error occurred.");
          break;
      }
      setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-4 text-white">
        <LocateFixed className="w-12 h-12 animate-pulse text-blue-500" />
        <p className="text-lg font-medium tracking-tight">
          Requesting Location Access...
        </p>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-6 p-6 text-center text-white">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
          <MapPinOff className="w-10 h-10 text-red-500" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Location Access Required
          </h2>
          <p className="text-white/60 leading-relaxed">
            {error || "We need your location to proceed."}
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-white/90 transition-all"
            >
              Retry Permission
            </button>
          </div>
        </div>
        <p className="fixed bottom-8 text-[10px] text-white/20 uppercase tracking-[0.2em]">
          Higher Keys Security Protocol
        </p>
      </div>
    );
  }

  return (
    <LocationContext.Provider value={{ location, error, isLoading }}>
      {children}
    </LocationContext.Provider>
  );
}
