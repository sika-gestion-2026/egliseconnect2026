import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

interface RoutingMachineProps {
  userLocation: { lat: number; lng: number };
  churchLocation: { lat: number; lng: number };
}

export default function RoutingMachine({ userLocation, churchLocation }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Use OSRM (Open Source Routing Machine) which is the default for leaflet-routing-machine
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(churchLocation.lat, churchLocation.lng)
      ],
      routeWhileDragging: true,
      lineOptions: {
        styles: [{ color: '#2563eb', weight: 4 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: true, // Show the instructions panel
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
    }).addTo(map);

    return () => {
      if (map && routingControl) {
        try {
          // Remove waypoints to clear layers before removing the control
          const plan = routingControl.getPlan();
          if (plan) {
            plan.setWaypoints([]);
          }
          map.removeControl(routingControl);
        } catch (e) {
          // Prevent Next.js from throwing unhandled error overlay
        }
      }
    };
  }, [map, userLocation, churchLocation]);

  return null;
}
