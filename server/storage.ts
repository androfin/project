import {
  topics,
  users,
  labExercises,
  quizQuestions,
  readConfirmations,
  labProgress,
  labAttempts,
  quizAttempts,
  type User,
  type UpsertUser,
  type Topic,
  type InsertTopic,
  type ReadConfirmation,
  type InsertReadConfirmation,
  type LabExercise,
  type InsertLabExercise,
  type QuizQuestion,
  type InsertQuizQuestion,
  type LabProgress,
  type InsertLabProgress,
  type LabAttempt,
  type InsertLabAttempt,
  type QuizAttempt,
  type InsertQuizAttempt,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // ========== USER OPERATIONS ==========
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'> & { passwordHash: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUserProfile(userId: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'username' | 'profileImageUrl'>>): Promise<User>;
  updateUserEmail(userId: string, email: string): Promise<User>;
  getAllStudents(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;
  
  // ========== TOPIC OPERATIONS ==========
  getTopic(topicId: number): Promise<Topic | undefined>;
  getAllTopics(): Promise<Topic[]>;
  updateTopicPPT(topicId: number, pptUrl: string, pptFileName: string): Promise<Topic>;
  getTopicsByIds(topicIds: number[]): Promise<Topic[]>;
  
  // ========== READ CONFIRMATIONS ==========
  markTopicAsRead(userId: string, topicId: number): Promise<ReadConfirmation>;
  getTopicReadStatus(userId: string, topicId: number): Promise<ReadConfirmation | undefined>;
  getUserReadConfirmations(userId: string): Promise<ReadConfirmation[]>;
  getTopicsReadStatus(userId: string, topicIds: number[]): Promise<ReadConfirmation[]>;
  
  // ========== LAB OPERATIONS ==========
  getLabExercise(labId: string): Promise<LabExercise | undefined>;
  getLabByTopic(topicId: number): Promise<LabExercise | undefined>;
  getAllLabExercises(): Promise<LabExercise[]>;
  getLabsByTopicIds(topicIds: number[]): Promise<LabExercise[]>;
  
  // ========== QUIZ OPERATIONS ==========
  getQuizQuestion(questionId: string): Promise<QuizQuestion | undefined>;
  getQuizQuestionsByTopic(topicId: number): Promise<QuizQuestion[]>;
  getQuizQuestionsByTopicIds(topicIds: number[]): Promise<QuizQuestion[]>;
  
  // ========== LAB PROGRESS ==========
  getLabProgress(userId: string, labId: string): Promise<LabProgress | undefined>;
  getUserLabProgress(userId: string): Promise<LabProgress[]>;
  upsertLabProgress(progress: InsertLabProgress): Promise<LabProgress>;
  getLabProgressByLabIds(userId: string, labIds: string[]): Promise<LabProgress[]>;
  
  // ========== LAB ATTEMPTS ==========
  createLabAttempt(attempt: Omit<InsertLabAttempt, 'attemptNumber'>): Promise<number>;
  getLabAttemptsByUserAndLab(userId: string, labId: string): Promise<LabAttempt[]>;
  getUserLabAttempts(userId: string): Promise<LabAttempt[]>;
  getRecentLabAttempts(limit?: number): Promise<LabAttempt[]>;
  
  // ========== QUIZ ATTEMPTS ==========
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getUserQuizAttempts(userId: string, topicId?: number): Promise<QuizAttempt[]>;
  getTopicQuizAttempts(topicId: number): Promise<QuizAttempt[]>;
  getBestQuizAttempt(userId: string, topicId: number): Promise<QuizAttempt | undefined>;
  getRecentQuizAttempts(limit?: number): Promise<QuizAttempt[]>;
  
  // ========== STATISTICS AND ANALYTICS ==========
  getUserProgressSummary(userId: string): Promise<{
    topicsRead: number;
    labsCompleted: number;
    totalQuizzes: number;
    averageQuizScore: number;
  }>;
  getSystemStatistics(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalTopics: number;
    totalLabs: number;
    totalQuizAttempts: number;
    totalLabAttempts: number;
  }>;
}

export class MemStorage implements IStorage {
  // ========== USER OPERATIONS ==========
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: Omit<UpsertUser, 'id'> & { passwordHash: string }): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upsertedUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedUser;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'username' | 'profileImageUrl'>>
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserEmail(userId: string, email: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ email, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getAllStudents(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, 'student'));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  // ========== TOPIC OPERATIONS ==========

  async getTopic(topicId: number): Promise<Topic | undefined> {
    const result = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
    return result[0];
  }

  async getAllTopics(): Promise<Topic[]> {
    return db.select().from(topics).orderBy(topics.orderIndex);
  }

  async updateTopicPPT(topicId: number, pptUrl: string, pptFileName: string): Promise<Topic> {
    const [updatedTopic] = await db
      .update(topics)
      .set({ pptUrl, pptFileName, updatedAt: new Date() })
      .where(eq(topics.id, topicId))
      .returning();
    return updatedTopic;
  }

  async getTopicsByIds(topicIds: number[]): Promise<Topic[]> {
    if (topicIds.length === 0) return [];
    return db.select().from(topics).where(inArray(topics.id, topicIds)).orderBy(topics.orderIndex);
  }

  // ========== READ CONFIRMATIONS ==========

  async markTopicAsRead(userId: string, topicId: number): Promise<ReadConfirmation> {
    const [confirmation] = await db
      .insert(readConfirmations)
      .values({ userId, topicId })
      .onConflictDoUpdate({
        target: [readConfirmations.userId, readConfirmations.topicId],
        set: { readAt: new Date() },
      })
      .returning();
    return confirmation;
  }

  async getTopicReadStatus(userId: string, topicId: number): Promise<ReadConfirmation | undefined> {
    const result = await db
      .select()
      .from(readConfirmations)
      .where(and(eq(readConfirmations.userId, userId), eq(readConfirmations.topicId, topicId)))
      .limit(1);
    return result[0];
  }

  async getUserReadConfirmations(userId: string): Promise<ReadConfirmation[]> {
    return db.select().from(readConfirmations).where(eq(readConfirmations.userId, userId));
  }

  async getTopicsReadStatus(userId: string, topicIds: number[]): Promise<ReadConfirmation[]> {
    if (topicIds.length === 0) return [];
    return db
      .select()
      .from(readConfirmations)
      .where(and(eq(readConfirmations.userId, userId), inArray(readConfirmations.topicId, topicIds)));
  }

  // ========== LAB OPERATIONS ==========

  async getLabExercise(labId: string): Promise<LabExercise | undefined> {
    const result = await db.select().from(labExercises).where(eq(labExercises.id, labId)).limit(1);
    return result[0];
  }

  async getLabByTopic(topicId: number): Promise<LabExercise | undefined> {
    const result = await db.select().from(labExercises).where(eq(labExercises.topicId, topicId)).limit(1);
    return result[0];
  }

  async getAllLabExercises(): Promise<LabExercise[]> {
    return db.select().from(labExercises);
  }

  async getLabsByTopicIds(topicIds: number[]): Promise<LabExercise[]> {
    if (topicIds.length === 0) return [];
    return db.select().from(labExercises).where(inArray(labExercises.topicId, topicIds));
  }

  // ========== QUIZ OPERATIONS ==========

  async getQuizQuestion(questionId: string): Promise<QuizQuestion | undefined> {
    const result = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);
    return result[0];
  }

  async getQuizQuestionsByTopic(topicId: number): Promise<QuizQuestion[]> {
    return db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.topicId, topicId))
      .orderBy(quizQuestions.orderIndex);
  }

  async getQuizQuestionsByTopicIds(topicIds: number[]): Promise<QuizQuestion[]> {
    if (topicIds.length === 0) return [];
    return db
      .select()
      .from(quizQuestions)
      .where(inArray(quizQuestions.topicId, topicIds))
      .orderBy(quizQuestions.topicId, quizQuestions.orderIndex);
  }

  // ========== LAB PROGRESS ==========

  async getLabProgress(userId: string, labId: string): Promise<LabProgress | undefined> {
    const result = await db
      .select()
      .from(labProgress)
      .where(and(eq(labProgress.userId, userId), eq(labProgress.labId, labId)))
      .limit(1);
    return result[0];
  }

  async getUserLabProgress(userId: string): Promise<LabProgress[]> {
    return db.select().from(labProgress).where(eq(labProgress.userId, userId));
  }

  async upsertLabProgress(progress: InsertLabProgress): Promise<LabProgress> {
    const [upserted] = await db
      .insert(labProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [labProgress.userId, labProgress.labId],
        set: {
          completed: progress.completed,
          score: progress.score,
          submittedCode: progress.submittedCode,
          completedAt: progress.completedAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upserted;
  }

  async getLabProgressByLabIds(userId: string, labIds: string[]): Promise<LabProgress[]> {
    if (labIds.length === 0) return [];
    return db
      .select()
      .from(labProgress)
      .where(and(eq(labProgress.userId, userId), inArray(labProgress.labId, labIds)));
  }

  // ========== LAB ATTEMPTS ==========

  async createLabAttempt(attempt: Omit<InsertLabAttempt, 'attemptNumber'>): Promise<number> {
    const maxRetries = 5;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        return await db.transaction(async (tx) => {
          const result = await tx
            .select({ maxAttempt: sql<number>`COALESCE(MAX(${labAttempts.attemptNumber}), 0)` })
            .from(labAttempts)
            .where(and(eq(labAttempts.userId, attempt.userId), eq(labAttempts.labId, attempt.labId)));
          
          const nextAttemptNumber = (result[0]?.maxAttempt ?? 0) + 1;
          
          await tx.insert(labAttempts).values({
            ...attempt,
            attemptNumber: nextAttemptNumber,
          });
          
          return nextAttemptNumber;
        });
      } catch (error: any) {
        if (error.code === '23505' && retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 10 * (retry + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Failed to create lab attempt after maximum retries');
  }

  async getLabAttemptsByUserAndLab(userId: string, labId: string): Promise<LabAttempt[]> {
    return db
      .select()
      .from(labAttempts)
      .where(and(eq(labAttempts.userId, userId), eq(labAttempts.labId, labId)))
      .orderBy(labAttempts.attemptNumber);
  }

  async getUserLabAttempts(userId: string): Promise<LabAttempt[]> {
    return db.select().from(labAttempts).where(eq(labAttempts.userId, userId)).orderBy(desc(labAttempts.attemptedAt));
  }

  async getRecentLabAttempts(limit: number = 10): Promise<LabAttempt[]> {
    return db
      .select()
      .from(labAttempts)
      .orderBy(desc(labAttempts.attemptedAt))
      .limit(limit);
  }

  // ========== QUIZ ATTEMPTS ==========

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getUserQuizAttempts(userId: string, topicId?: number): Promise<QuizAttempt[]> {
    if (topicId !== undefined) {
      return db
        .select()
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.topicId, topicId)))
        .orderBy(desc(quizAttempts.completedAt));
    }
    return db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async getTopicQuizAttempts(topicId: number): Promise<QuizAttempt[]> {
    return db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.topicId, topicId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async getBestQuizAttempt(userId: string, topicId: number): Promise<QuizAttempt | undefined> {
    const result = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.topicId, topicId)))
      .orderBy(desc(quizAttempts.score))
      .limit(1);
    return result[0];
  }

  async getRecentQuizAttempts(limit: number = 10): Promise<QuizAttempt[]> {
    return db
      .select()
      .from(quizAttempts)
      .orderBy(desc(quizAttempts.completedAt))
      .limit(limit);
  }

  // ========== STATISTICS AND ANALYTICS ==========

  async getUserProgressSummary(userId: string): Promise<{
    topicsRead: number;
    labsCompleted: number;
    totalQuizzes: number;
    averageQuizScore: number;
  }> {
    const [readConfirmations, labProgress, quizAttempts] = await Promise.all([
      this.getUserReadConfirmations(userId),
      this.getUserLabProgress(userId),
      this.getUserQuizAttempts(userId)
    ]);

    const topicsRead = readConfirmations.length;
    const labsCompleted = labProgress.filter(lab => lab.completed).length;
    const totalQuizzes = quizAttempts.length;
    
    const averageQuizScore = quizAttempts.length > 0 
      ? quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length
      : 0;

    return {
      topicsRead,
      labsCompleted,
      totalQuizzes,
      averageQuizScore: Math.round(averageQuizScore * 100) / 100
    };
  }

  async getSystemStatistics(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalTopics: number;
    totalLabs: number;
    totalQuizAttempts: number;
    totalLabAttempts: number;
  }> {
    const [
      usersResult,
      studentsResult,
      topicsResult,
      labsResult,
      quizAttemptsResult,
      labAttemptsResult
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'student')),
      db.select({ count: sql<number>`count(*)` }).from(topics),
      db.select({ count: sql<number>`count(*)` }).from(labExercises),
      db.select({ count: sql<number>`count(*)` }).from(quizAttempts),
      db.select({ count: sql<number>`count(*)` }).from(labAttempts)
    ]);

    return {
      totalUsers: usersResult[0]?.count || 0,
      totalStudents: studentsResult[0]?.count || 0,
      totalTopics: topicsResult[0]?.count || 0,
      totalLabs: labsResult[0]?.count || 0,
      totalQuizAttempts: quizAttemptsResult[0]?.count || 0,
      totalLabAttempts: labAttemptsResult[0]?.count || 0
    };
  }
}

export const storage = new MemStorage();
