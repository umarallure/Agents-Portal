import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileSpreadsheet, MessageSquare, ArrowLeft } from "lucide-react";

const CallResultJourney = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Call Result Saved",
      description: "Call result has been recorded in the database",
      icon: CheckCircle,
      color: "text-blue-600"
    },
    {
      title: "Google Sheets Updated",
      description: "Data has been synced to the Google Sheets tracking system",
      icon: FileSpreadsheet,
      color: "text-green-600"
    },
    {
      title: "Slack Notification Sent",
      description: "Team has been notified about the submitted application",
      icon: MessageSquare,
      color: "text-purple-600"
    },
    {
      title: "Process Complete",
      description: "All automated workflows have been completed successfully",
      icon: CheckCircle,
      color: "text-emerald-600"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Success!</h1>
          <p className="text-muted-foreground mt-2">
            Your call result has been processed successfully
          </p>
          {submissionId && (
            <p className="text-sm text-muted-foreground">
              Submission ID: {submissionId}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Process Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStep;
                const isActive = index === currentStep;
                
                return (
                  <div 
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-all duration-500 ${
                      isCompleted 
                        ? "bg-success/10 border border-success/20" 
                        : "bg-muted/30"
                    }`}
                  >
                    <div className={`
                      flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500
                      ${isCompleted 
                        ? "bg-success text-success-foreground" 
                        : "bg-muted text-muted-foreground"
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        isCompleted ? "text-success" : "text-muted-foreground"
                      }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                    
                    {isActive && !isCompleted && (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            onClick={() => navigate("/dashboard")}
            disabled={currentStep < steps.length - 1}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallResultJourney;