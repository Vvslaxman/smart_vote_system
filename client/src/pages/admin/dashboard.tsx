import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCheck, Users, Vote } from "lucide-react";
import type { Voter, Candidate } from "@shared/schema";

export default function AdminDashboard() {
  const { data: voters } = useQuery<Voter[]>({
    queryKey: ["/api/voters"],
  });

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: results } = useQuery<{ candidateId: number; votes: number }[]>({
    queryKey: ["/api/results"],
  });

  const totalVoters = voters?.length || 0;
  const totalVoted = voters?.filter(v => v.hasVoted).length || 0;
  const votingPercentage = totalVoters ? ((totalVoted / totalVoters) * 100).toFixed(1) : "0";

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/admin/candidates">
          <Button>Manage Candidates</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVoters}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votes Cast</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVoted}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voting Percentage</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{votingPercentage}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Live Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates?.map((candidate) => {
                const voteCount = results?.find(r => r.candidateId === candidate.id)?.votes || 0;
                const percentage = totalVoted ? ((voteCount / totalVoted) * 100).toFixed(1) : "0";
                
                return (
                  <div key={candidate.id} className="space-y-2">
                    <div className="flex justify-between">
                      <span>{candidate.name}</span>
                      <span>{voteCount} votes ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
