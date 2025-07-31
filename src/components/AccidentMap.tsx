import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, MapPin, Calendar, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export interface Accident {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  injuries: number;
}

interface AccidentMapProps {
  mapboxToken?: string;
}

const AccidentMap = ({ mapboxToken }: AccidentMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [accidents, setAccidents] = useState<Accident[]>([
    // Sample accidents for demonstration
    {
      id: '1',
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: new Date().toISOString(),
      severity: 'moderate',
      description: 'Rear-end collision at intersection',
      injuries: 2
    },
    {
      id: '2',
      latitude: 40.7130,
      longitude: -74.0058,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'minor',
      description: 'Fender bender',
      injuries: 0
    },
    {
      id: '3',
      latitude: 40.7125,
      longitude: -74.0065,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      severity: 'severe',
      description: 'Multi-vehicle accident',
      injuries: 4
    },
    {
      id: '4',
      latitude: 40.7140,
      longitude: -74.0070,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      severity: 'minor',
      description: 'Side-swipe accident',
      injuries: 1
    }
  ]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tempMarkerPosition, setTempMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [newAccident, setNewAccident] = useState<{
    severity: 'minor' | 'moderate' | 'severe';
    description: string;
    injuries: number;
  }>({
    severity: 'minor',
    description: '',
    injuries: 0
  });

  // Default center (you can change this to your specific area)
  const defaultCenter: [number, number] = [-74.006, 40.7128]; // New York City
  const defaultZoom = 14;

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: defaultCenter,
      zoom: defaultZoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Click handler for adding new accidents
    map.current.on('click', (e) => {
      setTempMarkerPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setShowAddDialog(true);
    });

    toast.success("Map loaded! Click anywhere to mark an accident location.");

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add clustered accidents to map
  useEffect(() => {
    if (!map.current || accidents.length === 0) return;

    // Convert accidents to GeoJSON
    const geojson = {
      type: 'FeatureCollection' as const,
      features: accidents.map((accident) => ({
        type: 'Feature' as const,
        properties: {
          id: accident.id,
          severity: accident.severity,
          description: accident.description,
          injuries: accident.injuries,
          timestamp: accident.timestamp
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [accident.longitude, accident.latitude]
        }
      }))
    };

    // Remove existing source and layers if they exist
    if (map.current.getSource('accidents')) {
      if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
      if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
      if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
      map.current.removeSource('accidents');
    }

    // Add source with clustering
    map.current.addSource('accidents', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // Add cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'accidents',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#f59e0b', // yellow for 1-4 accidents
          5,
          '#f97316', // orange for 5-9 accidents
          10,
          '#dc2626'  // red for 10+ accidents
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          15, // radius for 1-4 accidents
          5,
          20, // radius for 5-9 accidents
          10,
          25  // radius for 10+ accidents
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add cluster count labels
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'accidents',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#ffffff'
      }
    });

    // Add individual accident points
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'accidents',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'severity'],
          'severe', '#dc2626',
          'moderate', '#f97316',
          'minor', '#f59e0b',
          '#f59e0b'
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Click handler for clusters
    map.current.on('click', 'clusters', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });

      const clusterId = features[0].properties!.cluster_id;
      const source = map.current!.getSource('accidents') as mapboxgl.GeoJSONSource;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        map.current!.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom
        });
      });
    });

    // Click handler for individual points
    map.current.on('click', 'unclustered-point', (e) => {
      const properties = e.features![0].properties!;
      const coordinates = (e.features![0].geometry as any).coordinates.slice();

      const popup = new mapboxgl.Popup({
        offset: 25,
        className: 'accident-popup'
      }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full ${
              properties.severity === 'severe' ? 'bg-red-500' : 
              properties.severity === 'moderate' ? 'bg-orange-500' : 'bg-yellow-500'
            }"></div>
            <span class="font-semibold capitalize">${properties.severity} Accident</span>
          </div>
          <p class="text-sm mb-2">${properties.description}</p>
          <div class="text-xs text-gray-600 space-y-1">
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 flex items-center justify-center">📅</span>
              ${new Date(properties.timestamp).toLocaleDateString()}
            </div>
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 flex items-center justify-center">🕐</span>
              ${new Date(properties.timestamp).toLocaleTimeString()}
            </div>
            <div class="flex items-center gap-1">
              <span class="w-3 h-3 flex items-center justify-center">👥</span>
              ${properties.injuries} injuries
            </div>
          </div>
        </div>
      `);

      popup.setLngLat(coordinates).addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      map.current!.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      map.current!.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'unclustered-point', () => {
      map.current!.getCanvas().style.cursor = '';
    });
  }, [accidents]);

  const handleAddAccident = () => {
    if (!tempMarkerPosition) return;

    const accident: Accident = {
      id: Date.now().toString(),
      latitude: tempMarkerPosition.lat,
      longitude: tempMarkerPosition.lng,
      timestamp: new Date().toISOString(),
      severity: newAccident.severity,
      description: newAccident.description,
      injuries: newAccident.injuries
    };

    setAccidents(prev => [...prev, accident]);
    setShowAddDialog(false);
    setNewAccident({ severity: 'minor', description: '', injuries: 0 });
    setTempMarkerPosition(null);
    
    toast.success("Accident recorded successfully!");
  };

  const getStatistics = () => {
    const total = accidents.length;
    const today = new Date().toDateString();
    const todayCount = accidents.filter(a => new Date(a.timestamp).toDateString() === today).length;
    const severeCount = accidents.filter(a => a.severity === 'severe').length;
    const totalInjuries = accidents.reduce((sum, a) => sum + a.injuries, 0);

    return { total, todayCount, severeCount, totalInjuries };
  };

  const stats = getStatistics();

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              To use the interactive map, you need a Mapbox public token. 
              Get one at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                For production use, add your token to Supabase Edge Function Secrets.
                For now, you can temporarily enter it here:
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Accident Tracking Dashboard</h1>
                <p className="text-sm text-muted-foreground">Monitor and analyze traffic incidents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Accidents</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold text-foreground">{stats.todayCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Severe Cases</p>
                  <p className="text-2xl font-bold text-emergency">{stats.severeCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-emergency" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Injuries</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalInjuries}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Container */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Accident Locations & Neighborhood Statistics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Click anywhere on the map to mark a new accident. Clustered circles show accident counts per neighborhood.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapContainer} className="w-full h-[600px] rounded-b-lg" />
          </CardContent>
        </Card>
      </div>

      {/* Add Accident Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Accident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="severity">Severity Level</Label>
              <Select 
                value={newAccident.severity} 
                onValueChange={(value: 'minor' | 'moderate' | 'severe') => 
                  setNewAccident(prev => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="injuries">Number of Injuries</Label>
              <Input
                id="injuries"
                type="number"
                min="0"
                value={newAccident.injuries}
                onChange={(e) => setNewAccident(prev => ({ 
                  ...prev, 
                  injuries: parseInt(e.target.value) || 0 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what happened..."
                value={newAccident.description}
                onChange={(e) => setNewAccident(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddAccident}
                className="flex-1"
                disabled={!newAccident.description.trim()}
              >
                Record Accident
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccidentMap;