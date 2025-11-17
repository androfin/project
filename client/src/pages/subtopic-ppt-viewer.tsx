import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import type { TopicSubtopic } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReadStatus {
  isRead: boolean;
  readAt?: string;
}

export default function SubtopicPPTViewer() {
  const { subtopicId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: subtopic, isLoading: subtopicLoading, error: subtopicError } = useQuery<TopicSubtopic>({
    queryKey: [`/api/subtopics/${subtopicId}`],
  });

  const { data: readStatus, isLoading: statusLoading } = useQuery<ReadStatus>({
    queryKey: [`/api/subtopics/${subtopicId}/read-status`],
    enabled: !!user,
    retry: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/subtopics/${subtopicId}/read`, {});
    },
    onSuccess: () => {
      toast({
        title: "Marked as read",
        description: "This presentation has been marked as completed.",
      });
      // Invalidate read status and user read confirmations
      queryClient.invalidateQueries({ queryKey: [`/api/subtopics/${subtopicId}/read-status`] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/read-confirmations`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as read",
        variant: "destructive",
      });
    },
  });

  if (subtopicLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (subtopicError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading presentation</p>
          <p className="text-sm text-muted-foreground mb-4">{String(subtopicError)}</p>
          <Button variant="outline" size="sm" asChild data-testid="button-back">
            <Link href="/sessions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!subtopic) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Presentation not found</p>
          <Button variant="outline" size="sm" asChild className="mt-4" data-testid="button-back">
            <Link href="/sessions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sessions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isRead = readStatus?.isRead || false;
  const isMarking = markAsReadMutation.isPending;

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild data-testid="button-back-to-topic">
            <Link href={`/topics/${subtopic.topicId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Topic
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" data-testid="badge-subtopic">
              <FileText className="w-3 h-3 mr-1" />
              Presentation
            </Badge>
            {isRead && (
              <Badge variant="default" className="flex items-center gap-1" data-testid="badge-read-status">
                <CheckCircle2 className="w-3 h-3" />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-subtopic-title">
            {subtopic.title}
          </h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Presentation Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              data-testid="content-ppt"
              dangerouslySetInnerHTML={{ __html: subtopic.pptContent || "<p>No content available</p>" }}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 pt-4 border-t">
          {!isRead ? (
            <Button
              variant="default"
              onClick={() => markAsReadMutation.mutate()}
              disabled={isMarking}
              data-testid="button-mark-as-read"
            >
              {isMarking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Marking as read...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Read
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span data-testid="text-completed-message">
                You completed this presentation
                {readStatus?.readAt && (
                  <span className="ml-1">
                    on {new Date(readStatus.readAt).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
          )}

          <Button variant="outline" size="sm" asChild data-testid="button-continue">
            <Link href={`/topics/${subtopic.topicId}`}>
              Continue to Next Subtopic
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
