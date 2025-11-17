import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import { Clock, Target, BookOpen, FlaskConical, ChevronRight, Loader2, CheckCircle2, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import type { Session, Topic, LabExercise, LabProgress } from "@shared/schema";

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-chart-2/10 text-chart-2 border-chart-2/20";
    case "intermediate":
      return "bg-chart-4/10 text-chart-4 border-chart-4/20";
    case "advanced":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-secondary/10 text-secondary-foreground border-secondary/20";
  }
};

export default function Home() {
  const params = useParams();
  const sessionId = params.sessionId || "session-1";

  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
  });

  const { data: topics, isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/sessions", sessionId, "topics"],
  });

  const { data: labs, isLoading: labsLoading } = useQuery<LabExercise[]>({
    queryKey: ["/api/sessions", sessionId, "labs"],
  });

  const { data: labProgress = [] } = useQuery<LabProgress[]>({
    queryKey: ["/api/progress/labs"],
  });

  const progressMap = new Map(labProgress.map(p => [p.labId, p]));

  if (sessionLoading || topicsLoading || labsLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full max-w-2xl" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || !topics) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
            <CardDescription>Unable to load session information.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/sessions">Back to Sessions</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const completedLabs = labs?.filter(l => progressMap.get(l.id)?.completed).length || 0;
  const totalLabs = labs?.length || 0;
  const progressPercentage = totalLabs > 0 ? (completedLabs / totalLabs) * 100 : 0;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Session {session.number}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1.5">
              <Clock className="w-3 h-3" />
              {session.duration}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-session-title">{session.title}</h1>
          <p className="text-lg text-muted-foreground">{session.description}</p>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Your Progress</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {completedLabs} / {totalLabs} labs completed
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="h-2" data-testid="progress-session" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Topics & Labs</h2>
            <Button asChild>
              <Link href={`/quiz/${sessionId}`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Take Quiz
              </Link>
            </Button>
          </div>

          {topics.map((topic, topicIndex) => {
            const topicLabs = labs?.filter(l => l.topicId === topic.id) || [];
            
            return (
              <div key={topic.id} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Topic {topicIndex + 1}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold">{topic.title}</h3>
                  {topic.description && (
                    <p className="text-muted-foreground">{topic.description}</p>
                  )}
                </div>

                {topicLabs.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {topicLabs.map((lab) => {
                      const progress = progressMap.get(lab.id);
                      const completed = progress?.completed || false;

                      return (
                        <Card key={lab.id} className="hover-elevate" data-testid={`card-lab-${lab.id}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className={getDifficultyColor(lab.difficulty)}>
                                {lab.difficulty}
                              </Badge>
                              {completed && (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Complete
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg mt-2">{lab.title}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {lab.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-4 h-4" />
                                <span>{lab.points} pts</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>{lab.estimatedTime}</span>
                              </div>
                            </div>
                            {progress && !completed && (
                              <div className="space-y-1.5">
                                <Progress value={(progress.progress || 0)} className="h-1.5" />
                                <p className="text-xs text-muted-foreground">
                                  {progress.progress}% complete
                                </p>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter>
                            <Button asChild variant="outline" className="w-full" data-testid={`button-start-lab-${lab.id}`}>
                              <Link href={`/labs/${lab.id}`}>
                                {completed ? (
                                  <>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Review Lab
                                  </>
                                ) : (
                                  <>
                                    <FlaskConical className="w-4 h-4 mr-2" />
                                    {progress ? "Continue" : "Start"} Lab
                                  </>
                                )}
                                <ChevronRight className="w-4 h-4 ml-auto" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No labs available for this topic yet.
                    </CardContent>
                  </Card>
                )}

                {topicIndex < topics.length - 1 && <Separator className="my-6" />}
              </div>
            );
          })}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Ready to Test Your Knowledge?</CardTitle>
            <CardDescription>
              Complete the quiz to test your understanding of this session's topics.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild size="lg">
              <Link href={`/quiz/${sessionId}`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Take Session Quiz
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
