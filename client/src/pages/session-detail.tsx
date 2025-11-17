import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import type { CourseSession, SessionTopic } from "@shared/schema";

export default function SessionDetail() {
  const { sessionId } = useParams();

  const { data: session, isLoading: sessionLoading } = useQuery<CourseSession>({
    queryKey: ["/api/sessions", sessionId],
  });

  const { data: topics = [], isLoading: topicsLoading } = useQuery<SessionTopic[]>({
    queryKey: ["/api/sessions", sessionId, "topics"],
  });

  if (sessionLoading || topicsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session topics...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found</p>
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

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild data-testid="button-back-to-sessions">
            <Link href="/sessions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" data-testid={`badge-session-number-${session.number}`}>
              Session {session.number}
            </Badge>
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {session.duration}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-session-title">
            {session.title}
          </h1>
          <p className="text-muted-foreground text-lg">{session.description}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Main Topics</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This session covers {topics.length} main topics. Click on each topic to explore its subtopics and presentations.
          </p>
        </div>

        <div className="grid gap-4">
          {topics.map((topic, index) => (
            <Card
              key={topic.id}
              className="hover-elevate"
              data-testid={`card-topic-${index + 1}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" data-testid={`badge-topic-number-${index + 1}`}>
                        Topic {index + 1}
                      </Badge>
                      {topic.duration && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {topic.duration}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg" data-testid={`text-topic-title-${index + 1}`}>
                      {topic.title}
                    </CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" asChild data-testid={`button-view-topic-${index + 1}`}>
                    <Link href={`/topics/${topic.id}`}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Topic Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {topics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Topics Available</h3>
              <p className="text-sm text-muted-foreground">
                Topics for this session will appear here once they're added.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
