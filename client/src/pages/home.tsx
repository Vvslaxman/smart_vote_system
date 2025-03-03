import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Secure Electronic Voting System</h1>
          <p className="text-muted-foreground">
            Vote securely using facial recognition technology
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>New Voter?</CardTitle>
              <CardDescription>Register to participate in the election</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/register">
                <Button className="w-full">Register Now</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ready to Vote?</CardTitle>
              <CardDescription>Cast your vote using facial verification</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/vote">
                <Button className="w-full" variant="secondary">
                  Vote Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Results</CardTitle>
            <CardDescription>View the current election results</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/results">
              <Button className="w-full" variant="outline">
                View Results
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
