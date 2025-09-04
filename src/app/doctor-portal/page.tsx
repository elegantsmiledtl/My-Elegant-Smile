
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DentalCase } from '@/types';
import CaseEntryForm from '@/components/case-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, LogOut, PlusCircle, BookOpen, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addCase, getUnreadNotifications, markNotificationAsRead } from '@/lib/firebase';
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
import { sendNewCaseNotification, sendNewCaseEmail } from '@/app/actions';


export default function DoctorPortalPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // For resetting the form
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);


  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setDentistName(user.name);
        setWelcomeMessage(user.welcomeMessage || `Welcome, ${user.name}`);
    } else {
        router.push('/login');
    }
  }, [router]);


  useEffect(() => {
    const checkForNotifications = async () => {
        if (dentistName) {
            try {
                const unreadNotifications = await getUnreadNotifications(dentistName);
                if (unreadNotifications.length > 0) {
                    setNotifications(unreadNotifications);
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
  
  const handleAddCase = async (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => {
    if (!isMounted) return;

    const caseData = { ...newCase, dentistName };

    try {
      // Step 1: Add the case to the database
       toast({
        title: 'Saving...',
        description: `Adding case for ${newCase.patientName}.`,
      });

      await addCase(caseData);
      
      toast({
        title: 'Case Added!',
        description: `Case for ${newCase.patientName} has been successfully saved. Now sending notification...`,
      });
      
      setKey(Date.now()); // Reset form

      // Step 2: Send notifications
      sendNewCaseNotification(caseData);
      sendNewCaseEmail(caseData);

    } catch (error: any) {
       console.error("Error during case addition or notification:", error);
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'Could not add the case. Please check the error message and try again.',
        });
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  const handleNotificationAcknowledge = () => {
    if (notifications.length > 0) {
      notifications.forEach(notif => {
        markNotificationAsRead(notif.id);
      });
      setNotifications([]);
    }
  };

  if (!isMounted || !dentistName) {
    return null; // Or a loading spinner
  }

  return (
    <>
      <AlertDialog open={notifications.length > 0}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>You have {notifications.length} new notification(s)</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                      <ul className="list-disc pl-5 space-y-2 mt-2">
                        {notifications.map(notif => (
                          <li key={notif.id} className="font-bold text-foreground">
                            {notif.message}
                          </li>
                        ))}
                      </ul>
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
                <div className="flex-1 flex justify-center">
                    <h2 className="text-xl font-bold text-primary">{welcomeMessage}</h2>
                </div>
                <div className="flex flex-col gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/doctor/invoices">
                            <Receipt className="mr-2 h-4 w-4" /> My Invoices
                        </Link>
                    </Button>
                    <Button onClick={handleLogout} variant="outline" size="sm">
                        <LogOut className="mr-2" /> Logout
                    </Button>
                </div>
            </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="w-full max-w-6xl mx-auto">
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                <CaseEntryForm 
                    key={key} 
                    onAddCase={handleAddCase} 
                    caseToEdit={{ dentistName: dentistName }} // Pre-fill dentist name
                />
                </CardContent>
            </Card>
          </div>
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
