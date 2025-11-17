import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Clock, Award } from "lucide-react";
import { Link } from "wouter";
import type { CourseSession, LabProgress, QuizAttempt, LabExercise } from "@shared/schema";

export default function Sessions() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: sessions, isLoading: sessionsLoading } = useQuery<CourseSession[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: allLabs = [] } = useQuery<LabExercise[]>({
    queryKey: ["/api/labs"],
  });

  const { data: labProgress = [] } = useQuery<LabProgress[]>({
    queryKey: ["/api/progress/labs"],
    enabled: !!user,
    retry: false,
  });

  const { data: quizAttempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ["/api/progress/quizzes"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  const getSessionProgress = (sessionId: string) => {
    // Get best quiz attempt for this session
    const sessionQuizAttempts = quizAttempts.filter(a => a.sessionId === sessionId);
    const bestQuiz = sessionQuizAttempts.length > 0
      ? sessionQuizAttempts.reduce((best, current) =>
          current.score > best.score ? current : best
        )
      : null;

    // Count completed labs for this session
    const sessionLabs = allLabs.filter(lab => lab.sessionId === sessionId);
    const progressMap = new Map(labProgress.map(p => [p.labId, p]));
    const completed = sessionLabs.filter(lab => progressMap.get(lab.id)?.completed).length;

    return {
      quizScore: bestQuiz?.score || 0,
      quizAttempts: sessionQuizAttempts.length,
      labsCompleted: completed,
      totalLabs: sessionLabs.length,
    };
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Training Sessions
          </h1>
          <p className="text-muted-foreground">
            Complete all 6 sessions to master secure coding practices
          </p>
        </div>

        <div className="grid gap-6">
          {sessions?.map((session) => {
            const progress = getSessionProgress(session.id);

            return (
              <Card key={session.id} className="hover-elevate" data-testid={`card-session-${session.number}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" data-testid={`badge-session-number-${session.number}`}>
                          Session {session.number}
                        </Badge>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          {session.duration}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2" data-testid={`text-session-title-${session.number}`}>
                        {session.title}
                      </CardTitle>
                      <CardDescription>{session.description}</CardDescription>
                    </div>

                    {progress.quizAttempts > 0 && (
                      <div className="flex flex-col items-center gap-1 min-w-[80px]">
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-2xl font-bold" data-testid={`text-quiz-score-${session.number}`}>
                            {progress.quizScore}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">Best Score</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Learning Outcomes
                      </h4>
                      <ul className="space-y-1">
                        {session.learningOutcomes.map((outcome, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {progress.quizAttempts > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress.quizScore}%</span>
                        </div>
                        <Progress value={progress.quizScore} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress.quizAttempts} quiz attempt{progress.quizAttempts !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button variant="default" size="sm" asChild data-testid={`button-view-session-${session.number}`}>
                        <Link href={`/sessions/${session.id}`}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          View Session
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild data-testid={`button-take-quiz-${session.number}`}>
                        <Link href={`/quiz/${session.id}`}>
                          Take Quiz
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {sessions && sessions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Sessions Available</h3>
              <p className="text-sm text-muted-foreground">
                Training sessions will appear here once they're added.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
