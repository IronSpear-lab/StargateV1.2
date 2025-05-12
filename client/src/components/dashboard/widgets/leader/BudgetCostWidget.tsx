import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface BudgetCostData {
  name: string;
  plannedBudget: number;
  actualCost: number;
}

interface BudgetCostWidgetProps {
  projectId?: number;
}

export function BudgetCostWidget({ projectId }: BudgetCostWidgetProps) {
  const [data, setData] = useState<BudgetCostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetDifference, setBudgetDifference] = useState(0);

  useEffect(() => {
    // In a real app, this would fetch from API
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data for the chart
        const mockData: BudgetCostData[] = [
          { name: 'Vecka 1', plannedBudget: 4000, actualCost: 3800 },
          { name: 'Vecka 2', plannedBudget: 8000, actualCost: 8200 },
          { name: 'Vecka 3', plannedBudget: 12000, actualCost: 12400 },
          { name: 'Vecka 4', plannedBudget: 16000, actualCost: 17000 },
          { name: 'Vecka 5', plannedBudget: 20000, actualCost: 21500 },
          { name: 'Vecka 6', plannedBudget: 24000, actualCost: 24600 },
          { name: 'Vecka 7', plannedBudget: 28000, actualCost: 29500 },
          { name: 'Vecka 8', plannedBudget: 32000, actualCost: 32800 },
        ];

        setData(mockData);
        
        // Calculate the difference for the current week
        const lastWeek = mockData[mockData.length - 1];
        const difference = ((lastWeek.actualCost - lastWeek.plannedBudget) / lastWeek.plannedBudget) * 100;
        setBudgetDifference(difference);
      } catch (error) {
        console.error('Error fetching budget data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-background overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-4 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Budget</h3>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {formatCurrency(data.length > 0 ? data[data.length - 1]?.plannedBudget : 0)}
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Denna Vecka</h3>
              <p className={`text-lg font-semibold ${budgetDifference > 0 ? 'text-primary dark:text-primary' : 'text-emerald-500 dark:text-emerald-400'}`}>
                {budgetDifference > 0 ? '+' : ''}{budgetDifference.toFixed(1)}% <span className="text-gray-600 dark:text-gray-400">över budget</span>
              </p>
            </div>
          </div>
          
          <div className="flex-1 w-full h-48 mt-2">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--emerald-500)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--emerald-500)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), '']}
                    labelFormatter={(label) => `Vecka: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="plannedBudget" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBudget)" 
                    name="Planerad Budget"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actualCost" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCost)" 
                    name="Faktisk Kostnad"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="mt-auto p-4 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-between text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary"
          >
            Visa ekonomisk rapport <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}