
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt } from 'lucide-react';
import Logo from '@/components/logo';
import { getInvoicesByDoctor } from '@/lib/firebase';
import type { Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import CasesTable from '@/components/cases-table';


export default function DoctorInvoicesPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        setDentistName(user.name);
    } else {
        router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (dentistName) {
      const fetchInvoices = async () => {
        setIsLoading(true);
        try {
          const fetchedInvoices = await getInvoicesByDoctor(dentistName);
          setInvoices(fetchedInvoices);
        } catch (error) {
          console.error("Firebase Error:", error);
          toast({
            variant: 'destructive',
            title: 'Database Error',
            description: 'Could not fetch your invoices. Please try again.',
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoices();
    }
  }, [dentistName, toast]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps or ISO strings from JSON
    const date = timestamp.toDate ? timestamp.toDate() : typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    if (!isValid(date)) return "Invalid Date";
    try {
        return format(date, 'PPP');
    } catch (e) {
        return "Invalid Date";
    }
  };
  
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    if (!isValid(date)) return "Invalid Date";
    try {
        return format(date, 'PPP p');
    } catch(e) {
        return "Invalid Date";
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/doctor-portal">
              <Home className="mr-2" />
              Back to Portal
            </Link>
          </Button>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              My Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
                <p>Loading invoices...</p>
            ) : invoices.length === 0 ? (
                <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>You have no invoices yet.</p>
                </div>
            ) : (
                <Accordion type="single" collapsible className="w-full">
                    {invoices.map((invoice, index) => (
                        <AccordionItem value={`item-${index}`} key={invoice.id}>
                            <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4">
                                    <span>Invoice from {formatDateTime(invoice.createdAt)}</span>
                                    <span className="font-bold text-primary">{invoice.grandTotal.toFixed(2)} JOD</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <Card className="m-2">
                                     <CardHeader>
                                        <CardTitle className="text-lg">Invoice Details</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Date Range: {invoice.fromDate ? formatDate(invoice.fromDate) : 'Start'} - {invoice.toDate ? formatDate(invoice.toDate) : 'End'}
                                        </p>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Material</TableHead>
                                                    <TableHead className="text-right">Tooth Count</TableHead>
                                                    <TableHead className="text-right">Price per Tooth (JOD)</TableHead>
                                                    <TableHead className="text-right">Total (JOD)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(invoice.summary).map(([material, data]) => (
                                                    data.toothCount > 0 && (
                                                        <TableRow key={material}>
                                                            <TableCell className="font-medium">{material}</TableCell>
                                                            <TableCell className="text-right">{data.toothCount}</TableCell>
                                                            <TableCell className="text-right">{data.price.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                {data.total.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                    <CardFooter className="bg-muted/50 p-4 justify-end">
                                        <div className="flex items-center gap-4">
                                            <p className="text-lg font-bold">Total:</p>
                                            <p className="text-2xl font-bold text-primary">
                                                {invoice.grandTotal.toFixed(2)} JOD
                                            </p>
                                        </div>
                                    </CardFooter>
                                </Card>

                                {invoice.cases && invoice.cases.length > 0 && (
                                  <Card className="m-2 mt-4">
                                    <CardHeader>
                                      <CardTitle className="text-lg">Cases Included in Invoice</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <CasesTable 
                                        cases={invoice.cases}
                                        hideDentist
                                        hideDeliveryDate
                                        hideShade
                                        hideSource
                                      />
                                    </CardContent>
                                  </Card>
                                )}

                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
