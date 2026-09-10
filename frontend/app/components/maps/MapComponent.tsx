"use client";

import LeafletMapComponent from "./LeafletMap";

type MapComponentProps = {
  initialCenter?: [number, number];
  initialZoom?: number;
};

export default function MapComponent({
  initialCenter,
  initialZoom,
}: MapComponentProps) {
  return (
    <div className="w-full h-full">
      <LeafletMapComponent
        initialCenter={initialCenter}
        initialZoom={initialZoom}
      />
    </div>
  );
}
