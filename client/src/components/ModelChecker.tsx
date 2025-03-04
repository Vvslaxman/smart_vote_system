
import { useState, useEffect } from 'react';
import { loadModels } from '@/lib/face';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function ModelChecker() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkModels() {
      try {
        await loadModels();
        setIsLoading(false);
      } catch (err) {
        console.error('Model checker error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load face detection models');
        setIsLoading(false);
      }
    }

    checkModels();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Loading face detection models...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Face Detection Error</AlertTitle>
        <AlertDescription>
          {error}. Some features requiring face detection may not work properly.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
