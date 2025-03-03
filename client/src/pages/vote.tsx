import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getFaceDescriptor, compareFaces } from "@/lib/face";
import type { Voter, Candidate } from "@shared/schema";
import { Loader2, Camera } from "lucide-react";

export default function Vote() {
  const [aadharId, setAadharId] = useState("");
  const [voter, setVoter] = useState<Voter>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15); // Added, but not used in this version
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const verificationTimerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const voteMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      if (!voter) return;
      await apiRequest("POST", "/api/votes", {
        voterId: voter.id,
        candidateId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for voting!",
      });
      setVoter(undefined);
      setAadharId("");
      stopCamera();
    },
  });

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    console.log("Stopping camera...");
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }
  }

  async function verifyVoter() {
    try {
      console.log("Starting voter verification process...");
      setIsLoading(true);
      const res = await apiRequest("GET", `/api/voters/${aadharId}`);
      const voterData = await res.json();

      if (voterData.hasVoted) {
        toast({
          variant: "destructive",
          title: "Already Voted",
          description: "This voter has already cast their vote.",
        });
        return;
      }

      if (!voterData.faceDescriptors || voterData.faceDescriptors.length === 0) {
        toast({
          variant: "destructive",
          title: "Registration Incomplete",
          description: "No face data found. Please complete registration first.",
        });
        return;
      }

      console.log("Voter found, starting camera...");
      setVoter(voterData);
      setIsVerifying(true);
      setVerificationAttempts(0);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Auto-stop camera after 30 seconds
        verificationTimerRef.current = setTimeout(() => {
          stopCamera();
          setIsVerifying(false);
          toast({
            variant: "destructive",
            title: "Verification Timeout",
            description: "Please try again if needed.",
          });
        }, 30000);
      }
    } catch (err) {
      console.error('Voter verification error:', err);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Invalid Aadhar ID or system error.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyFace() {
    if (!videoRef.current || !voter) return;

    try {
      console.log("Starting face verification...");
      setIsLoading(true);
      setVerificationAttempts(prev => prev + 1);

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

      const img = new Image();
      img.src = canvas.toDataURL("image/jpeg");
      await new Promise(resolve => img.onload = resolve);

      console.log("Getting face descriptor...");
      const liveDescriptor = await getFaceDescriptor(img);

      // Convert stored descriptors from database format to Float32Array
      const storedDescriptors = voter.faceDescriptors.map(d => new Float32Array(d));

      // Compare the live face descriptor with the stored ones
      if (compareFaces(liveDescriptor, storedDescriptors)) {
        console.log("Face verification successful");
        stopCamera();
        setIsVerifying(false);
        toast({
          title: "Identity Verified",
          description: "You can now cast your vote.",
        });
      } else {
        throw new Error("Face verification failed");
      }
    } catch (err) {
      console.error('Face verification error:', err);
      const attemptsLeft = 3 - verificationAttempts;
      toast({
        variant: "destructive",
        title: "Face Verification Failed",
        description: attemptsLeft > 0 
          ? `Please ensure your face is clearly visible. ${attemptsLeft} attempts remaining.`
          : "Maximum verification attempts reached. Please try again later.",
      });

      if (attemptsLeft <= 0) {
        stopCamera();
        setIsVerifying(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      {isVerifying ? (
        <Card className="max-w-md mx-auto backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Face Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Attempts: {verificationAttempts}/3
            </div>
            <Button 
              onClick={verifyFace} 
              className="w-full"
              disabled={isLoading || verificationAttempts >= 3}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Verify Face
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : voter && !voter.hasVoted ? (
        <Card className="max-w-2xl mx-auto backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Cast Your Vote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {candidates?.map((candidate) => (
                <Card key={candidate.id} className="backdrop-blur-sm bg-background/50">
                  <CardHeader>
                    <CardTitle>{candidate.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {candidate.party} - {candidate.position}
                    </p>
                    <Button
                      onClick={() => voteMutation.mutate(candidate.id)}
                      className="w-full"
                      disabled={voteMutation.isPending}
                    >
                      {voteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording Vote...
                        </>
                      ) : (
                        "Vote"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md mx-auto backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Voter Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={aadharId}
              onChange={(e) => setAadharId(e.target.value)}
              placeholder="Enter your Aadhar ID"
            />
            <Button 
              onClick={verifyVoter} 
              className="w-full"
              disabled={isLoading || !aadharId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}