import { useState } from "react";
import AccidentMap from "@/components/AccidentMap";
import MapboxTokenInput from "@/components/MapboxTokenInput";

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState<string>("");

  if (!mapboxToken) {
    return <MapboxTokenInput onTokenSubmit={setMapboxToken} />;
  }

  return <AccidentMap mapboxToken={mapboxToken} />;
};

export default Index;
