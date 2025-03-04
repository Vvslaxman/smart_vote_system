import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const voters = pgTable("voters", {
  id: serial("id").primaryKey(),
  aadharId: text("aadhar_id").notNull().unique(),
  name: text("name").notNull(),
  faceDescriptors: text("face_descriptors").array().notNull(),  // Store array of face descriptors
  hasVoted: boolean("has_voted").default(false).notNull(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  party: text("party").notNull(),
  position: text("position").notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  voterId: integer("voter_id").references(() => voters.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Create a schema that requires faceDescriptors
export const insertVoterSchema = createInsertSchema(voters)
  .omit({ id: true, hasVoted: true })
  .extend({
    faceDescriptors: z.array(z.string()).min(1, "At least one face descriptor is required")
  });
export const insertCandidateSchema = createInsertSchema(candidates).omit({ id: true });

export type InsertVoter = z.infer<typeof insertVoterSchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Voter = typeof voters.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Vote = typeof votes.$inferSelect;