import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, RotateCcw, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeFile {
  filename: string;
  code: string;
  language: string;
}

interface CodeEditorProps {
  files: CodeFile[];
  onCodeChange?: (filename: string, code: string) => void;
  onRun?: () => void;
  onReset?: () => void;
}

export function CodeEditor({ files, onCodeChange, onRun, onReset }: CodeEditorProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.filename || "");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const currentFile = files.find(f => f.filename === activeFile) || files[0];

  const handleCopy = async () => {
    if (currentFile) {
      await navigator.clipboard.writeText(currentFile.code);
      setCopied(true);
      toast({
        title: "Code copied",
        description: "Code has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeFile} onValueChange={setActiveFile} className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 p-2 border-b border-card-border flex-wrap">
          <TabsList className="h-8">
            {files.map((file) => (
              <TabsTrigger 
                key={file.filename} 
                value={file.filename} 
                className="text-xs gap-1.5 h-7 px-3"
                data-testid={`tab-${file.filename}`}
              >
                <span className="font-mono">{file.filename}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                  {file.language}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-1.5">
            <Button 
              size="sm" 
              variant="ghost" 
              className="gap-1.5 h-8 px-3"
              onClick={handleCopy}
              data-testid="button-copy-code"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
            </Button>
            {onReset && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="gap-1.5 h-8 px-3"
                onClick={onReset}
                data-testid="button-reset-code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-xs">Reset</span>
              </Button>
            )}
            {onRun && (
              <Button 
                size="sm" 
                variant="default" 
                className="gap-1.5 h-8 px-3"
                onClick={onRun}
                data-testid="button-run-code"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span className="text-xs">Validate</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {files.map((file) => (
            <TabsContent 
              key={file.filename} 
              value={file.filename} 
              className="h-full m-0 p-0"
            >
              <Textarea
                value={file.code}
                onChange={(e) => onCodeChange?.(file.filename, e.target.value)}
                className="h-full resize-none font-mono text-sm border-0 rounded-none focus-visible:ring-0 leading-relaxed"
                placeholder="// Write your code here..."
                spellCheck={false}
                data-testid={`editor-${file.filename}`}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </Card>
  );
}
