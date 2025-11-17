import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Presentation, CheckCircle2, Circle, Upload } from "lucide-react";
import type { Topic, ReadConfirmation } from "@shared/schema";

export default function Presentations() {
  const { user } = useAuth();

  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const { data: readConfirmations = [] } = useQuery<ReadConfirmation[]>({
    queryKey: ["/api/read-confirmations"],
    enabled: !!user,
  });

  const isTopicRead = (topicId: number) =>
    readConfirmations.some((rc) => rc.topicId === topicId);

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading presentations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Presentations</h1>
          <p className="text-muted-foreground">
            Review course materials and presentations for each topic
          </p>
        </div>

        <div className="grid gap-4">
          {topics.map((topic, index) => {
            const isRead = isTopicRead(topic.id);
            const hasPresentation = topic.pptUrl;

            return (
              <Card key={topic.id} className="hover-elevate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary flex-shrink-0">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <CardTitle className="text-lg">
                          Topic {index + 1}: {topic.title}
                        </CardTitle>
                        {isRead && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Read
                          </Badge>
                        )}
                        {!hasPresentation && (
                          <Badge variant="secondary" className="gap-1">
                            <Upload className="w-3 h-3" />
                            No PPT
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {topic.subparts && topic.subparts.length > 0
                          ? `${topic.subparts.length} subpart${topic.subparts.length > 1 ? 's' : ''}`
                          : "No subparts"}
                      </CardDescription>
                    </div>
                  </div>
                  <Link href={`/presentations/${topic.id}`}>
                    <Button
                      size="sm"
                      variant={isRead ? "outline" : "default"}
                      data-testid={`button-view-presentation-${topic.id}`}
                    >
                      {isRead ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Review
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          View
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
              <Presentation className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No presentations available yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
