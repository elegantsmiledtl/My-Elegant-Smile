
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import CaseEntryForm from '@/components/case-entry-form';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Smartphone } from 'lucide-react';
import { addCase } from '@/lib/firebase';
import Logo from '@/components/logo';
import { sendNewCaseNotification, sendNewCaseEmail } from '@/app/actions';

function AddCasePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // Add key state to re-mount the form
  
  const source = searchParams.get('source');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!isMounted) return;
    

    try {
      // Step 1: Add the case to the database
      toast({
        title: 'Saving...',
        description: `Adding case for ${newCase.patientName}.`,
      });

      await addCase(newCase);
      
      toast({
        title: 'Case Added!',
        description: `Case for ${newCase.patientName} has been successfully saved. Now sending notification...`,
      });
      
      // Reset the form by changing the key
      setKey(Date.now());

      // Step 2: Send notifications (no need to await all of them if we don't show results)
      sendNewCaseNotification(newCase);
      sendNewCaseEmail(newCase);


    } catch (error: any) {
       console.error("Error during case addition or notification:", error);
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'Could not add the case. Please check the error message and try again.',
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
  
  const isMobileSource = true;

  return (
    <div className="min-h-screen bg-background text-foreground">
       <header className={`bg-card border-b shadow-sm p-4 ${isMobileSource ? 'sticky top-0 z-10' : ''}`}>
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
