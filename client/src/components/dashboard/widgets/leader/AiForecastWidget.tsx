import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Clock, DollarSign, Calendar, AlertCircle } from "lucide-react";

interface ForecastItem {
  id: string;
  message: string;
  type: 'warning' | 'info' | 'critical';
  icon: React.ReactNode;
  daysAhead: number;
}

interface AiForecastWidgetProps {
  projectId?: number;
}

export function AiForecastWidget({ projectId }: AiForecastWidgetProps) {
  const [predictions, setPredictions] = useState<ForecastItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from API
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock predictions data
        const mockPredictions: ForecastItem[] = [
          {
            id: '1',
            message: "You may exceed budget in 3 weeks based on current spending trends",
            type: 'warning',
            icon: <DollarSign className="h-5 w-5" />,
            daysAhead: 21
          },
          {
            id: '2',
            message: "4 tasks are trending late and may miss their deadlines",
            type: 'critical',
            icon: <Clock className="h-5 w-5" />,
            daysAhead: 5
          },
          {
            id: '3',
            message: "Resource allocation for UI design phase may be insufficient",
            type: 'warning',
            icon: <TrendingUp className="h-5 w-5" />,
            daysAhead: 14
          },
          {
            id: '4',
            message: "Team meeting attendance trending downward (-15%)",
            type: 'info',
            icon: <Calendar className="h-5 w-5" />,
            daysAhead: 7
          }
        ];

        setPredictions(mockPredictions);
      } catch (error) {
        console.error('Error fetching AI predictions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Get appropriate styling based on prediction type
  const getPredictionStyle = (type: 'warning' | 'info' | 'critical') => {
    switch (type) {
      case 'critical':
        return {
          bgColor: 'bg-primary/5 dark:bg-primary/20',
          borderColor: 'border-primary/20 dark:border-primary/30',
          iconBg: 'bg-primary/10 dark:bg-primary/30',
          iconColor: 'text-primary dark:text-primary/90',
          textColor: 'text-primary-foreground dark:text-primary/90'
        };
      case 'warning':
        return {
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800/30',
          iconBg: 'bg-amber-100 dark:bg-amber-800/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          textColor: 'text-amber-800 dark:text-amber-300'
        };
      case 'info':
        return {
          bgColor: 'bg-primary/5 dark:bg-primary/20',
          borderColor: 'border-primary/20 dark:border-primary/30',
          iconBg: 'bg-primary/10 dark:bg-primary/30',
          iconColor: 'text-primary dark:text-primary/90',
          textColor: 'text-primary-foreground dark:text-primary/90'
        };
    }
  };

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-5 w-5 text-primary mr-2" />
          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">AI Project Forecast</h3>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {predictions.map((prediction) => {
              const style = getPredictionStyle(prediction.type);
              
              return (
                <div 
                  key={prediction.id}
                  className={`rounded-lg p-3 border ${style.bgColor} ${style.borderColor}`}
                >
                  <div className="flex">
                    <div className={`p-2 rounded-full ${style.iconBg} ${style.iconColor} mr-3 self-start mt-0.5`}>
                      {prediction.icon}
                    </div>
                    <div>
                      <p className={`text-sm ${style.textColor}`}>{prediction.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {prediction.daysAhead === 0 
                          ? 'Predicted for today' 
                          : prediction.daysAhead === 1 
                            ? 'Predicted for tomorrow' 
                            : `Predicted in ${prediction.daysAhead} days`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {predictions.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <div className="mb-2">
                  <AlertTriangle className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-500" />
                </div>
                <p>No predictions available at this time</p>
                <p className="text-sm">Check back later for AI-generated insights</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <p>Predictions based on historical project data and current trends</p>
        </div>
      </CardContent>
    </Card>
  );
}