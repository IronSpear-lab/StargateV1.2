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
            message: "Du kan överskrida budget om 3 veckor baserat på nuvarande utgiftstrender",
            type: 'warning',
            icon: <DollarSign className="h-5 w-5" />,
            daysAhead: 21
          },
          {
            id: '2',
            message: "4 uppgifter är försenade och kan missa sina slutdatum",
            type: 'critical',
            icon: <Clock className="h-5 w-5" />,
            daysAhead: 5
          },
          {
            id: '3',
            message: "Resursallokering för UI-designfasen kan vara otillräcklig",
            type: 'warning',
            icon: <TrendingUp className="h-5 w-5" />,
            daysAhead: 14
          },
          {
            id: '4',
            message: "Närvaron på teammöten minskar (-15%)",
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
    <Card className="w-full h-full flex flex-col bg-white dark:bg-background overflow-hidden">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-5 w-5 text-primary mr-2" />
          <h3 className="text-md font-semibold text-foreground dark:text-foreground">AI-prognos</h3>
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
                      <p className="text-xs text-foreground/70 dark:text-foreground/70 mt-1">
                        {prediction.daysAhead === 0 
                          ? 'Förutsedd för idag' 
                          : prediction.daysAhead === 1 
                            ? 'Förutsedd för imorgon' 
                            : `Förutsedd om ${prediction.daysAhead} dagar`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {predictions.length === 0 && (
              <div className="text-center py-6 text-foreground/70 dark:text-foreground/70">
                <div className="mb-2">
                  <AlertTriangle className="h-10 w-10 mx-auto text-foreground/40 dark:text-foreground/40" />
                </div>
                <p>Inga förutsägelser tillgängliga just nu</p>
                <p className="text-sm">Återkom senare för AI-genererade insikter</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 pt-2 border-t border-border text-xs text-foreground/70 dark:text-foreground/70">
          <p>Förutsägelser baserade på historisk projektdata och aktuella trender</p>
        </div>
      </CardContent>
    </Card>
  );
}