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
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";

export default function Vote() {
  const [aadharId, setAadharId] = useState("");
  const [voter, setVoter] = useState<Voter>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
      setLocation("/results");
    },
  });

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVerifying(false);
  }

  async function verifyVoter() {
    try {
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

      // Check if voter has face data
      const hasFaceData = voterData.faceDescriptors && voterData.faceDescriptors.length > 0;

      if (hasFaceData) {
        // Start face verification process
        setVoter(voterData);
        setIsVerifying(true);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = resolve;
            }
          });
        }
      } else {
        // Proceed without face verification
        setVoter(voterData);
        toast({
          title: "Voter Verified",
          description: "You can now proceed to vote.",
        });
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

  const [verificationInProgress, setVerificationInProgress] = useState(false);
  const [verificationConfidence, setVerificationConfidence] = useState<number | null>(null);

  async function verifyFace() {
    try {
      if (!videoRef.current || !voter) return;
      setVerificationInProgress(true);

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);
      const img = new Image();
      img.src = canvas.toDataURL("image/jpeg");
      await new Promise(resolve => img.onload = resolve);

      const liveDescriptor = await getFaceDescriptor(img);
      const storedDescriptors = voter.faceDescriptors.map(d => {
        try {
          // Handle both string and array formats
          const descriptorData = Array.isArray(d) ? d : JSON.parse(String(d));
          return new Float32Array(descriptorData);
        } catch (e) {
          console.warn("Error parsing descriptor:", e);
          return new Float32Array(128);
        }
      });

      const confidence = calculateMatchConfidence(liveDescriptor, storedDescriptors);

      if (compareFaces(liveDescriptor, storedDescriptors)) {
        stopCamera();
        toast({
          title: "Identity Verified",
          description: `Match confidence: ${confidence.toFixed(1)}%. You can now cast your vote.`,
        });
      } else {
        throw new Error(`Face verification failed. Confidence: ${confidence.toFixed(1)}%`);
      }
    } catch (err) {
      console.error('Face verification error:', err);
      toast({
        variant: "destructive",
        title: "Face Verification Failed",
        description: "Please ensure good lighting and that your face is clearly visible.",
      });
    } finally {
      setVerificationInProgress(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      {isVerifying ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Face Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            {verificationConfidence !== null && (
              <div className="mb-4 text-center">
                <p className="text-sm mb-1">
                  Face Match Confidence: <span className="font-bold">{verificationConfidence.toFixed(1)}%</span>
                </p>
                <Progress 
                  value={verificationConfidence} 
                  className="h-2"
                  color={verificationConfidence > 70 ? "bg-green-500" : "bg-red-500"} 
                />
              </div>
            )}
            <Button
              onClick={verifyFace}
              className="w-full"
              disabled={isLoading || verificationInProgress}
            >
              {isLoading || verificationInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {verificationInProgress ? "Analyzing Face..." : "Verifying..."}
                </>
              ) : (
                "Verify Face"
              )}
            </Button>
            <Button
              onClick={() => {
                stopCamera();
                setIsVerifying(false);
              }}
              variant="secondary"
              className="w-full"
            >
              Skip Verification
            </Button>
          </CardContent>
        </Card>
      ) : voter && !voter.hasVoted ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Cast Your Vote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {candidates?.map((candidate) => (
                <Card key={candidate.id}>
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
        <Card className="max-w-md mx-auto">
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
              disabled={!aadharId}
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
function calculateMatchConfidence(liveDescriptor: Float32Array, storedDescriptors: Float32Array[]) {
  const distances = storedDescriptors.map(storedDescriptor => {
    let sum = 0;
    for (let i = 0; i < liveDescriptor.length; i++) {
      const diff = liveDescriptor[i] - storedDescriptor[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  });

  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const confidence = ((maxDistance - minDistance) / maxDistance) * 100;

  return confidence;
}
