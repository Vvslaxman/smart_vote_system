import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVoterSchema, insertCandidateSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Voter routes
  app.post("/api/voters", async (req, res) => {
    try {
      const voter = insertVoterSchema.parse(req.body);
      
      // Additional validation for face descriptors
      if (!voter.faceDescriptors || voter.faceDescriptors.length === 0) {
        return res.status(400).json({ 
          error: "Invalid voter data",
          details: "Face descriptors are required for registration" 
        });
      }
      
      const created = await storage.createVoter(voter);
      res.json(created);
    } catch (error) {
      console.error("Voter registration error:", error);
      res.status(400).json({ 
        error: "Invalid voter data",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/voters/:aadharId", async (req, res) => {
    const voter = await storage.getVoterByAadhar(req.params.aadharId);
    if (!voter) {
      res.status(404).json({ error: "Voter not found" });
      return;
    }
    res.json(voter);
  });

  // Candidate routes
  app.post("/api/candidates", async (req, res) => {
    try {
      const candidate = insertCandidateSchema.parse(req.body);
      const created = await storage.createCandidate(candidate);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid candidate data" });
    }
  });

  app.get("/api/candidates", async (_req, res) => {
    const candidates = await storage.getCandidates();
    res.json(candidates);
  });

  app.delete("/api/candidates/:id", async (req, res) => {
    await storage.deleteCandidate(Number(req.params.id));
    res.status(204).send();
  });

  // Vote routes
  app.post("/api/votes", async (req, res) => {
    const { voterId, candidateId } = req.body;
    try {
      const vote = await storage.createVote(voterId, candidateId);
      await storage.updateVoterStatus(voterId, true);
      res.json(vote);
    } catch (error) {
      res.status(400).json({ error: "Invalid vote" });
    }
  });

  app.get("/api/results", async (_req, res) => {
    const results = await storage.getResults();
    res.json(results);
  });

  const httpServer = createServer(app);
  return httpServer;
}
