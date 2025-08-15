
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DentalCase } from '@/types';
import CaseEntryForm from '@/components/case-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, LogOut, PlusCircle, BookOpen, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addCase, getCasesByDoctor, getUnreadNotifications, markNotificationAsRead } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Logo from '@/components/logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function DoctorPortalPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // For resetting the form
  const { toast } = useToast();
  const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);


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


  useEffect(() => {
    const checkForNotifications = async () => {
        if (dentistName) {
            try {
                const notifications = await getUnreadNotifications(dentistName);
                if (notifications.length > 0) {
                    // Show one notification at a time
                    const firstUnread = notifications[0];
                    setNotification({ id: firstUnread.id, message: firstUnread.message });
                }
            } catch (error) {
                console.error("Failed to check for notifications:", error);
            }
        }
    };
    if (isMounted) {
        checkForNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dentistName, isMounted]);


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

  const handleNotificationAcknowledge = () => {
    if (notification) {
      markNotificationAsRead(notification.id);
      setNotification(null);
    }
  };

  if (!isMounted || !dentistName) {
    return null; // Or a loading spinner
  }

  return (
    <>
      <AlertDialog open={!!notification}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Notification</AlertDialogTitle>
                  <AlertDialogDescription className="font-bold">
                      {notification?.message}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={handleNotificationAcknowledge}>
                      Got It
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background text-foreground">
          <header className="bg-card border-b shadow-sm p-4">
              <div className="container mx-auto flex justify-between items-center">
                  <Logo />
                  <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-primary" />
                                <h2 className="text-xl font-bold text-primary">
                                    Welcome, {dentistName}
                                </h2>
                            </div>
                            <Button onClick={handleLogout} variant="outline">
                                <LogOut className="mr-2" />
                                Logout
                            </Button>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/doctor/invoices">
                                <Receipt className="mr-2 h-4 w-4" />
                                My Invoices
                            </Link>
                        </Button>
                    </div>
              </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Card className="w-full max-w-6xl mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <PlusCircle className="w-6 h-6 text-primary" />
                Add New Case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CaseEntryForm 
                  key={key} 
                  onAddCase={handleAddCase} 
                  caseToEdit={{ dentistName: dentistName }} // Pre-fill dentist name
              />
            </CardContent>
          </Card>
          <div className="w-full max-w-6xl mx-auto flex justify-center">
              <Button asChild>
                  <Link href={`/doctor/${encodeURIComponent(dentistName)}`}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      View My Recorded Cases
                  </Link>
              </Button>
          </div>
        </main>
      </div>
    </>
  );
}
