
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt, FileDown, LogOut } from 'lucide-react';
import Logo from '@/components/logo';
import { getCasesByDoctor } from '@/lib/firebase';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import CasesTable from '@/components/cases-table';
import { DatePicker } from '@/components/ui/date-picker';
import { endOfDay, startOfDay, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';


const materialPrices: Record<string, number> = {
    "Zolid": 25,
    "Zirconia": 30,
    "Nickel Free": 20,
    "N-Guard": 15,
    "Implant": 50,
    "MookUp": 10
};
const materialOptions = Object.keys(materialPrices);

export default function DoctorInvoicePage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState<string>('');
  const [doctorCases, setDoctorCases] = useState<DentalCase[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

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
    const fetchDoctorCases = async () => {
      if (dentistName) {
        try {
          const casesFromDb = await getCasesByDoctor(dentistName);
          setDoctorCases(casesFromDb);
        } catch (error) {
          console.error("Firebase Error:", error);
          toast({
            variant: 'destructive',
            title: 'Database Error',
            description: 'Could not fetch your cases. Please try again.',
          });
        }
      }
    };
    fetchDoctorCases();
  }, [dentistName, toast]);

  const filteredCases = useMemo(() => {
    if (!dentistName) return [];
    
    return doctorCases.filter(c => {
      if (!c.createdAt || typeof c.createdAt.toDate !== 'function') return false;
      const caseDate = c.createdAt.toDate();
      
      const isAfterFrom = fromDate ? caseDate >= startOfDay(fromDate) : true;
      const isBeforeTo = toDate ? caseDate <= endOfDay(toDate) : true;
      
      return isAfterFrom && isBeforeTo;
    });

  }, [doctorCases, dentistName, fromDate, toDate]);

  const invoiceSummary = useMemo(() => {
    if (filteredCases.length === 0) return null;

    const summary = materialOptions.reduce((acc, material) => {
        acc[material] = { toothCount: 0, price: materialPrices[material] || 0, total: 0 };
        return acc;
    }, {} as Record<string, { toothCount: number; price: number; total: number }>);

    filteredCases.forEach(c => {
        const toothCountInCase = c.toothNumbers.split(',').filter(t => t.trim() !== '').length;
        const materialsInCase = c.material.split(',').map(m => m.trim());
        materialsInCase.forEach(material => {
            if (summary.hasOwnProperty(material)) {
                summary[material].toothCount += toothCountInCase;
            }
        });
    });

    let grandTotal = 0;
    Object.keys(summary).forEach(material => {
        const materialInfo = summary[material];
        materialInfo.total = materialInfo.toothCount * materialInfo.price;
        grandTotal += materialInfo.total;
    });

    return { summary, grandTotal };
  }, [filteredCases]);
  
  const handleSaveAsPdf = async () => {
    const invoiceElement = invoiceRef.current;
    if (!invoiceElement || !dentistName) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot generate PDF. Make sure an invoice is displayed.',
        });
        return;
    }

    setIsSavingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await html2canvas(invoiceElement, { scale: 1 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        const fileName = `invoice-${dentistName.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        pdf.save(fileName);

        toast({
            title: 'Success',
            description: 'Invoice has been saved as a PDF.',
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        toast({
            variant: 'destructive',
            title: 'PDF Error',
            description: 'Failed to generate PDF file.',
        });
    } finally {
        setIsSavingPdf(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  if (!dentistName) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
           <div className="flex items-center gap-4">
               <Button asChild variant="outline">
                <Link href="/doctor-portal">
                  <Home className="mr-2" />
                  Back to Portal
                </Link>
              </Button>
               <Button onClick={handleLogout} variant="outline">
                <LogOut className="mr-2" />
                Logout
              </Button>
          </div>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <div ref={invoiceRef}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              My Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6" >
             <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 border rounded-lg bg-muted/50">
                <p className="font-semibold text-sm">Filter by creation date:</p>
                <div className="flex gap-2 items-center">
                     <DatePicker value={fromDate} onChange={setFromDate} placeholder="From Date" />
                     <span>-</span>
                     <DatePicker value={toDate} onChange={setToDate} placeholder="To Date" />
                </div>
             </div>
            
            <div className="p-4">
              {invoiceSummary && (
                  <div className="space-y-6">
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-xl">Invoice for {dentistName}</CardTitle>
                               {fromDate && toDate 
                                    ? <p className="text-sm text-muted-foreground">From {format(fromDate, 'PPP')} to {format(toDate, 'PPP')}</p>
                                    : <p className="text-sm text-muted-foreground">All dates</p>
                                }
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
                                      {Object.entries(invoiceSummary.summary).map(([material, data]) => (
                                          data.toothCount > 0 && (
                                              <TableRow key={material}>
                                                  <TableCell className="font-medium">{material}</TableCell>
                                                  <TableCell className="text-right">{data.toothCount}</TableCell>
                                                  <TableCell className="text-right">
                                                     {data.price.toFixed(2)}
                                                  </TableCell>
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
                                    {`${invoiceSummary.grandTotal.toFixed(2)} JOD`}
                                  </p>
                              </div>
                          </CardFooter>
                      </Card>

                      <div>
                        <h3 className="text-xl font-bold mb-4 mt-6">Cases Included in Invoice</h3>
                        <CasesTable 
                            cases={filteredCases} 
                            hideDentist 
                            hideDeliveryDate 
                            hideShade 
                            hideSource
                        />
                      </div>
                  </div>
              )}
            </div>
           
          </CardContent>
           {invoiceSummary && (
                <div className="flex justify-end p-6 pt-0">
                    <Button onClick={handleSaveAsPdf} disabled={isSavingPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {isSavingPdf ? 'Saving...' : 'Save as PDF'}
                    </Button>
                </div>
            )}
            
            {!invoiceSummary && (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>No cases found for the selected date range.</p>
                </div>
            )}
        </Card>
        </div>
      </main>
    </div>
  );
}

