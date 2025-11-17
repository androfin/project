import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, TrendingUp, Award, BookOpen, Shield, UserPlus, Loader2, Trash2 } from "lucide-react";
import type { User, LabProgress, QuizAttempt } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserProgressData {
  user: User;
  labProgress: LabProgress[];
  quizAttempts: QuizAttempt[];
  totalScore: number;
}

const createStudentSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const { data: students, isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
    enabled: isAdmin,
  });

  const { data: allProgress, isLoading: progressLoading } = useQuery<UserProgressData[]>({
    queryKey: ["/api/admin/progress"],
    enabled: isAdmin,
  });

  const createStudentForm = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: CreateStudentFormData) => {
      return await apiRequest("POST", "/api/auth/signup", {
        ...data,
        role: "student",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      toast({
        title: "Student created",
        description: "The student account has been created successfully.",
      });
      createStudentForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create student",
        description: error.message || "An error occurred while creating the student account.",
      });
    },
  });

  const onCreateStudent = async (data: CreateStudentFormData) => {
    setIsCreating(true);
    try {
      await createStudentMutation.mutateAsync(data);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/progress"] });
      toast({
        title: "User deleted",
        description: "The user account has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete user",
        description: error.message || "An error occurred while deleting the user account.",
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (studentsLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const totalStudents = students?.length || 0;
  const studentsWithProgress = allProgress?.filter(p => p.totalScore > 0).length || 0;
  const totalLabs = allProgress?.reduce((sum, p) => sum + p.labProgress.filter(l => l.completed).length, 0) || 0;
  const totalQuizzes = allProgress?.reduce((sum, p) => sum + p.quizAttempts.length, 0) || 0;

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage students, view progress, and monitor course completion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-students">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {studentsWithProgress} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Labs Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-labs">{totalLabs}</div>
              <p className="text-xs text-muted-foreground">
                Across all students
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-quizzes">{totalQuizzes}</div>
              <p className="text-xs text-muted-foreground">
                Total submissions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalStudents > 0
                  ? Math.round(
                      (allProgress?.reduce((sum, p) => sum + p.totalScore, 0) || 0) /
                        totalStudents
                    )
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Average score
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students" data-testid="tab-students">
              Students
            </TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">
              Detailed Progress
            </TabsTrigger>
            <TabsTrigger value="create" data-testid="tab-create-student">
              Create Student
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Students</CardTitle>
                <CardDescription>
                  Overview of all registered students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {students && students.length > 0 ? (
                  <div className="space-y-3">
                    {students.map((student) => {
                      const studentProgress = allProgress?.find(p => p.user.id === student.id);

                      return (
                        <div
                          key={student.id}
                          className="flex items-center gap-4 p-3 rounded-lg border border-border hover-elevate"
                          data-testid={`card-student-${student.id}`}
                        >
                          <Avatar>
                            <AvatarImage src={student.profileImageUrl || undefined} />
                            <AvatarFallback>{getInitials(student)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">
                              {student.firstName && student.lastName
                                ? `${student.firstName} ${student.lastName}`
                                : student.email}
                            </h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {student.email}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {studentProgress?.totalScore || 0} pts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {studentProgress?.labProgress.filter(l => l.completed).length || 0} labs
                              </p>
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {student.role}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  data-testid={`button-delete-user-${student.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{" "}
                                    {student.firstName && student.lastName
                                      ? `${student.firstName} ${student.lastName}`
                                      : student.email}
                                    ? This action cannot be undone. All progress and data for this user will be permanently deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(student.id)}
                                    data-testid="button-confirm-delete"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No students registered yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Progress Details</CardTitle>
                <CardDescription>
                  Detailed view of each student's completion and scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allProgress && allProgress.length > 0 ? (
                  <div className="space-y-4">
                    {allProgress.map((data) => (
                      <Card key={data.user.id} className="border border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarImage src={data.user.profileImageUrl || undefined} />
                              <AvatarFallback>{getInitials(data.user)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">
                                {data.user.firstName && data.user.lastName
                                  ? `${data.user.firstName} ${data.user.lastName}`
                                  : data.user.email}
                              </h4>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Score</p>
                                  <p className="text-2xl font-bold">{data.totalScore}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Labs Completed</p>
                                  <p className="text-2xl font-bold">
                                    {data.labProgress.filter(l => l.completed).length}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Quiz Attempts</p>
                                  <p className="text-2xl font-bold">{data.quizAttempts.length}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No progress data available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <CardTitle>Create New Student</CardTitle>
                </div>
                <CardDescription>
                  Add a new student account to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createStudentForm}>
                  <form onSubmit={createStudentForm.handleSubmit(onCreateStudent)} className="space-y-4 max-w-md">
                    <FormField
                      control={createStudentForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="student@example.com"
                              data-testid="input-student-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-student-email" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createStudentForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Minimum 6 characters"
                              data-testid="input-student-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-student-password" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createStudentForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              data-testid="input-student-firstname"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-student-firstname" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createStudentForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              data-testid="input-student-lastname"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-student-lastname" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isCreating}
                      data-testid="button-create-student"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Student
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
