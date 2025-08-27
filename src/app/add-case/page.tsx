
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import CaseEntryForm from '@/components/case-entry-form';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Smartphone, ServerIcon } from 'lucide-react';
import { addCase } from '@/lib/firebase';
import Logo from '@/components/logo';

function AddCasePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // Add key state to re-mount the form
  const [notificationResult, setNotificationResult] = useState<any>(null);
  
  const source = searchParams.get('source') as 'Mobile' | 'Desktop' | null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!isMounted) return;
    
    // Immediately show a "sending" message
    setNotificationResult({ message: "Adding case and sending notification(s)... Please wait." });

    try {
      const caseWithSource = { 
          ...newCase, 
          source: source === 'Mobile' ? 'Mobile' : 'Desktop'
      };
      
      // The addCase function from firebase.ts returns an object like { caseId, notificationResult }
      const result = await addCase(caseWithSource);
      
      // Update the state with the actual result from the server action
      setNotificationResult(result.notificationResult);

      toast({
        title: 'GOT IT',
        description: `Case for ${newCase.patientName} has been successfully added.`,
      });

      // Reset the form by changing the key, which forces a re-render
      setKey(Date.now());

    } catch (error: any) {
       console.error("Error during case addition or notification:", error);
       // Ensure any critical error is displayed
       setNotificationResult({ 
           success: false, 
           error: `A critical error occurred: ${error.message}` 
        });
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'Could not add the case or send notification. Check the server response.',
        });
    }
  };
  
  const handleUpdate = () => {
    // This page is only for adding, so we redirect home if an update is triggered.
    router.push('/');
  }

  if (!isMounted) {
      return null;
  }
  
  const isMobileSource = source === 'Mobile';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
           {isMobileSource ? (
            <div className="flex items-center gap-2 text-primary">
              <Smartphone />
              <span className="font-semibold">Mobile Entry Mode</span>
            </div>
          ) : (
            <Button asChild variant="outline">
              <Link href="/">
                  <Home className="mr-2" />
                  Back to Home
              </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl">
            {notificationResult && (
                <div className="mb-4 p-4 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800">
                    <h3 className="font-bold flex items-center gap-2"><ServerIcon className="h-5 w-5"/>Server Response:</h3>
                    <pre className="whitespace-pre-wrap break-words text-sm">
                      {JSON.stringify(notificationResult, null, 2)}
                    </pre>
                </div>
            )}
            <CaseEntryForm key={key} onAddCase={handleAddCase} onUpdate={handleUpdate} />
        </div>
      </main>
    </div>
  );
}


export default function AddCasePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AddCasePageContent />
        </Suspense>
    )
}
