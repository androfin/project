import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, CheckCircle2, Circle, Trophy } from "lucide-react";
import type { Topic, QuizAttempt } from "@shared/schema";

export default function Quizzes() {
  const { user } = useAuth();

  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const { data: quizAttempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ["/api/progress/quizzes"],
    enabled: !!user,
  });

  const getTopicBestAttempt = (topicId: number) => {
    const attempts = quizAttempts.filter((a) => a.topicId === topicId);
    if (attempts.length === 0) return null;
    return attempts.reduce((best, curr) =>
      (curr.score || 0) > (best.score || 0) ? curr : best
    );
  };

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Quizzes</h1>
          <p className="text-muted-foreground">
            Test your knowledge with 25-question quizzes for each topic
          </p>
        </div>

        <div className="grid gap-4">
          {topics.map((topic, index) => {
            const bestAttempt = getTopicBestAttempt(topic.id);
            const hasCompleted = bestAttempt !== null;
            const bestScore = bestAttempt?.score || 0;
            const totalAttempts = quizAttempts.filter((a) => a.topicId === topic.id).length;

            return (
              <Card key={topic.id} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary flex-shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-lg">
                          Topic {index + 1}: {topic.title}
                        </CardTitle>
                        {hasCompleted && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        25 questions • {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}
                        {hasCompleted && ` • Best: ${bestScore}%`}
                      </CardDescription>
                    </div>
                  </div>
                  <Link href={`/quizzes/${topic.id}`}>
                    <Button
                      size="sm"
                      variant={hasCompleted ? "outline" : "default"}
                      data-testid={`button-start-quiz-${topic.id}`}
                    >
                      {hasCompleted ? (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Retake
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </Link>
                </CardHeader>

                {topic.subparts && topic.subparts.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Covers:</span>{" "}
                      {topic.subparts.join(", ")}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {topics.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No quizzes available yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
