import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCandidateSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import type { Candidate } from "@shared/schema";

export default function AdminCandidates() {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      name: "",
      party: "",
      position: "",
    },
  });

  const { data: candidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/candidates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      form.reset();
      toast({
        title: "Candidate Added",
        description: "The candidate has been successfully added.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate Removed",
        description: "The candidate has been successfully removed.",
      });
    },
  });

  async function onSubmit(data: any) {
    try {
      await createMutation.mutateAsync(data);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add candidate. Please try again.",
      });
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="party"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  Add Candidate
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-lg bg-card/50">
          <CardHeader>
            <CardTitle>Current Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {candidates?.map((candidate) => (
                <Card key={candidate.id} className="backdrop-blur-sm bg-background/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <h3 className="font-medium">{candidate.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {candidate.party} - {candidate.position}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMutation.mutate(candidate.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
