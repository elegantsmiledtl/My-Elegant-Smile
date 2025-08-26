
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

function AddCasePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // Add key state to re-mount the form
  
  const source = searchParams.get('source') as 'Mobile' | 'Desktop' | null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!isMounted) return;
    try {
      const caseWithSource = { 
          ...newCase, 
          source: source === 'Mobile' ? 'Mobile' : 'Desktop'
      };
      
      const { notificationResult } = await addCase(caseWithSource);
      
      toast({
        title: 'GOT IT',
        description: `Case for ${newCase.patientName} has been successfully added.`,
      });

      // Display notification status
      if (notificationResult.success) {
        toast({
            title: 'Notification Sent!',
            description: `WhatsApp message sent. SID: ${notificationResult.sid}`,
        });
      } else {
         toast({
            variant: 'destructive',
            title: 'Notification Failed',
            description: `Error: ${notificationResult.error}`,
            duration: 9000 // Show for longer so it can be read
        });
      }


      // Reset the form by changing the key, which forces a re-render
      setKey(Date.now());

    } catch (error) {
       console.error("Firebase Error:", error);
        toast({
            variant: 'destructive',
            title: 'Database Error',
            description: 'Could not add the case. Please check your connection and permissions.',
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
