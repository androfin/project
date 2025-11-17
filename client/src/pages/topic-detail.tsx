import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import type { SessionTopic, TopicSubtopic } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface ReadConfirmation {
  subtopicId: number;
  readAt: string;
}

export default function TopicDetail() {
  const { topicId } = useParams();
  const { user } = useAuth();

  const { data: topic, isLoading: topicLoading, error: topicError } = useQuery<SessionTopic>({
    queryKey: [`/api/topics/${topicId}`],
  });

  const { data: subtopics = [], isLoading: subtopicsLoading, error: subtopicsError } = useQuery<TopicSubtopic[]>({
    queryKey: [`/api/topics/${topicId}/subtopics`],
  });

  const { data: readConfirmations = [] } = useQuery<ReadConfirmation[]>({
    queryKey: user?.id ? [`/api/users/${user.id}/read-confirmations`] : ['no-user'],
    enabled: !!user?.id,
    retry: false,
  });

  if (topicLoading || subtopicsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading topic details...</p>
        </div>
      </div>
    );
  }

  if (topicError || subtopicsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading topic</p>
          <p className="text-sm text-muted-foreground mb-4">
            {topicError ? String(topicError) : String(subtopicsError)}
          </p>
          <Button variant="outline" size="sm" asChild data-testid="button-back-to-sessions">
            <Link href="/sessions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Topic not found</p>
          <Button variant="outline" size="sm" asChild className="mt-4" data-testid="button-back-to-sessions">
            <Link href="/sessions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const readSubtopicIds = new Set(readConfirmations.map(rc => rc.subtopicId));

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild data-testid="button-back-to-session">
            <Link href={`/sessions/${topic.sessionId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Session
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" data-testid="badge-topic">
              Topic
            </Badge>
            {topic.duration && (
              <Badge variant="outline">
                {topic.duration}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-topic-title">
            {topic.title}
          </h1>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Subtopics & Presentations</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This topic includes {subtopics.length} subtopics with interactive presentations. Click on each to view the presentation slides.
          </p>
        </div>

        <div className="grid gap-4">
          {subtopics.map((subtopic, index) => {
            const isRead = readSubtopicIds.has(subtopic.id);

            return (
              <Card
                key={subtopic.id}
                className="hover-elevate"
                data-testid={`card-subtopic-${index + 1}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" data-testid={`badge-subtopic-number-${index + 1}`}>
                          Subtopic {index + 1}
                        </Badge>
                        {isRead && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Read
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2" data-testid={`text-subtopic-title-${index + 1}`}>
                        <FileText className="w-5 h-5 text-primary" />
                        {subtopic.title}
                      </CardTitle>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" asChild data-testid={`button-view-subtopic-${index + 1}`}>
                      <Link href={`/subtopics/${subtopic.id}`}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Presentation
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {subtopics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Subtopics Available</h3>
              <p className="text-sm text-muted-foreground">
                Subtopics for this topic will appear here once they're added.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
