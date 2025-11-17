import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowLeft, FileText, Upload, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Topic, ReadConfirmation } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

export default function PresentationViewer() {
  const [, params] = useRoute("/presentations/:topicId");
  const [, setLocation] = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const topicId = params?.topicId ? parseInt(params.topicId) : null;

  const [pptUrl, setPptUrl] = useState("");
  const [pptFileName, setPptFileName] = useState("");

  const { data: topic, isLoading: topicLoading } = useQuery<Topic>({
    queryKey: ["/api/topics", topicId],
    enabled: !!topicId,
  });

  const { data: readConfirmations = [] } = useQuery<ReadConfirmation[]>({
    queryKey: ["/api/read-confirmations"],
    enabled: !!user,
  });

  const isRead = readConfirmations.some((rc) => rc.topicId === topicId);

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/read-confirmations/${topicId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/read-confirmations"] });
      toast({
        title: "Marked as read",
        description: "Presentation marked as completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark presentation as read",
        variant: "destructive",
      });
    },
  });

  const uploadPPTMutation = useMutation({
    mutationFn: async (data: { pptUrl: string; pptFileName: string }) => {
      await apiRequest("POST", `/api/topics/${topicId}/ppt`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "PPT uploaded",
        description: "Presentation uploaded successfully",
      });
      setPptUrl("");
      setPptFileName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload presentation",
        variant: "destructive",
      });
    },
  });

  const deletePPTMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/topics/${topicId}/ppt`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({
        title: "PPT deleted",
        description: "Presentation removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete presentation",
        variant: "destructive",
      });
    },
  });

  if (!topicId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Invalid topic ID</p>
      </div>
    );
  }

  if (topicLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading presentation...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Topic not found</p>
      </div>
    );
  }

  const handleUpload = () => {
    if (!pptUrl.trim() || !pptFileName.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide both URL and filename",
        variant: "destructive",
      });
      return;
    }
    uploadPPTMutation.mutate({ pptUrl: pptUrl.trim(), pptFileName: pptFileName.trim() });
  };

  const handleFileUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileName = uploadedFile.name;
      const response = uploadedFile.response?.body as any;
      
      if (response?.filePath) {
        uploadPPTMutation.mutate({ 
          pptUrl: response.filePath, 
          pptFileName: fileName 
        });
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/presentations")}
            className="mb-4"
            data-testid="button-back-to-presentations"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Presentations
          </Button>

          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
              <p className="text-muted-foreground">Review the presentation materials</p>
            </div>
            {isRead && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </Badge>
            )}
          </div>

          {topic.subparts && topic.subparts.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Topic Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {topic.subparts.map((subpart, index) => (
                    <li key={index}>{subpart}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {topic.pptUrl ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    <CardTitle>Presentation</CardTitle>
                  </div>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          data-testid="button-delete-ppt"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Presentation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the presentation for this topic. Students will no longer be able to view it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete-ppt">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePPTMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete-ppt"
                          >
                            {deletePPTMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <CardDescription>View the presentation below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4">
                  {(() => {
                    const urlLower = topic.pptUrl.toLowerCase().trim();
                    const fileNameLower = (topic.pptFileName || '').toLowerCase().trim();
                    
                    const isPDF = urlLower.endsWith('.pdf') || fileNameLower.endsWith('.pdf');
                    const isPPTX = /\.(pptx?|ppt)$/i.test(urlLower) || /\.(pptx?|ppt)$/i.test(fileNameLower);
                    const isLocalFile = topic.pptUrl.startsWith('/objects/');
                    const isGoogleSlides = topic.pptUrl.includes('docs.google.com/presentation');
                    
                    if (isPDF && isLocalFile) {
                      return (
                        <iframe
                          src={topic.pptUrl}
                          className="w-full h-full rounded-md"
                          title="PDF Presentation"
                          data-testid="iframe-presentation"
                        />
                      );
                    } else if (isPPTX && isLocalFile) {
                      return (
                        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                          <FileText className="w-16 h-16 text-primary" />
                          <div>
                            <h3 className="font-semibold mb-2">PowerPoint File Available</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {topic.pptFileName || 'Presentation file'}
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                              Note: PowerPoint files (.pptx, .ppt) cannot be previewed in the browser. Download the file to view it.
                            </p>
                            <a
                              href={topic.pptUrl}
                              download={topic.pptFileName}
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                              Download Presentation
                            </a>
                          </div>
                        </div>
                      );
                    } else if (isGoogleSlides) {
                      let embedUrl = topic.pptUrl;
                      if (embedUrl.includes('/edit') || embedUrl.includes('/view')) {
                        embedUrl = embedUrl.replace('/edit', '/embed').replace('/view', '/embed');
                      } else if (!embedUrl.includes('/embed')) {
                        embedUrl = embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'embedded=true';
                      }
                      return (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full rounded-md"
                          title="Google Slides Presentation"
                          allowFullScreen
                          data-testid="iframe-presentation"
                        />
                      );
                    } else {
                      return (
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(topic.pptUrl)}&embedded=true`}
                          className="w-full h-full rounded-md"
                          title="Presentation"
                          allowFullScreen
                          data-testid="iframe-presentation"
                        />
                      );
                    }
                  })()}
                </div>

                {!isRead && (
                  <Button
                    onClick={() => markAsReadMutation.mutate()}
                    disabled={markAsReadMutation.isPending}
                    data-testid="button-mark-as-read"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {markAsReadMutation.isPending ? "Marking..." : "Mark as Read"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Replace Presentation</CardTitle>
                  <CardDescription>Upload a new presentation to replace the current one</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={50 * 1024 * 1024}
                      onComplete={handleFileUploadComplete}
                      buttonClassName="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File from Computer
                    </ObjectUploader>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or enter URL</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pptUrl">Presentation URL</Label>
                    <Input
                      id="pptUrl"
                      type="url"
                      placeholder="https://example.com/presentation.pdf"
                      value={pptUrl}
                      onChange={(e) => setPptUrl(e.target.value)}
                      data-testid="input-ppt-url"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pptFileName">File Name</Label>
                    <Input
                      id="pptFileName"
                      placeholder="Topic 1 - Security Mindset.pdf"
                      value={pptFileName}
                      onChange={(e) => setPptFileName(e.target.value)}
                      data-testid="input-ppt-filename"
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadPPTMutation.isPending}
                    className="w-full"
                    data-testid="button-upload-ppt"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadPPTMutation.isPending ? "Uploading..." : "Upload from URL"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No presentation available yet</p>
                {isAdmin && (
                  <p className="text-sm text-muted-foreground">Upload a presentation below</p>
                )}
              </div>

              {isAdmin && (
                <div className="max-w-md mx-auto space-y-4">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={50 * 1024 * 1024}
                    onComplete={handleFileUploadComplete}
                    buttonClassName="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File from Computer
                  </ObjectUploader>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or enter URL</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pptUrl">Presentation URL</Label>
                    <Input
                      id="pptUrl"
                      type="url"
                      placeholder="https://example.com/presentation.pdf"
                      value={pptUrl}
                      onChange={(e) => setPptUrl(e.target.value)}
                      data-testid="input-ppt-url"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pptFileName">File Name</Label>
                    <Input
                      id="pptFileName"
                      placeholder="Topic 1 - Security Mindset.pdf"
                      value={pptFileName}
                      onChange={(e) => setPptFileName(e.target.value)}
                      data-testid="input-ppt-filename"
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadPPTMutation.isPending}
                    className="w-full"
                    data-testid="button-upload-ppt"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadPPTMutation.isPending ? "Uploading..." : "Upload from URL"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
