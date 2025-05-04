import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string;
  footerContent?: ReactNode;
  progress?: number;
}

export function StatCard({
  icon,
  iconBgColor,
  iconColor,
  title,
  value,
  footerContent,
  progress,
}: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-start">
          <div className={cn("p-2 rounded-lg flex items-center justify-center", iconBgColor)}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-4">
            <p className="text-neutral-500 text-sm">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            
            {progress !== undefined && (
              <div className="w-full mt-2">
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {footerContent && (
              <div className="mt-1">{footerContent}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
