import { type Voter, type InsertVoter, type Candidate, type InsertCandidate, type Vote } from "@shared/schema";
import { db } from "./db";
import { voters, candidates, votes } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Voter operations
  createVoter(voter: InsertVoter): Promise<Voter>;
  getVoterByAadhar(aadharId: string): Promise<Voter | undefined>;
  updateVoterStatus(id: number, hasVoted: boolean): Promise<void>;

  // Candidate operations
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidates(): Promise<Candidate[]>;
  deleteCandidate(id: number): Promise<void>;

  // Vote operations
  createVote(voterId: number, candidateId: number): Promise<Vote>;
  getResults(): Promise<{ candidateId: number; votes: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async createVoter(insertVoter: InsertVoter): Promise<Voter> {
    const [voter] = await db.insert(voters).values(insertVoter).returning();
    return voter;
  }

  async getVoterByAadhar(aadharId: string): Promise<Voter | undefined> {
    const [voter] = await db.select().from(voters).where(eq(voters.aadharId, aadharId));
    return voter;
  }

  async updateVoterStatus(id: number, hasVoted: boolean): Promise<void> {
    await db.update(voters)
      .set({ hasVoted })
      .where(eq(voters.id, id));
  }

  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db.insert(candidates).values(insertCandidate).returning();
    return candidate;
  }

  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates);
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async createVote(voterId: number, candidateId: number): Promise<Vote> {
    const [vote] = await db.insert(votes)
      .values({ voterId, candidateId })
      .returning();
    return vote;
  }

  async getResults(): Promise<{ candidateId: number; votes: number }[]> {
    // Get vote counts for each candidate using SQL
    const results = await db.execute<{ candidate_id: number; votes: string }>(
      sql`SELECT candidate_id, COUNT(*) as votes 
          FROM votes 
          GROUP BY candidate_id`
    );

    return results.rows.map(row => ({
      candidateId: row.candidate_id,
      votes: parseInt(row.votes)
    }));
  }
}

export const storage = new DatabaseStorage();