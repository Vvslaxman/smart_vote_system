import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVoterSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { getFaceDescriptors } from "@/lib/face";
import { Loader2, Camera } from "lucide-react";

export default function Register() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);
  const [isRegisterEnabled, setIsRegisterEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm({
      resolver: zodResolver(insertVoterSchema),
      defaultValues: {
        name: "",
        aadharId: "",
        faceDescriptors: [] as number[][],
      },
    });

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  async function startCapture() {
    setIsLoading(true);
    setIsCapturing(true);
    setCaptureCount(0);
    setTimeRemaining(15);
    setCaptureProgress(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });

        try {
          const descriptors = await getFaceDescriptors(
            videoRef.current,
            (count, timeLeft) => {
              setCaptureCount(count);
              setTimeRemaining(timeLeft);
              setCaptureProgress((count / 10) * 100);
            }
          );

          form.setValue("faceDescriptors", descriptors.map(d => Array.from(d)));
          setIsRegisterEnabled(true);

          toast({
            title: "Face Capture Successful",
            description: `Captured ${descriptors.length} facial images successfully.`,
          });
        } catch (err) {
          console.error('Face capture error:', err);
          toast({
            variant: "destructive",
            title: "Face Capture Failed",
            description: "Please ensure your face is clearly visible and try again.",
          });
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Failed to access camera. Please ensure camera permissions are granted.",
      });
    } finally {
      setIsLoading(false);
      stopCapture();
    }
  }

  function stopCapture() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }

  async function onSubmit(data: any) {
    try {
      const hasValidFaceData = data.faceDescriptors && data.faceDescriptors.length > 0;

      if (!hasValidFaceData) {
        const proceed = window.confirm("No face data captured. Do you want to proceed with registration anyway?");
        if (!proceed) return;
      }

      await apiRequest("POST", "/api/voters", data);
      toast({
        title: "Registration Successful",
        description: hasValidFaceData ? 
          "Your registration is complete with face verification." :
          "Registration completed without face verification. You may update this later.",
      });
      setLocation("/vote");
    } catch (err) {
      console.error('Registration error:', err);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "Please try again. The Aadhar ID might already be registered.",
      });
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Voter Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aadharId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12-digit Aadhar number" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Face Capture (Optional)</FormLabel>
                {isCapturing ? (
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Images Captured: {captureCount}/10</span>
                        <span>Time Remaining: {timeRemaining}s</span>
                      </div>
                      <Progress value={captureProgress} className="h-2" />
                    </div>
                    <Button
                      type="button"
                      onClick={stopCapture}
                      variant="secondary"
                      className="w-full"
                    >
                      Stop Camera
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCapture}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting Camera...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Start Face Capture
                      </>
                    )}
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!form.getValues("name") || !form.getValues("aadharId")}
              >
                Register
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}