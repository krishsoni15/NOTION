"use client";

/**
 * Map Picker Component
 * 
 * Interactive map for selecting a location.
 * Uses react-leaflet and OpenStreetMap.
 */

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Location {
    lat: number;
    lng: number;
}

interface MapPickerProps {
    initialLocation?: Location;
    onLocationSelect?: (location: Location) => void;
    className?: string;
    readonly?: boolean;
}

// Sub-component to handle map clicks
function LocationMarker({ position, onPositionChange, readonly }: { position: Location | null, onPositionChange: (pos: Location) => void, readonly?: boolean }) {
    useMapEvents({
        click(e) {
            if (!readonly) {
                onPositionChange(e.latlng);
            }
        },
    });

    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    const eventHandlers = {
        dragend(e: any) {
            if (!readonly) {
                const marker = e.target;
                const position = marker.getLatLng();
                onPositionChange(position);
            }
        },
    };

    return position === null ? null : (
        <Marker
            position={position}
            draggable={!readonly}
            eventHandlers={eventHandlers}
        />
    );
}

// Sub-component to re-center map
function MapController({ center }: { center: Location | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 18);
        }
    }, [center, map]);
    return null;
}

export default function MapPicker({ initialLocation, onLocationSelect, className, readonly = false }: MapPickerProps) {
    const [position, setPosition] = useState<Location | null>(initialLocation || null);

    // Default center (India/Bangalore approx, or fallback)
    const defaultCenter = { lat: 12.9716, lng: 77.5946 };

    // Update internal position if prop changes (important for message list updates)
    useEffect(() => {
        if (initialLocation) {
            setPosition(initialLocation);
        }
    }, [initialLocation]);

    const handlePositionChange = (latlng: Location) => {
        if (readonly) return;
        setPosition(latlng);
        onLocationSelect?.(latlng);
    };

    // Generate a unique key for the map container to prevent reuse errors
    // This forces a complete remount of the map when the component remounts
    // Generate a unique key based on initial location to force full re-render on change
    // Also use a random ID to prevent "Map container is being reused" on fast toggles
    const [mapId] = useState(() => `map-${Date.now()}-${Math.random()}`);

    return (
        <div className={className}>
            <MapContainer
                key={mapId}
                center={initialLocation || defaultCenter}
                zoom={13}
                scrollWheelZoom={!readonly}
                dragging={!readonly}
                zoomControl={!readonly}
                doubleClickZoom={!readonly}
                touchZoom={!readonly}
                attributionControl={!readonly}
                className="h-full w-full rounded-md z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker
                    position={position}
                    onPositionChange={handlePositionChange}
                    readonly={readonly}
                />
                <MapController center={initialLocation || null} />
            </MapContainer>
        </div>
    );
}
