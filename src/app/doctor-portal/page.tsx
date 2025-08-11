
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DentalCase } from '@/types';
import CaseEntryForm from '@/components/case-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, LogOut, PlusCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addCase, getCasesByDoctor } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Logo from '@/components/logo';

export default function DoctorPortalPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // For resetting the form
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setDentistName(user.name);
    } else {
        router.push('/login');
    }
  }, [router]);

  const handleFirebaseError = (error: any) => {
    console.error("Firebase Error:", error);
    let description = 'An unexpected error occurred.';
    if (error.code === 'permission-denied') {
        description = 'You have insufficient permissions to access the database. Please update your Firestore security rules in the Firebase console.';
    }
    toast({
        variant: 'destructive',
        title: 'Database Error',
        description: description,
        action: error.code === 'permission-denied' ? (
            <a href="https://console.firebase.google.com/project/elegant-smile-r6jex/firestore/rules" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary">Fix Rules</Button>
            </a>
        ) : undefined,
    });
  };
  
  const fetchCasesForToast = async () => {
      if(dentistName) {
        try {
            await getCasesByDoctor(dentistName);
        } catch (error) {
            handleFirebaseError(error);
        }
      }
  };


  const handleAddCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    try {
      await addCase({ ...newCase, dentistName });
      toast({
        title: 'Case Added',
        description: `Case for ${newCase.patientName} has been successfully added.`,
      });
      setKey(Date.now()); // Reset form
    } catch (error) {
      handleFirebaseError(error);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  if (!isMounted || !dentistName) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
        <header className="bg-card border-b shadow-sm p-4">
            <div className="container mx-auto flex justify-between items-center">
                <Logo />
                <div className="flex items-center gap-4">
                     <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                        <Stethoscope className="w-6 h-6" />
                        Welcome, {dentistName}
                    </h2>
                    <Button onClick={handleLogout} variant="outline">
                        <LogOut className="mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="w-full max-w-4xl mx-auto">
            <CaseEntryForm 
                key={key} 
                onAddCase={handleAddCase} 
                caseToEdit={{ dentistName: dentistName }} // Pre-fill dentist name
            />
        </div>
        <div className="w-full max-w-4xl mx-auto flex justify-center">
             <Button asChild>
                <Link href={`/doctor/${encodeURIComponent(dentistName)}`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    View My Recorded Cases
                </Link>
            </Button>
        </div>
      </main>
    </div>
  );
}
