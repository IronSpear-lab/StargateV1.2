import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

interface RevenueData {
  day: string;
  current: number;
  previous: number;
}

export function RevenueOverviewWidget() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekTotal, setCurrentWeekTotal] = useState(0);
  const [previousWeekTotal, setPreviousWeekTotal] = useState(0);
  const [percentChange, setPercentChange] = useState(0);

  useEffect(() => {
    // In a real app, this would fetch from API
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock data matching the screenshot
        const mockData: RevenueData[] = [
          { day: 'Mon', current: 9000, previous: 5000 },
          { day: 'Tue', current: 18000, previous: 12000 },
          { day: 'Wed', current: 9000, previous: 16000 },
          { day: 'Thu', current: 27000, previous: 14000 },
          { day: 'Fri', current: 18000, previous: 22000 },
          { day: 'Sat', current: 36000, previous: 28000 },
          { day: 'Sun', current: 27000, previous: 22000 },
        ];

        setData(mockData);
        
        // Calculate totals
        const currentTotal = mockData.reduce((sum, item) => sum + item.current, 0);
        const previousTotal = mockData.reduce((sum, item) => sum + item.previous, 0);
        
        setCurrentWeekTotal(currentTotal);
        setPreviousWeekTotal(previousTotal);
        
        // Calculate percent change
        const change = ((currentTotal - previousTotal) / previousTotal) * 100;
        setPercentChange(change);
      } catch (error) {
        console.error('Error fetching revenue data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="w-full h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Today's Earning: {formatCurrency(2562.30)}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-[300px]">
                Etiam ultrices nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus...
              </p>
            </div>
          </div>
          
          <div className="mt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs py-1 px-3 h-8"
            >
              View Statements <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Week</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(currentWeekTotal)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Previous Week</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(previousWeekTotal)}</div>
              </div>
            </div>
            <div className={`flex items-center ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {percentChange >= 0 ? 
                <TrendingUp className="h-5 w-5 mr-1" /> : 
                <TrendingDown className="h-5 w-5 mr-1" />
              }
              <span className="font-semibold">{percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="flex-1 w-full h-36 mt-2">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value/1000}k`}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), '']}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: 'none',
                      borderRadius: '0.375rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="previous" 
                    name="Previous Week"
                    stroke="#818CF8" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="current" 
                    name="Current Week"
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}