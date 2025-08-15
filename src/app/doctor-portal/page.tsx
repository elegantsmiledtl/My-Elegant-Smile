
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { DentalCase } from '@/types';
import CaseEntryForm from '@/components/case-entry-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, LogOut, PlusCircle, BookOpen, Receipt, Edit, Save, RefreshCw } from 'lucide-react';
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
import { Input } from '@/components/ui/input';


const initialHeaderConfig = {
  logo: { text: 'Elegant Smile', top: '1rem', left: '1rem' },
  welcome: { text: 'Welcome, {dentistName}', top: '1rem', right: '8rem' },
  logout: { text: 'Logout', top: '3.5rem', right: '8rem' },
  invoices: { text: 'My Invoices', top: '3.5rem', right: '1rem' },
};


export default function DoctorPortalPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(Date.now()); // For resetting the form
  const { toast } = useToast();
  const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);

  // Header customization state
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerConfig, setHeaderConfig] = useState(initialHeaderConfig);
  const headerRef = useRef<HTMLDivElement>(null);
  const draggedItemRef = useRef<{element: HTMLElement, x: number, y: number} | null>(null);


  useEffect(() => {
    setIsMounted(true);
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setDentistName(user.name);
    } else {
        router.push('/login');
    }

    const savedHeaderConfig = localStorage.getItem('doctorPortalHeaderConfig');
    if (savedHeaderConfig) {
        setHeaderConfig(JSON.parse(savedHeaderConfig));
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
    localStorage.removeItem('doctorPortalHeaderConfig'); // Also clear header config on logout
    router.push('/login');
  };

  const handleNotificationAcknowledge = () => {
    if (notification) {
      markNotificationAsRead(notification.id);
      setNotification(null);
    }
  };

  // --- Header Customization Handlers ---
  
  const handleSaveHeader = () => {
    localStorage.setItem('doctorPortalHeaderConfig', JSON.stringify(headerConfig));
    setIsEditingHeader(false);
    toast({ title: 'Header Saved', description: 'Your custom header layout has been saved.' });
  };

  const handleResetHeader = () => {
    setHeaderConfig(initialHeaderConfig);
    localStorage.removeItem('doctorPortalHeaderConfig');
    toast({ title: 'Header Reset', description: 'The header has been reset to the default layout.' });
  };

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!isEditingHeader || !(e.target instanceof HTMLElement)) return;
    const draggable = e.target.closest('[data-draggable="true"]');
    if (draggable instanceof HTMLElement) {
      draggedItemRef.current = {
        element: draggable,
        x: e.clientX - draggable.offsetLeft,
        y: e.clientY - draggable.offsetTop,
      };
      e.preventDefault(); // prevent text selection
    }
  };

  const handleHeaderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditingHeader || !draggedItemRef.current || !headerRef.current) return;
    
    const headerRect = headerRef.current.getBoundingClientRect();
    let newLeft = e.clientX - draggedItemRef.current.x;
    let newTop = e.clientY - draggedItemRef.current.y;
    
    // Constrain within header bounds
    newLeft = Math.max(0, Math.min(newLeft, headerRect.width - draggedItemRef.current.element.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, headerRect.height - draggedItemRef.current.element.offsetHeight));

    draggedItemRef.current.element.style.left = `${newLeft}px`;
    draggedItemRef.current.element.style.top = `${newTop}px`;
    // Clear right/bottom to avoid conflicts
    draggedItemRef.current.element.style.right = 'auto';
    draggedItemRef.current.element.style.bottom = 'auto';
  };
  
  const handleHeaderMouseUp = () => {
     if (draggedItemRef.current) {
      const { element } = draggedItemRef.current;
      const key = element.dataset.key as keyof typeof headerConfig;
      if (key) {
        setHeaderConfig(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            left: element.style.left,
            top: element.style.top,
            right: 'auto',
            bottom: 'auto'
          }
        }));
      }
    }
    draggedItemRef.current = null;
  };

  const handleHeaderConfigChange = (key: keyof typeof headerConfig, field: 'text', value: string) => {
    setHeaderConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };
  
  const renderWelcomeText = () => {
    return headerConfig.welcome.text.replace('{dentistName}', dentistName);
  }

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
          <header 
            ref={headerRef}
            onMouseMove={handleHeaderMouseMove}
            onMouseUp={handleHeaderMouseUp}
            onMouseLeave={handleHeaderMouseUp} // Stop dragging if mouse leaves header
            className={`bg-card border-b shadow-sm p-4 relative min-h-[8rem] ${isEditingHeader ? 'cursor-move border-2 border-dashed border-primary' : ''}`}
          >
            <div className="container mx-auto h-full">
              {!isEditingHeader ? (
                <>
                    <div style={{ position: 'absolute', ...headerConfig.logo }}>
                        <Logo />
                    </div>
                    <div style={{ position: 'absolute', ...headerConfig.welcome }} className="flex items-center gap-2">
                         <Stethoscope className="w-6 h-6 text-primary" />
                         <h2 className="text-xl font-bold text-primary">{renderWelcomeText()}</h2>
                    </div>
                    <Button onClick={handleLogout} variant="outline" style={{ position: 'absolute', ...headerConfig.logout }}>
                        <LogOut className="mr-2" /> {headerConfig.logout.text}
                    </Button>
                    <Button asChild variant="outline" style={{ position: 'absolute', ...headerConfig.invoices }}>
                        <Link href="/doctor/invoices">
                            <Receipt className="mr-2 h-4 w-4" /> {headerConfig.invoices.text}
                        </Link>
                    </Button>
                </>
              ) : (
                <>
                  <div
                    data-draggable="true" data-key="logo"
                    onMouseDown={handleHeaderMouseDown}
                    style={{ position: 'absolute', ...headerConfig.logo }} className="p-2 border border-dashed border-gray-400">
                    <Input value={headerConfig.logo.text} onChange={(e) => handleHeaderConfigChange('logo', 'text', e.target.value)} className="w-auto" />
                  </div>

                  <div
                    data-draggable="true" data-key="welcome"
                    onMouseDown={handleHeaderMouseDown}
                    style={{ position: 'absolute', ...headerConfig.welcome }} className="p-2 border border-dashed border-gray-400">
                    <Input value={headerConfig.welcome.text} onChange={(e) => handleHeaderConfigChange('welcome', 'text', e.target.value)} className="w-auto" placeholder="Welcome message..."/>
                  </div>
                  
                  <div data-draggable="true" data-key="logout" onMouseDown={handleHeaderMouseDown} style={{ position: 'absolute', ...headerConfig.logout }}>
                    <Button variant="outline"><LogOut className="mr-2" /><Input value={headerConfig.logout.text} onChange={(e) => handleHeaderConfigChange('logout', 'text', e.target.value)} className="w-20" /></Button>
                  </div>

                   <div data-draggable="true" data-key="invoices" onMouseDown={handleHeaderMouseDown} style={{ position: 'absolute', ...headerConfig.invoices }}>
                    <Button variant="outline"><Receipt className="mr-2" /><Input value={headerConfig.invoices.text} onChange={(e) => handleHeaderConfigChange('invoices', 'text', e.target.value)} className="w-28"/></Button>
                  </div>
                </>
              )}
            </div>
             <div className="absolute top-1 right-1 flex gap-2">
                {!isEditingHeader ? (
                    <Button variant="ghost" size="icon" onClick={() => setIsEditingHeader(true)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                ) : (
                    <>
                        <Button variant="ghost" size="icon" onClick={handleSaveHeader}>
                            <Save className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleResetHeader}>
                            <RefreshCw className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditingHeader(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                )}
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

    