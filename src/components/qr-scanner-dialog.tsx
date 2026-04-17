import { useState, useRef, useEffect } from "react";
import { Camera, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function QRScannerDialog({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setLoading(false);
        }
      } catch (err) {
        setError("Camera access denied. Please enable camera permissions.");
        setLoading(false);
      }
    }
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const simulateScan = () => {
    // In a real app with a QR library, this would trigger on detection.
    // For this demonstration, we'll simulate the detection of a Resource ID.
    toast.info("Scanning... (Simulation: Point at any QR code)");
    setTimeout(() => {
      // Assuming the scanned QR points to /app/check-in/[id]
      // We'll just pick a dummy check-in for the sake of the workflow
      onClose();
      navigate({ to: "/app" });
      toast.success("Check-in triggered! Verifying your location...");
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="enterprise-card w-full max-w-sm rounded-[2.5rem] overflow-hidden relative shadow-2xl border-primary/20">
        <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h2 className="font-bold">Live Resource Scanner</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="aspect-square bg-black relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Initializing Lens...</p>
            </div>
          )}
          
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white space-y-4">
              <AlertTriangle className="h-12 w-12 text-warning" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="h-full w-full object-cover"
              />
              {/* Scanner Frame UI */}
              <div className="absolute inset-0 border-[40px] border-black/40 flex items-center justify-center">
                <div className="h-48 w-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1 rounded-tl-md" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1 rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1 rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-white translate-x-1 translate-y-1 rounded-br-md" />
                  
                  {/* Scanning Animation Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-primary/50 animate-scan shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-card text-center">
          <p className="text-xs text-muted-foreground font-medium mb-4">
            Align the physical QR code inside the frame to check-in.
          </p>
          <Button onClick={simulateScan} className="w-full rounded-xl font-bold h-12 shadow-lg shadow-primary/20">
            Simulate Scan (Demo)
          </Button>
        </div>
      </div>
    </div>
  );
}
