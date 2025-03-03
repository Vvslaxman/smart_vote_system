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
  const captureTimerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm({
    resolver: zodResolver(insertVoterSchema),
    defaultValues: {
      name: "",
      aadharId: "",
      faceDescriptors: [],
    },
  });

  // Ensure cleanup
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  // Start the face capture process
  async function startCapture() {
    setIsLoading(true);
    setIsCapturing(true);
    setCaptureCount(0);
    setIsRegisterEnabled(false); // Disable register button while capturing
    setTimeRemaining(15);

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

        // Wait for the video element to be ready
        await new Promise((resolve, reject) => {
          const checkVideoReady = setInterval(() => {
            if (videoRef.current?.videoWidth && videoRef.current?.videoHeight) {
              clearInterval(checkVideoReady);
              resolve(true);
            }
          }, 100); // Check every 100ms if the video is ready

          // Timeout after 5 seconds to avoid an infinite loop
          setTimeout(() => {
            clearInterval(checkVideoReady);
            reject(new Error("Video not ready"));
          }, 5000); // Timeout after 5 seconds
        });

        // Start getting face descriptors
        try {
          const descriptors = await getFaceDescriptors(
            videoRef.current,
            (count, timeLeft) => {
              setCaptureCount(count);
              setTimeRemaining(timeLeft);
              setCaptureProgress((count / 10) * 100);
            }
          );

          // Store the descriptors directly in the form
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
            description: "Please ensure your face is clearly visible throughout the process.",
          });
        } finally {
          stopCapture();
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
    }
  }

  function stopCapture() {
    console.log("Stopping face capture...");
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
    }
    setIsCapturing(false);
    setIsLoading(false);
  }

  async function onSubmit(data: any) {
    try {
      if (!data.faceDescriptors || data.faceDescriptors.length === 0) {
        toast({
          variant: "destructive",
          title: "Face Data Required",
          description: "Please complete the face capture process before registering.",
        });
        return;
      }

      console.log("Submitting registration data...");
      await apiRequest("POST", "/api/voters", data);
      toast({
        title: "Registration Successful",
        description: "You have been registered successfully.",
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
                <FormLabel>Face Capture</FormLabel>
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
                disabled={!isRegisterEnabled || !form.getValues("name") || !form.getValues("aadharId") || !form.getValues("faceDescriptors").length}
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