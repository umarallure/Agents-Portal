import { ColoredProgress } from "@/components/ui/colored-progress";

interface VerificationProgressBarProps {
  progress: number;
  verifiedCount: number;
  totalCount: number;
}

export const VerificationProgressBar = ({ progress, verifiedCount, totalCount }: VerificationProgressBarProps) => {
  let statusText = "Just Started";
  let statusClass = "bg-red-100 text-red-800";
  if (progress >= 76) {
    statusText = "Ready for Transfer";
    statusClass = "bg-green-100 text-green-800";
  } else if (progress >= 51) {
    statusText = "Nearly Complete";
    statusClass = "bg-yellow-100 text-yellow-800";
  } else if (progress >= 26) {
    statusText = "In Progress";
    statusClass = "bg-orange-100 text-orange-800";
  }

  return (
    <div className="w-full px-6 pt-6 pb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-semibold">Progress</span>
        <span className={`text-2xl font-bold ${
          progress >= 76 ? 'text-green-600' :
          progress >= 51 ? 'text-yellow-600' :
          progress >= 26 ? 'text-orange-600' : 'text-red-600'
        }`}>
          {progress}%
        </span>
      </div>
      <ColoredProgress 
        value={progress} 
        className="h-6 rounded transition-all duration-500"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-base text-muted-foreground">
          {verifiedCount} of {totalCount} fields verified
        </span>
        <span className={`ml-2 px-3 py-1 rounded text-base font-semibold ${statusClass}`}>
          {statusText}
        </span>
      </div>
    </div>
  );
};
