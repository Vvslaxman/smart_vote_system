import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { Candidate } from "@shared/schema";

export default function Results() {
  const [, setLocation] = useLocation();

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: results } = useQuery<{ candidateId: number; votes: number }[]>({
    queryKey: ["/api/results"],
  });

  const totalVotes = results?.reduce((sum, result) => sum + result.votes, 0) || 0;

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Election Results</CardTitle>
          <Button
            variant="outline"
            onClick={() => setLocation("/vote")}
          >
            Back to Voting
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {candidates?.map((candidate) => {
              const voteCount = results?.find(r => r.candidateId === candidate.id)?.votes || 0;
              const percentage = totalVotes ? ((voteCount / totalVotes) * 100).toFixed(1) : "0";

              return (
                <div key={candidate.id} className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{candidate.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.party} - {candidate.position}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold">{voteCount}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        votes ({percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t">
              <p className="text-center text-muted-foreground">
                Total Votes Cast: <span className="font-bold">{totalVotes}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}