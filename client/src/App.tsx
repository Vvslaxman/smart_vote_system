import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Nav } from "@/components/nav";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Register from "@/pages/register";
import Vote from "@/pages/vote";
import Results from "@/pages/results";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCandidates from "@/pages/admin/candidates";
import { ModelChecker } from './components/ModelChecker'; // Added import

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/vote" component={Vote} />
      <Route path="/results" component={Results} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Nav />
      <main className="pt-16 min-h-screen bg-background">
        <Router />
        <ModelChecker /> 
      </main>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;