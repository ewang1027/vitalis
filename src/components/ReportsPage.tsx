import React from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ReportsPage() {
  const mockReports = [
    { id: 1, name: 'Daily Patient Census', date: '2024-01-15', type: 'Census', size: '2.4 MB' },
    { id: 2, name: 'Equipment Utilization Report', date: '2024-01-14', type: 'Operations', size: '1.8 MB' },
    { id: 3, name: 'Staff Productivity Analysis', date: '2024-01-13', type: 'HR', size: '3.1 MB' },
    { id: 4, name: 'Monthly Financial Summary', date: '2024-01-01', type: 'Finance', size: '5.2 MB' },
    { id: 5, name: 'Patient Satisfaction Survey', date: '2024-01-10', type: 'Quality', size: '1.5 MB' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Census': return 'bg-blue-500';
      case 'Operations': return 'bg-green-500';
      case 'HR': return 'bg-purple-500';
      case 'Finance': return 'bg-orange-500';
      case 'Quality': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border-light))' }}>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Reports</p>
                <p className="text-lg font-bold">5</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-lg font-bold">12</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border-light))' }}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            Generate New
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Export All
          </Button>
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockReports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1">
                  <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">{report.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`${getTypeColor(report.type)} text-white text-xs px-2 py-0.5 rounded`}>
                        {report.type}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{report.date}</span>
                </div>
                <span className="text-muted-foreground">{report.size}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

