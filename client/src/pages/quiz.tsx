import { useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, ChevronRight, ChevronLeft, RotateCcw, Loader2, Award, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuizQuestion, Topic } from "@shared/schema";

export default function Quiz() {
  const { toast } = useToast();
  const params = useParams();
  const topicId = params.topicId;
  
  // Fetch topic details
  const { data: topic, isLoading: isLoadingTopic } = useQuery<Topic>({
    queryKey: topicId ? [`/api/topics/${topicId}`] : [],
    enabled: !!topicId,
  });
  
  // Fetch quiz questions
  const { data: quizQuestions, isLoading: isLoadingQuestions } = useQuery<QuizQuestion[]>({
    queryKey: topicId ? [`/api/topics/${topicId}/quizzes`] : [],
    enabled: !!topicId,
  });
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<{ score: number; correctCount: number; totalQuestions: number } | null>(null);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!topicId) throw new Error("Topic ID is required");
      
      const correctCount = quizQuestions?.filter(q => isAnswerCorrect(q.id)).length || 0;
      const totalQuestions = quizQuestions?.length || 0;
      const score = Math.round((correctCount / totalQuestions) * 100);

      const response = await apiRequest("POST", `/api/topics/${topicId}/quiz/submit`, {
        answers,
        score,
        totalQuestions,
        correctCount,
      });

      return { score, correctCount, totalQuestions };
    },
    onSuccess: (data) => {
      setQuizResults(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/progress/quizzes"] });
      toast({
        title: "Quiz Submitted!",
        description: `You got ${data.correctCount}/${data.totalQuestions} correct (${data.score}%)`,
      });
    },
  });

  const isLoading = isLoadingTopic || isLoadingQuestions;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="border-b border-border p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!topic || !quizQuestions || quizQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Quiz Available</CardTitle>
            <CardDescription>Unable to load quiz questions for this topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" data-testid="button-back">
              <Link href="/quizzes">Back to Quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show topic overview before starting quiz
  if (!quizStarted) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <Badge variant="outline">Topic {topic.number}</Badge>
            </div>
            <CardTitle className="text-2xl" data-testid="text-topic-title">{topic.title}</CardTitle>
            <CardDescription>{topic.duration} • {quizQuestions.length} questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {topic.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </div>
            )}
            
            {topic.subparts && topic.subparts.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Topics Covered</h3>
                <ul className="space-y-1">
                  {topic.subparts.map((subpart, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span data-testid={`text-subpart-${index}`}>{subpart}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => setQuizStarted(true)} 
                className="flex-1"
                data-testid="button-start-quiz"
              >
                Start Quiz
              </Button>
              <Button asChild variant="outline" data-testid="button-back">
                <Link href="/quizzes">Back to Quizzes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = quizQuestions[currentQuestion];
  const totalQuestions = quizQuestions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleSingleChoice = (optionId: string) => {
    setAnswers({ ...answers, [question.id]: [optionId] });
  };

  const handleMultipleChoice = (optionId: string, checked: boolean) => {
    const current = answers[question.id] || [];
    const updated = checked
      ? [...current, optionId]
      : current.filter(id => id !== optionId);
    setAnswers({ ...answers, [question.id]: updated });
  };

  const isAnswerCorrect = (questionId: string) => {
    const q = quizQuestions.find(q => q.id === questionId);
    if (!q) return false;
    const userAnswer = answers[questionId] || [];
    return (
      userAnswer.length === q.correctAnswers.length &&
      userAnswer.every(a => q.correctAnswers.includes(a))
    );
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleFinalSubmit = () => {
    submitQuizMutation.mutate();
  };

  const handleReattempt = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setQuizResults(null);
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-border p-4 bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" data-testid="text-quiz-title">{topic.title} Quiz</h2>
            <Badge variant="secondary" data-testid="text-question-counter">
              Question {currentQuestion + 1} / {totalQuestions}
            </Badge>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" data-testid="progress-quiz" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span data-testid="text-answered-count">{answeredCount} of {totalQuestions} answered</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <Badge variant="outline" data-testid="text-category">{question.category}</Badge>
              <CardTitle className="text-lg mt-2" data-testid="text-question">
                {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.type === "multiple_choice" || question.type === "single" ? (
                <RadioGroup
                  value={answers[question.id]?.[0] || ""}
                  onValueChange={(value) => handleSingleChoice(value)}
                  disabled={submitted}
                >
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover-elevate">
                      <RadioGroupItem value={option.id} id={option.id} data-testid={`radio-option-${option.id}`} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : question.type === "true_false" ? (
                <RadioGroup
                  value={answers[question.id]?.[0] || ""}
                  onValueChange={(value) => handleSingleChoice(value)}
                  disabled={submitted}
                >
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover-elevate">
                      <RadioGroupItem value={option.id} id={option.id} data-testid={`radio-option-${option.id}`} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover-elevate">
                      <Checkbox
                        id={option.id}
                        checked={answers[question.id]?.includes(option.id) || false}
                        onCheckedChange={(checked) =>
                          handleMultipleChoice(option.id, checked as boolean)
                        }
                        disabled={submitted}
                        data-testid={`checkbox-option-${option.id}`}
                      />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!submitted ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                data-testid="button-previous"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentQuestion < totalQuestions - 1 ? (
                <Button
                  onClick={handleNext}
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={submitQuizMutation.isPending}
                  data-testid="button-submit-quiz"
                >
                  {submitQuizMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>
          ) : (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold" data-testid="text-quiz-complete">Quiz Complete!</h3>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Score</p>
                        <p className="text-3xl font-bold text-primary" data-testid="text-final-score">
                          {quizResults?.correctCount}/{quizResults?.totalQuestions}
                        </p>
                        <p className="text-lg text-muted-foreground">{quizResults?.score}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleReattempt} variant="outline" data-testid="button-reattempt">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reattempt Quiz
                    </Button>
                    <Button asChild data-testid="button-back-quizzes">
                      <Link href="/quizzes">Back to Quizzes</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
