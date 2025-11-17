import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ AUTHENTICATION & USERS ============

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table with roles and password
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"), // nullable for migration from Replit Auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  role: varchar("role").notNull().default("student"), // student or admin
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// ============ COURSE STRUCTURE ============

// Main topics (6 total) - each has 1 PPT, 1 Quiz, 1 Lab
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(), // 1-6
  title: text("title").notNull(),
  duration: varchar("duration").notNull(), // e.g., "2h"
  description: text("description"),
  subparts: jsonb("subparts").$type<string[]>().notNull(), // List of subpart descriptions (e.g., "1.1.1 Assets, attackers...")
  pptUrl: text("ppt_url"), // URL to uploaded PowerPoint file
  pptFileName: text("ppt_file_name"), // Original filename
  learningOutcomes: jsonb("learning_outcomes").$type<string[]>().notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Read confirmations for PPT presentations (topic-level)
export const readConfirmations = pgTable("read_confirmations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_read_confirmations_user_id").on(table.userId),
  index("idx_read_confirmations_topic_id").on(table.topicId),
  uniqueIndex("idx_read_confirmations_unique").on(table.userId, table.topicId),
]);

export type ReadConfirmation = typeof readConfirmations.$inferSelect;
export type InsertReadConfirmation = typeof readConfirmations.$inferInsert;

export const insertReadConfirmationSchema = createInsertSchema(readConfirmations).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// ============ LAB EXERCISES ============

// One lab per topic (6 total)
export const labExercises = pgTable("lab_exercises", {
  id: varchar("id").primaryKey(),
  topicId: integer("topic_id").notNull().unique().references(() => topics.id, { onDelete: "cascade" }), // 1-to-1 relationship
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedTime: integer("estimated_time").notNull(), // in minutes
  instructions: text("instructions").notNull(),
  vulnerableCode: jsonb("vulnerable_code").$type<{
    filename: string;
    code: string;
    language: string;
  }[]>().notNull(),
  correctCode: jsonb("correct_code").$type<{
    filename: string;
    code: string;
    language: string;
  }[]>(), // Correct solution (admin-only view)
  validationCriteria: jsonb("validation_criteria").$type<{
    header: string;
    description: string;
    expectedPattern?: string;
    required: boolean;
  }[]>().notNull(),
  learningOutcomes: jsonb("learning_outcomes").$type<string[]>().notNull(),
  hints: jsonb("hints").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_lab_exercises_topic_id").on(table.topicId),
]);

export type LabExercise = typeof labExercises.$inferSelect;
export type InsertLabExercise = typeof labExercises.$inferInsert;

// ============ QUIZZES ============

// 25 questions per topic (6 topics × 25 questions = 150 total)
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  type: varchar("type").notNull(), // 'multiple_choice' or 'true_false'
  options: jsonb("options").$type<{
    id: string;
    text: string;
  }[]>().notNull(),
  correctAnswers: jsonb("correct_answers").$type<string[]>().notNull(),
  explanation: text("explanation").notNull(),
  category: varchar("category").notNull(),
  orderIndex: integer("order_index").notNull(), // 1-25 per topic
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_quiz_questions_topic_id").on(table.topicId),
]);

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;


// ============ STUDENT PROGRESS ============

// Lab progress tracking (latest/best result per user per lab)
export const labProgress = pgTable("lab_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  labId: varchar("lab_id").notNull().references(() => labExercises.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  score: integer("score"), // 0-100
  submittedCode: text("submitted_code"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_lab_progress_user_id").on(table.userId),
  index("idx_lab_progress_lab_id").on(table.labId),
  uniqueIndex("idx_lab_progress_user_lab").on(table.userId, table.labId),
]);

export type LabProgress = typeof labProgress.$inferSelect;
export type InsertLabProgress = typeof labProgress.$inferInsert;

export const insertLabProgressSchema = createInsertSchema(labProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Lab attempts tracking (all validation attempts - both pass and fail)
export const labAttempts = pgTable("lab_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  labId: varchar("lab_id").notNull().references(() => labExercises.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  passed: boolean("passed").notNull().default(false),
  score: integer("score").notNull(), // 0-100
  submittedCode: text("submitted_code"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lab_attempts_user_id").on(table.userId),
  index("idx_lab_attempts_lab_id").on(table.labId),
  index("idx_lab_attempts_user_lab").on(table.userId, table.labId),
  uniqueIndex("idx_lab_attempts_unique_attempt").on(table.userId, table.labId, table.attemptNumber),
]);

export type LabAttempt = typeof labAttempts.$inferSelect;
export type InsertLabAttempt = typeof labAttempts.$inferInsert;

export const insertLabAttemptSchema = createInsertSchema(labAttempts).omit({
  id: true,
  createdAt: true,
  attemptedAt: true,
});

// Quiz attempts tracking (multiple attempts allowed per topic)
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull().default(1),
  answers: jsonb("answers").$type<Record<string, string[]>>().notNull(),
  score: integer("score").notNull(), // 0-100
  totalQuestions: integer("total_questions").notNull().default(25), // Always 25 questions
  completedAt: timestamp("completed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_quiz_attempts_user_id").on(table.userId),
  index("idx_quiz_attempts_topic_id").on(table.topicId),
  index("idx_quiz_attempts_user_topic").on(table.userId, table.topicId),
]);

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});


// ============ RELATIONS ============

export const topicsRelations = relations(topics, ({ many }) => ({
  labs: many(labExercises),
  quizzes: many(quizQuestions),
  quizAttempts: many(quizAttempts),
  readConfirmations: many(readConfirmations),
}));

export const labExercisesRelations = relations(labExercises, ({ one, many }) => ({
  topic: one(topics, {
    fields: [labExercises.topicId],
    references: [topics.id],
  }),
  progress: many(labProgress),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  topic: one(topics, {
    fields: [quizQuestions.topicId],
    references: [topics.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  labProgress: many(labProgress),
  quizAttempts: many(quizAttempts),
  readConfirmations: many(readConfirmations),
}));

export const labProgressRelations = relations(labProgress, ({ one }) => ({
  user: one(users, {
    fields: [labProgress.userId],
    references: [users.id],
  }),
  lab: one(labExercises, {
    fields: [labProgress.labId],
    references: [labExercises.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [quizAttempts.topicId],
    references: [topics.id],
  }),
}));

export const readConfirmationsRelations = relations(readConfirmations, ({ one }) => ({
  user: one(users, {
    fields: [readConfirmations.userId],
    references: [users.id],
  }),
  topic: one(topics, {
    fields: [readConfirmations.topicId],
    references: [topics.id],
  }),
}));

// ============ LEGACY TYPES (for compatibility) ============

export interface Session {
  id: string;
  number: number;
  title: string;
  duration: string;
  topics: string[];
  learningOutcomes: string[];
}

export interface StudentProgress {
  labId: string;
  completed: boolean;
  score?: number;
  submittedCode?: string;
  completedAt?: Date;
}

export interface QuizResult {
  quizId: string;
  answers: Record<string, string[]>;
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

export interface SecurityHeaderCheck {
  header: string;
  description: string;
  expectedPattern?: string;
  required: boolean;
}
