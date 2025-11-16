import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, XCircle, Info } from 'lucide-react';
import { runOpenRouterDiagnostics, type DebugReport } from '@/utils/openrouterDebug';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OpenRouterStatus() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<DebugReport | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await runOpenRouterDiagnostics();
      setReport(result);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          OpenRouter API Status
        </CardTitle>
        <CardDescription>
          Diagnose connection issues with OpenRouter API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>

        {report && (
          <div className="space-y-4">
            {/* Status Checks */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Status Checks</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  {getStatusIcon(report.apiKeyConfigured)}
                  <span className="text-sm">API Key Configured</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  {getStatusIcon(report.apiKeyValid)}
                  <span className="text-sm">API Key Valid</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  {getStatusIcon(report.networkReachable)}
                  <span className="text-sm">Network Reachable</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded">
                  {getStatusIcon(report.simpleRequestWorks)}
                  <span className="text-sm">API Working</span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {report.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors Found</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {report.errors.map((error, i) => (
                      <li key={i} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {report.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {report.warnings.map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Recommendations</AlertTitle>
                <AlertDescription>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {report.errors.length === 0 && report.simpleRequestWorks && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">
                  All Systems Operational
                </AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-300">
                  OpenRouter API is working correctly. If you're still experiencing issues,
                  check the browser console for detailed logs.
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t space-y-2">
              <h3 className="font-semibold text-sm">Quick Actions</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://status.openrouter.ai/', '_blank')}
                >
                  Check OpenRouter Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://openrouter.ai/keys', '_blank')}
                >
                  API Keys Dashboard
                </Button>
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-slate-500">
              Last checked: {new Date(report.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {!report && (
          <div className="text-sm text-slate-500 text-center py-4">
            Click "Run Diagnostics" to check OpenRouter API status
          </div>
        )}
      </CardContent>
    </Card>
  );
}

