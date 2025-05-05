import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, Percent, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiMetric {
  name: string;
  value: number | string;
  unit: string;
  change: number;
  icon: React.ReactNode;
}

interface KpiMetricsWidgetProps {
  projectId?: number;
}

const generateSparklinePoints = (width: number, height: number, trend: 'up' | 'down' | 'neutral'): string => {
  // Generate simple sparkling path for visualization
  const points: [number, number][] = [];
  const numPoints = 10;
  
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * width;
    
    let y: number;
    if (trend === 'up') {
      // Overall upward trend with some variation
      y = height - (i / (numPoints - 1)) * height * 0.8 + Math.random() * height * 0.2;
    } else if (trend === 'down') {
      // Overall downward trend with some variation
      y = (i / (numPoints - 1)) * height * 0.8 + Math.random() * height * 0.2;
    } else {
      // Neutral trend with variation around the middle
      y = height / 2 + (Math.random() - 0.5) * height * 0.5;
    }
    
    points.push([x, y]);
  }
  
  // Convert points to SVG path
  return points.map((point, i) => 
    `${i === 0 ? 'M' : 'L'} ${point[0]},${point[1]}`
  ).join(' ');
};

export function KpiMetricsWidget({ projectId }: KpiMetricsWidgetProps) {
  const [metrics, setMetrics] = useState<KpiMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from API
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock metrics data
        const mockMetrics: KpiMetric[] = [
          {
            name: "Avg. Task Duration",
            value: 4.2,
            unit: "days",
            change: -12.5,
            icon: <Clock className="h-5 w-5 text-primary" />
          },
          {
            name: "Budget Accuracy",
            value: 92,
            unit: "%",
            change: 3.2,
            icon: <Percent className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          },
          {
            name: "Task Completion Rate",
            value: 86,
            unit: "%",
            change: 5.7,
            icon: <CheckCircle className="h-5 w-5 text-primary" />
          }
        ];

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Error fetching KPI metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-background overflow-hidden">
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="text-md font-semibold text-foreground dark:text-foreground mb-3">Key Performance Indicators</h3>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 flex-1">
            {metrics.map((metric, index) => (
              <div 
                key={index}
                className="bg-muted/50 dark:bg-white/5 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-background dark:bg-muted shadow-sm mr-3">
                    {metric.icon}
                  </div>
                  <div>
                    <h4 className="text-sm text-foreground/70 dark:text-foreground/70">{metric.name}</h4>
                    <div className="text-xl font-bold text-foreground dark:text-foreground">
                      {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                      <span className="text-sm font-normal text-foreground/70 dark:text-foreground/70 ml-1">{metric.unit}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className={`flex items-center text-sm font-medium ${
                    metric.change > 0 
                      ? 'text-emerald-500 dark:text-emerald-400' 
                      : metric.change < 0 
                        ? 'text-primary dark:text-primary' 
                        : 'text-muted-foreground'
                  }`}>
                    {metric.change > 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : metric.change < 0 ? (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    ) : null}
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="mt-1 h-10 w-16">
                          <svg width="100%" height="100%" viewBox="0 0 64 40" preserveAspectRatio="none">
                            <path
                              d={generateSparklinePoints(64, 40, metric.change > 0 ? 'up' : metric.change < 0 ? 'down' : 'neutral')}
                              fill="none"
                              stroke={metric.change > 0 ? "var(--emerald-500)" : metric.change < 0 ? "var(--primary)" : "var(--muted-foreground)"}
                              strokeWidth="2"
                            />
                          </svg>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Trend over the last 30 days</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}