import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ExternalLink } from "lucide-react";

interface MapboxTokenInputProps {
  onTokenSubmit: (token: string) => void;
}

const MapboxTokenInput = ({ onTokenSubmit }: MapboxTokenInputProps) => {
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onTokenSubmit(token.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg mx-auto shadow-[var(--shadow-elegant)]">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Setup Mapbox Token</CardTitle>
          <p className="text-muted-foreground">
            Enter your Mapbox public token to start tracking accidents
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">How to get your token:</h3>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
              <li>Visit Mapbox.com and create a free account</li>
              <li>Go to your Account → Tokens section</li>
              <li>Copy your Default Public Token</li>
              <li>Paste it below</li>
            </ol>
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="w-full"
            >
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                Open Mapbox Tokens
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="token">Mapbox Public Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJja..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your token starts with "pk." and is safe to use in frontend applications
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={!token.trim()}
            >
              Start Tracking Accidents
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              For production deployment, add your token to Supabase Edge Function Secrets
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapboxTokenInput;