import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { insertLabProgressSchema, insertQuizAttemptSchema, insertReadConfirmationSchema, type User } from "@shared/schema";
import { ZodError } from "zod";
import { objectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // ============ FILE UPLOAD ROUTES ============
  
  // Configure multer for file uploads
  const upload = objectStorageService.getMulterConfig();

  // Endpoint to upload files directly (replaces signed URL approach)
  app.post("/api/objects/upload", isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = await objectStorageService.saveFile(req.file);
      
      res.json({ 
        success: true, 
        message: "File uploaded successfully",
        filePath: filePath,
        fileName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Endpoint to normalize file paths to stable /objects/ path
  app.post("/api/objects/normalize", isAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(url);
      res.json({ normalizedPath });
    } catch (error) {
      console.error("Error normalizing URL:", error);
      res.status(500).json({ error: "Failed to normalize URL" });
    }
  });

  // Endpoint to serve uploaded files (presentations, images, etc.)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const filePath = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(filePath, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Failed to serve file" });
    }
  });

  // Endpoint to list all uploaded files (admin only)
  app.get("/api/objects", isAdmin, async (req, res) => {
    try {
      const files = await objectStorageService.listFiles();
      const filesWithInfo = await Promise.all(
        files.map(async (filePath) => {
          const info = await objectStorageService.getFileInfo(filePath);
          return {
            path: filePath,
            ...info
          };
        })
      );
      res.json(filesWithInfo);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // Endpoint to delete uploaded files (admin only)
  app.delete("/api/objects/*", isAdmin, async (req, res) => {
    try {
      const objectPath = req.path.replace('/api/objects', '');
      await objectStorageService.deleteFile(objectPath);
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ============ TOPIC ROUTES ============
  
  app.get("/api/topics", async (_req, res) => {
    try {
      const topicsList = await storage.getAllTopics();
      res.json(topicsList);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ error: "Failed to fetch topics" });
    }
  });

  app.get("/api/topics/:topicId", async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(topic);
    } catch (error) {
      console.error("Error fetching topic:", error);
      res.status(500).json({ error: "Failed to fetch topic" });
    }
  });

  // Upload PPT for a topic (using direct file upload)
  app.post("/api/topics/:topicId/ppt", isAdmin, upload.single('pptFile'), async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No PPT file uploaded" });
      }

      // Save the file and get its path
      const pptUrl = await objectStorageService.saveFile(req.file);
      const pptFileName = req.file.originalname;

      const topic = await storage.updateTopicPPT(topicId, pptUrl, pptFileName);
      res.json(topic);
    } catch (error) {
      console.error("Error updating PPT:", error);
      res.status(500).json({ error: "Failed to update PPT" });
    }
  });

  app.delete("/api/topics/:topicId/ppt", isAdmin, async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }

      // Get the topic first to check if there's a PPT to delete
      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      // Delete the physical file if it exists
      if (topic.pptUrl && topic.pptUrl.startsWith('/objects/')) {
        try {
          await objectStorageService.deleteFile(topic.pptUrl);
        } catch (error) {
          // Log but continue even if file deletion fails
          console.log("Note: Could not delete physical PPT file:", error);
        }
      }

      // Update the database to remove PPT reference
      const updatedTopic = await storage.updateTopicPPT(topicId, "", "");
      res.json(updatedTopic);
    } catch (error) {
      console.error("Error deleting PPT:", error);
      res.status(500).json({ error: "Failed to delete PPT" });
    }
  });

  app.post("/api/topics/:topicId/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }
      const confirmation = await storage.markTopicAsRead(user.id, topicId);
      res.json(confirmation);
    } catch (error) {
      console.error("Error marking topic as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // ============ LAB ROUTES ============
  
  app.get("/api/labs", async (_req, res) => {
    try {
      const labs = await storage.getAllLabExercises();
      res.json(labs);
    } catch (error) {
      console.error("Error fetching labs:", error);
      res.status(500).json({ error: "Failed to fetch labs" });
    }
  });

  app.get("/api/topics/:topicId/lab", async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }
      const lab = await storage.getLabByTopic(topicId);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found for this topic" });
      }
      res.json(lab);
    } catch (error) {
      console.error("Error fetching lab:", error);
      res.status(500).json({ error: "Failed to fetch lab" });
    }
  });

  app.get("/api/labs/:labId", async (req, res) => {
    try {
      const lab = await storage.getLabExercise(req.params.labId);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found" });
      }
      res.json(lab);
    } catch (error) {
      console.error("Error fetching lab:", error);
      res.status(500).json({ error: "Failed to fetch lab" });
    }
  });

  app.post("/api/topics/:topicId/lab/validate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const topicId = parseInt(req.params.topicId);
      const { code } = req.body;
      
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }
      
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const lab = await storage.getLabByTopic(topicId);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found for this topic" });
      }

      const results = lab.validationCriteria.map(criterion => ({
        header: criterion.header,
        passed: criterion.expectedPattern 
          ? code.includes(criterion.expectedPattern)
          : true,
        description: criterion.description
      }));

      // Calculate score as percentage
      const score = Math.round((results.filter(r => r.passed).length / results.length) * 100);
      
      // Pass threshold is 75% or above
      const passed = score >= 75;

      // Save this attempt (pass or fail) to lab_attempts table with atomic attempt numbering
      const attemptNumber = await storage.createLabAttempt({
        userId: user.id,
        labId: lab.id,
        passed,
        score,
        submittedCode: code,
      });

      // Update lab_progress with latest result (only if better or first attempt)
      await storage.upsertLabProgress({
        userId: user.id,
        labId: lab.id,
        completed: passed,
        score,
        submittedCode: code,
        completedAt: passed ? new Date() : undefined,
      });

      res.json({
        passed,
        score,
        results,
        attemptNumber,
      });
    } catch (error) {
      console.error("Error validating lab:", error);
      res.status(500).json({ error: "Failed to validate lab" });
    }
  });

  app.post("/api/labs/:labId/validate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const lab = await storage.getLabExercise(req.params.labId);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found" });
      }

      const results = lab.validationCriteria.map(criterion => ({
        header: criterion.header,
        passed: criterion.expectedPattern 
          ? code.includes(criterion.expectedPattern)
          : true,
        description: criterion.description
      }));

      // Calculate score as percentage
      const score = Math.round((results.filter(r => r.passed).length / results.length) * 100);
      
      // Pass threshold is 75% or above
      const passed = score >= 75;

      await storage.upsertLabProgress({
        userId: user.id,
        labId: req.params.labId,
        completed: passed,
        score,
        submittedCode: code,
        completedAt: passed ? new Date() : undefined,
      });

      res.json({
        passed,
        score,
        results,
      });
    } catch (error) {
      console.error("Error validating lab:", error);
      res.status(500).json({ error: "Failed to validate lab" });
    }
  });

  // ============ QUIZ ROUTES ============
  
  app.get("/api/topics/:topicId/quizzes", async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }
      const questions = await storage.getQuizQuestionsByTopic(topicId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ error: "Failed to fetch quiz questions" });
    }
  });

  app.post("/api/topics/:topicId/quiz/submit", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: "Invalid topic ID" });
      }

      const { answers } = req.body;
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: "Answers object required" });
      }

      const questions = await storage.getQuizQuestionsByTopic(topicId);
      
      let correctCount = 0;
      const results: Record<string, { correct: boolean; correctAnswers: string[] }> = {};

      for (const question of questions) {
        const userAnswers = answers[question.id] || [];
        const isCorrect = 
          userAnswers.length === question.correctAnswers.length &&
          userAnswers.every((a: string) => question.correctAnswers.includes(a));
        
        if (isCorrect) correctCount++;
        results[question.id] = {
          correct: isCorrect,
          correctAnswers: question.correctAnswers
        };
      }

      const score = Math.round((correctCount / questions.length) * 100);

      const previousAttempts = await storage.getUserQuizAttempts(user.id, topicId);
      const attemptNumber = previousAttempts.length + 1;

      const attempt = await storage.createQuizAttempt({
        userId: user.id,
        topicId,
        attemptNumber,
        answers,
        score,
        totalQuestions: questions.length,
      });

      res.json({
        ...attempt,
        results,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  });

  // ============ PROGRESS ROUTES ============
  
  app.get("/api/progress/labs", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const progress = await storage.getUserLabProgress(user.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching lab progress:", error);
      res.status(500).json({ error: "Failed to fetch lab progress" });
    }
  });

  app.get("/api/progress/quizzes", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const attempts = await storage.getUserQuizAttempts(user.id);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ error: "Failed to fetch quiz attempts" });
    }
  });

  app.get("/api/progress/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const confirmations = await storage.getUserReadConfirmations(user.id);
      res.json(confirmations);
    } catch (error) {
      console.error("Error fetching read confirmations:", error);
      res.status(500).json({ error: "Failed to fetch read confirmations" });
    }
  });

  // ============ LEADERBOARD ROUTES ============

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      
      const leaderboardEntries = await Promise.all(
        students.map(async (student) => {
          const labProgress = await storage.getUserLabProgress(student.id);
          const quizAttempts = await storage.getUserQuizAttempts(student.id);
          
          const labsCompleted = labProgress.filter(lab => lab.completed).length;
          
          const totalQuizScore = quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
          
          const labWeight = 10;
          const totalScore = totalQuizScore + (labsCompleted * labWeight);
          
          const quizzesCompleted = quizAttempts.length;
          
          return {
            userId: student.id,
            user: student,
            totalScore,
            labsCompleted,
            quizzesCompleted,
          };
        })
      );
      
      leaderboardEntries.sort((a, b) => b.totalScore - a.totalScore);
      
      res.json(leaderboardEntries);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ============ ADMIN ROUTES ============

  app.get("/api/admin/students", isAdmin, async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/admin/progress", isAdmin, async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      
      const progressData = await Promise.all(
        students.map(async (student) => {
          const labProgress = await storage.getUserLabProgress(student.id);
          const quizAttempts = await storage.getUserQuizAttempts(student.id);
          
          return {
            userId: student.id,
            user: student,
            labProgress,
            quizAttempts,
          };
        })
      );
      
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching admin progress:", error);
      res.status(500).json({ error: "Failed to fetch progress data" });
    }
  });

  app.delete("/api/users/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = req.user as User;
      
      if (userId === currentUser.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.deleteUser(userId);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ============ USER MANAGEMENT ============

  app.get("/api/users/students", isAdmin, async (_req, res) => {
    try {
      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.patch("/api/user/email", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { newEmail } = req.body;

      if (!newEmail || typeof newEmail !== 'string') {
        return res.status(400).json({ error: "New email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const updatedUser = await storage.updateUserEmail(user.id, newEmail);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.delete("/api/user/account", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;

      if (user.role !== 'student') {
        return res.status(403).json({ error: "Only students can delete their own accounts" });
      }

      await storage.deleteUser(user.id);

      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
        }
      });

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // ============ HEALTH AND INFO ROUTES ============

  app.get("/api/info", async (_req, res) => {
    try {
      const topicsCount = (await storage.getAllTopics()).length;
      const labsCount = (await storage.getAllLabExercises()).length;
      const studentsCount = (await storage.getAllStudents()).length;
      
      res.json({
        topics: topicsCount,
        labs: labsCount,
        students: studentsCount,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching system info:", error);
      res.status(500).json({ error: "Failed to fetch system information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
