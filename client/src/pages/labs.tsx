import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, CheckCircle2, Circle, Trophy } from "lucide-react";
import type { Topic, LabProgress } from "@shared/schema";

export default function Labs() {
  const { user } = useAuth();

  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const { data: labProgress = [] } = useQuery<LabProgress[]>({
    queryKey: ["/api/progress/labs"],
    enabled: !!user,
  });

  const getLabProgress = (topicId: number) => {
    return labProgress.find((p) => {
      // Match by comparing topic IDs - labs are linked to topics
      return String(p.labId).startsWith(`lab-${topicId}`);
    });
  };

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Lab Exercises</h1>
          <p className="text-muted-foreground">
            Practice secure coding with hands-on lab exercises for each topic
          </p>
        </div>

        <div className="grid gap-4">
          {topics.map((topic, index) => {
            const progress = getLabProgress(topic.id);
            const isCompleted = progress?.completed || false;
            const score = progress?.score || 0;

            return (
              <Card key={topic.id} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary flex-shrink-0">
                      <Code className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-lg">
                          Topic {index + 1}: {topic.title}
                        </CardTitle>
                        {isCompleted && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        Hands-on coding exercise
                        {isCompleted && ` • Score: ${score}%`}
                      </CardDescription>
                    </div>
                  </div>
                  <Link href={`/labs/${topic.id}`}>
                    <Button
                      size="sm"
                      variant={isCompleted ? "outline" : "default"}
                      data-testid={`button-start-lab-${topic.id}`}
                    >
                      {isCompleted ? (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Retake
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          Start Lab
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
              <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No lab exercises available yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
