// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model should define a Mongo collection accessor, an insert schema, and types:
//
//   import { z } from "zod/v4";
//   import { db } from "../client";
//   import { nextSequence } from "../counters";
//
//   export interface Post { id: number; title: string; createdAt: Date }
//   export const postsCollection = () => db.collection<Post>("posts");
//   export const insertPostSchema = z.object({ title: z.string() });
//   export type InsertPost = z.infer<typeof insertPostSchema>;

export * from "./asoebi";
export * from "./auth";
export * from "./campaigns";
export * from "./rsvp-form-copy";
export * from "./spotify";
export * from "./uploads";
