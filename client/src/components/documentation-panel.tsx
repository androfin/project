import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface CodeExample {
  language: string;
  code: string;
  description: string;
}

export interface DocSection {
  id: string;
  title: string;
  content: string;
  category: "owasp" | "stride" | "http" | "tls" | "headers";
  codeExamples?: CodeExample[];
}

interface DocumentationPanelProps {
  sections: DocSection[];
}

const categoryColors = {
  owasp: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  stride: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  http: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  tls: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  headers: "bg-chart-5/10 text-chart-5 border-chart-5/20",
};

const categoryLabels = {
  owasp: "OWASP",
  stride: "STRIDE",
  http: "HTTP",
  tls: "TLS/SSL",
  headers: "Headers",
};

export function DocumentationPanel({ sections }: DocumentationPanelProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast({
      title: "Code copied",
      description: "Example code has been copied to clipboard",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Documentation</CardTitle>
        <CardDescription className="text-xs">
          Security concepts and best practices
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-3">
          <Accordion type="multiple" className="space-y-2">
            {sections.map((section) => (
              <AccordionItem 
                key={section.id} 
                value={section.id}
                className="border border-border rounded-md px-4 data-[state=open]:bg-muted/30"
                data-testid={`doc-${section.id}`}
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <Badge className={`text-xs border ${categoryColors[section.category]}`}>
                      {categoryLabels[section.category]}
                    </Badge>
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4 pt-2">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>

                  {section.codeExamples && section.codeExamples.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Code Examples:
                      </span>
                      {section.codeExamples.map((example, idx) => {
                        const codeId = `${section.id}-${idx}`;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {example.description}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1.5 flex-shrink-0"
                                onClick={() => handleCopyCode(example.code, codeId)}
                                data-testid={`button-copy-example-${idx}`}
                              >
                                {copiedCode === codeId ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span className="text-xs">
                                  {copiedCode === codeId ? "Copied" : "Copy"}
                                </span>
                              </Button>
                            </div>
                            <div className="relative">
                              <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5">
                                {example.language}
                              </Badge>
                              <div className="bg-muted rounded p-3 overflow-x-auto">
                                <pre className="text-xs font-mono">
                                  <code>{example.code}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
