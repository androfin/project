import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/code-editor";
import { SecurityValidator, type ValidationResult } from "@/components/security-validator";
import { DocumentationPanel, type DocSection } from "@/components/documentation-panel";
import { AlertCircle, BookOpen, Lightbulb, Target, Loader2, PlayCircle, Eye, RotateCcw, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { LabExercise, Topic } from "@shared/schema";

export default function LabExercise() {
  const [, params] = useRoute("/labs/:topicId");
  const topicId = params?.topicId ? parseInt(params.topicId) : 1;
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data: topic, isLoading: topicLoading } = useQuery<Topic>({
    queryKey: ["/api/topics", topicId],
  });

  const { data: lab, isLoading: labLoading } = useQuery<LabExercise>({
    queryKey: ["/api/topics", topicId, "lab"],
  });

  const { data: labProgress } = useQuery<any[]>({
    queryKey: ["/api/progress/labs"],
  });

  const [codeFiles, setCodeFiles] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastPassed, setLastPassed] = useState<boolean>(false);

  useEffect(() => {
    if (lab && lab.vulnerableCode.length > 0) {
      const initialFiles: Record<string, string> = {};
      lab.vulnerableCode.forEach(file => {
        initialFiles[file.filename] = file.code;
      });
      setCodeFiles(initialFiles);
    }
  }, [lab]);

  useEffect(() => {
    if (lab && labProgress) {
      const savedProgress = labProgress.find(p => p.labId === lab.id);
      if (savedProgress) {
        setHasValidated(true);
        setLastPassed(savedProgress.completed);
      }
    }
  }, [lab, labProgress]);

  const validateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", `/api/topics/${topicId}/lab/validate`, { code });
      return response.json();
    },
    onSuccess: (data) => {
      if (!data || !data.results) {
        toast({
          title: "Validation Error",
          description: "Unable to validate your code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setValidationResults(data.results);
      setHasValidated(true);
      setLastPassed(data.passed);
      
      if (data.passed) {
        toast({
          title: "Congratulations!",
          description: "Pass! All required security headers configured correctly!",
        });
      } else {
        toast({
          title: "Keep trying!",
          description: "Fail. Check the validation results for details.",
          variant: "destructive",
        });
      }
      
      // Validation endpoint already saves to database - just invalidate cache
      queryClient.invalidateQueries({ queryKey: ["/api/progress/labs"] });
    },
    onError: () => {
      toast({
        title: "Validation failed",
        description: "An error occurred while validating your code.",
        variant: "destructive",
      });
    },
  });

  const handleCodeChange = (filename: string, newCode: string) => {
    setCodeFiles(prev => ({
      ...prev,
      [filename]: newCode
    }));
  };

  const handleReset = () => {
    if (lab) {
      const resetFiles: Record<string, string> = {};
      lab.vulnerableCode.forEach(file => {
        resetFiles[file.filename] = file.code;
      });
      setCodeFiles(resetFiles);
      setValidationResults([]);
      setHasValidated(false);
      setShowHints(false);
      setShowAnswer(false);
      setLastPassed(false);
    }
  };

  const handleTryAgain = () => {
    setValidationResults([]);
    setHasValidated(false);
    setShowAnswer(false);
  };

  const handleShowAnswer = () => {
    if (lab && lab.correctCode && lab.correctCode.length > 0 && isAdmin) {
      const answerFiles: Record<string, string> = {};
      lab.correctCode.forEach(file => {
        answerFiles[file.filename] = file.code;
      });
      setCodeFiles(answerFiles);
      setShowAnswer(true);
      toast({
        title: "Correct Answer Loaded",
        description: "The secure code solution has been loaded into the editor.",
      });
    }
  };

  const handleValidate = () => {
    const firstFile = lab?.vulnerableCode[0]?.filename;
    if (firstFile && codeFiles[firstFile]) {
      validateMutation.mutate(codeFiles[firstFile]);
    }
  };

  if (topicLoading || labLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="max-w-7xl mx-auto space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!topic || !lab) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Lab Not Found</CardTitle>
            <CardDescription>The requested lab exercise could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Section */}
      <div className="border-b border-border p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs" data-testid="badge-topic-number">
              Topic {topic.number}
            </Badge>
            <Badge variant="outline" className="text-xs" data-testid="badge-duration">
              {topic.duration}
            </Badge>
            <Badge variant="outline" className="text-xs" data-testid="badge-estimated-time">
              ~{lab.estimatedTime} minutes
            </Badge>
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-topic-title">{topic.title}</h1>
          {topic.subparts && topic.subparts.length > 0 && (
            <div className="mb-3" data-testid="container-subparts">
              <p className="text-xs font-medium text-muted-foreground mb-2">Subparts covered:</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                {topic.subparts.map((subpart, idx) => (
                  <li key={idx} data-testid={`text-subpart-${idx}`}>{subpart}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t border-border pt-3 mt-3">
            <h2 className="text-lg font-semibold mb-1" data-testid="text-lab-title">{lab.title}</h2>
            <p className="text-sm text-muted-foreground">{lab.description}</p>
          </div>
        </div>
      </div>

      {/* How to Use Instructions Banner */}
      <div className="bg-primary/5 border-b border-primary/20 p-4">
        <div className="max-w-7xl mx-auto">
          <Alert className="border-primary/30">
            <Lightbulb className="h-4 w-4 text-primary" />
            <AlertDescription>
              <p className="font-semibold text-sm mb-2">How to Use This Lab:</p>
              <ol className="text-xs space-y-1 ml-4 list-decimal">
                <li><strong>Read the Instructions:</strong> Review the scenario and mission in the "Instructions" tab below</li>
                <li><strong>Study the Vulnerable Code:</strong> Examine the code in the editor - identify security flaws</li>
                <li><strong>Fix the Security Issues:</strong> Edit the code directly in the text editor to implement secure solutions</li>
                <li><strong>Use Hints if Needed:</strong> Progressive hints are available in the Instructions tab</li>
                <li><strong>Click "Validate":</strong> Press the green "Validate" button above the code editor to check your solution</li>
                <li><strong>Review Results:</strong> See your score and specific feedback in the right panel</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-4 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Instructions + Code Editor */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Instructions Tabs */}
              <Tabs defaultValue="instructions" className="flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="instructions" className="gap-2" data-testid="tab-instructions">
                    <BookOpen className="w-4 h-4" />
                    Instructions
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="gap-2" data-testid="tab-learning">
                    <Target className="w-4 h-4" />
                    Learning Outcomes
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="instructions" className="m-0 mt-4">
                  <Card>
                    <CardContent className="p-4 space-y-4 max-h-96 overflow-auto">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                          {lab.instructions}
                        </pre>
                      </div>

                      {lab.hints && lab.hints.length > 0 && (
                        <div className="space-y-2">
                          {!showHints ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowHints(true)}
                              className="gap-2"
                              data-testid="button-show-hints"
                            >
                              <Lightbulb className="h-4 w-4" />
                              Show Hints (Progressive Difficulty)
                            </Button>
                          ) : (
                            <Alert>
                              <Lightbulb className="h-4 w-4" />
                              <AlertDescription className="space-y-2">
                                <div className="font-medium text-sm">Hints (Progressive Difficulty):</div>
                                <ul className="text-sm space-y-1 ml-4 list-disc">
                                  {lab.hints.map((hint, idx) => (
                                    <li key={idx} data-testid={`text-hint-${idx}`}>{hint}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="learning" className="m-0 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">What You'll Learn</CardTitle>
                      <CardDescription className="text-xs">
                        Key skills and knowledge from this exercise
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-auto">
                      {lab.learningOutcomes.map((outcome, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-primary">{idx + 1}</span>
                          </div>
                          <span className="text-sm">{outcome}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Code Editor with Prominent Validate Button */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                  <p className="text-sm font-medium">Code Editor - Edit Below to Fix Vulnerabilities</p>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="gap-2"
                    onClick={handleValidate}
                    disabled={validateMutation.isPending}
                    data-testid="button-validate-top"
                  >
                    {validateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                    <span>{validateMutation.isPending ? "Validating..." : "Validate Solution"}</span>
                  </Button>
                </div>
                <div className="min-h-[500px]">
                  <CodeEditor
                    files={lab.vulnerableCode.map(f => ({ 
                      filename: f.filename,
                      language: f.language,
                      code: codeFiles[f.filename] !== undefined ? codeFiles[f.filename] : f.code 
                    }))}
                    onCodeChange={handleCodeChange}
                    onRun={handleValidate}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Validation Results */}
            <div className="flex flex-col gap-4">
              {hasValidated ? (
                <div className="space-y-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-5 w-5 ${lastPassed ? 'text-green-600' : 'text-destructive'}`} />
                        <p className="font-semibold">Result: {lastPassed ? 'Pass' : 'Fail'}</p>
                      </div>
                      {showAnswer && (
                        <Badge variant="outline" className="text-xs">Showing Correct Answer</Badge>
                      )}
                    </div>
                    {validationResults.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Previous result loaded. Click "Validate Solution" to see detailed feedback.
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTryAgain}
                        className="gap-2 flex-1"
                        data-testid="button-try-again"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Try Again
                      </Button>
                      {isAdmin && lab?.correctCode && lab.correctCode.length > 0 && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={handleShowAnswer}
                          disabled={showAnswer}
                          className="gap-2 flex-1"
                          data-testid="button-show-answer"
                        >
                          <Eye className="h-4 w-4" />
                          {showAnswer ? "Answer Shown" : "Show Answer"}
                        </Button>
                      )}
                    </div>
                  </Card>
                  {validationResults.length > 0 && (
                    <SecurityValidator
                      results={validationResults}
                      curlCommand="curl -I https://your-server.com"
                    />
                  )}
                </div>
              ) : (
                <Card className="p-8">
                  <div className="text-center space-y-3">
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
                    <div>
                      <p className="font-semibold text-base mb-2">Ready to Validate?</p>
                      <p className="text-sm text-muted-foreground">
                        Edit the vulnerable code in the editor, then click the green <strong>"Validate Solution"</strong> button to check your implementation.
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        Your results will appear here with detailed feedback.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
