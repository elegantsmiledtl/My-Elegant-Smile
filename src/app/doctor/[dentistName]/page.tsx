
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { DentalCase } from '@/types';
import CasesTable from '@/components/cases-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, User, Search, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCasesByDoctor, requestCaseDeletion } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/logo';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseISO, format } from 'date-fns';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DoctorPage() {
  const params = useParams();
  const dentistName = params.dentistName ? decodeURIComponent(params.dentistName as string) : '';
  const [doctorCases, setDoctorCases] = useState<DentalCase[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

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

  const fetchDoctorCases = useCallback(async () => {
      if(dentistName) {
        try {
            const casesFromDb = await getCasesByDoctor(dentistName);
            setDoctorCases(casesFromDb);
        } catch (error) {
            handleFirebaseError(error);
        }
      }
  }, [dentistName]);

  useEffect(() => {
    setIsMounted(true);
    fetchDoctorCases();
  }, [fetchDoctorCases]);

  const handleRequestDeletion = async (caseId: string, patientName: string) => {
    try {
      await requestCaseDeletion(caseId, patientName);
      toast({
        title: 'Deletion Requested',
        description: 'The owner has been notified of your request to delete this case.',
      });
      fetchDoctorCases(); // Re-fetch to update UI
    } catch(error) {
      handleFirebaseError(error);
    }
  };

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    doctorCases.forEach(c => {
        if (c.createdAt) {
            const date = c.createdAt.toDate ? c.createdAt.toDate() : parseISO(c.createdAt);
            months.add(format(date, 'yyyy-MM'));
        }
    });
    return Array.from(months).sort().reverse();
  }, [doctorCases]);

  const filteredCases = useMemo(() => {
    let casesToDisplay = doctorCases; // Start with all cases for the doctor
    
    // For Dr. Ibraheem Omar, apply search and month filters but do not filter by isDeleted
    if (dentistName === 'Dr.Ibraheem Omar') {
       return casesToDisplay.filter(c => {
          const patientMatch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase());
          
          const monthMatch = selectedMonth === 'all' || (c.createdAt && format(c.createdAt.toDate ? c.createdAt.toDate() : parseISO(c.createdAt), 'yyyy-MM') === selectedMonth);

          return patientMatch && monthMatch;
      });
    }
    
    // For other doctors, hide deleted cases
    return casesToDisplay.filter(c => !c.isDeleted);

  }, [doctorCases, searchQuery, selectedMonth, dentistName]);
  
  if (!isMounted) {
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
                        Cases for {dentistName}
                    </h2>
                    <Button asChild>
                        <Link href={`/login?name=${encodeURIComponent(dentistName)}`}>
                            <User className="mr-2" />
                            My Cases
                        </Link>
                    </Button>
                </div>
            </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card className="shadow-lg">
           <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <CardTitle>My Case History</CardTitle>
                    {dentistName === 'Dr.Ibraheem Omar' && (
                      <div className="flex gap-2 items-center">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                  placeholder="Search by patient..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-10 w-[250px]"
                              />
                          </div>
                          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger className="w-[180px]">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  <SelectValue placeholder="Filter by month..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Months</SelectItem>
                                  {monthOptions.map(month => (
                                      <SelectItem key={month} value={month}>
                                          {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                    )}
                </div>
            </CardHeader>
          <CardContent className="pt-0">
            <CasesTable 
              cases={filteredCases}
              onDeletionRequest={dentistName === 'Dr.Ibraheem Omar' ? handleRequestDeletion : undefined}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
