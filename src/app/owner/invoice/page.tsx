
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt, Calendar } from 'lucide-react';
import Logo from '@/components/logo';
import { getCases } from '@/lib/firebase';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CasesTable from '@/components/cases-table';
import { DatePicker } from '@/components/ui/date-picker';
import { endOfDay, startOfDay } from 'date-fns';

const materialOptions = ["Zolid", "Zirconia", "Nickel Free", "N-Guard", "Implant", "MookUp"];

export default function InvoicePage() {
  const [allCases, setAllCases] = useState<DentalCase[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllCases = async () => {
      try {
        const casesFromDb = await getCases();
        setAllCases(casesFromDb);
      } catch (error) {
        console.error("Firebase Error:", error);
        toast({
          variant: 'destructive',
          title: 'Database Error',
          description: 'Could not fetch cases. Please try again.',
        });
      }
    };
    fetchAllCases();
  }, [toast]);

  const sortedDoctors = useMemo(() => {
    const doctorNames = new Set(allCases.map(c => c.dentistName));
    return Array.from(doctorNames).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const doctorCases = useMemo(() => {
    if (!selectedDoctor) return [];
    
    return allCases.filter(c => {
      if (c.dentistName !== selectedDoctor) return false;

      // Ensure createdAt exists and is a valid timestamp object
      if (!c.createdAt || typeof c.createdAt.toDate !== 'function') return false;
      const caseDate = c.createdAt.toDate();
      
      const isAfterFrom = fromDate ? caseDate >= startOfDay(fromDate) : true;
      const isBeforeTo = toDate ? caseDate <= endOfDay(toDate) : true;
      
      return isAfterFrom && isBeforeTo;
    });

  }, [allCases, selectedDoctor, fromDate, toDate]);

  const materialSummary = useMemo(() => {
    if (doctorCases.length === 0) return null;

    const summary = materialOptions.reduce((acc, material) => {
        acc[material] = 0;
        return acc;
    }, {} as Record<string, number>);

    doctorCases.forEach(c => {
        const materialsInCase = c.material.split(',').map(m => m.trim());
        materialsInCase.forEach(material => {
            if (summary.hasOwnProperty(material)) {
                summary[material]++;
            }
        });
    });

    return summary;
  }, [doctorCases]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/owner">
              <Home className="mr-2" />
              Back to Owner View
            </Link>
          </Button>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Invoice Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <p className="font-semibold">Select a doctor to generate an invoice:</p>
                <Select onValueChange={setSelectedDoctor} value={selectedDoctor || ''}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                        {sortedDoctors.map(doctor => (
                            <SelectItem key={doctor} value={doctor}>
                                {doctor}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
             {selectedDoctor && (
                 <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 border rounded-lg bg-muted/50">
                    <p className="font-semibold text-sm">Filter by creation date:</p>
                    <div className="flex gap-2 items-center">
                         <DatePicker value={fromDate} onChange={setFromDate} placeholder="From Date" />
                         <span>-</span>
                         <DatePicker value={toDate} onChange={setToDate} placeholder="To Date" />
                    </div>
                 </div>
            )}
            
            {materialSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Material Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {Object.entries(materialSummary).map(([material, count]) => (
                                <div key={material} className="p-4 bg-background rounded-lg text-center shadow">
                                    <p className="text-sm font-medium text-muted-foreground">{material}</p>
                                    <p className="text-2xl font-bold">{count}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedDoctor && (
              <div>
                <h3 className="text-xl font-bold mb-4">Cases for {selectedDoctor}</h3>
                <CasesTable cases={doctorCases} />
              </div>
            )}
            
            {!selectedDoctor && (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>Please select a doctor to view their cases.</p>
                </div>
            )}
           
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
