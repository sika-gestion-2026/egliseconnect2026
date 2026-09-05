import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

interface RoutingMachineProps {
  userLocation: { lat: number; lng: number };
  churchLocation: { lat: number; lng: number };
  onRouteFound?: (routeInfo: { distance: string; time: string; rawDistance: number; rawTime: number }) => void;
}

export default function RoutingMachine({ userLocation, churchLocation, onRouteFound }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Use OSRM (Open Source Routing Machine) which is the default for leaflet-routing-machine
    const routingControl = L.Routing.control({
      // @ts-ignore - leaflet-routing-machine types can be tricky with plan
      plan: L.Routing.plan(
        [
          L.latLng(userLocation.lat, userLocation.lng),
          L.latLng(churchLocation.lat, churchLocation.lng)
        ],
        {
          createMarker: function() { return false; },
        }
      ),
      routeWhileDragging: true,
      lineOptions: {
        styles: [{ color: '#10b981', weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false, // Hide the default instructions panel
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
    }).addTo(map);

    routingControl.on('routingerror', function(e: any) {
      console.error('Routing Error:', e.error);
      alert("Erreur de calcul d'itinéraire. Le serveur de routage est peut-être indisponible.");
    });

    routingControl.on('routesfound', function(e: any) {
      if (e.routes && e.routes.length > 0) {
        const summary = e.routes[0].summary;
        const distanceKm = (summary.totalDistance / 1000).toFixed(1) + ' km';
        const totalMinutes = Math.round(summary.totalTime / 60);
        const timeHours = Math.floor(totalMinutes / 60);
        const timeMinutes = totalMinutes % 60;
        
        let timeStr = '';
        if (timeHours > 0) {
          timeStr += `${timeHours}h `;
        }
        timeStr += `${timeMinutes} min`;
        
        if (onRouteFound) {
          onRouteFound({ 
            distance: distanceKm, 
            time: timeStr, 
            rawDistance: summary.totalDistance, // in meters
            rawTime: summary.totalTime // in seconds
          });
        }
      }
    });

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
