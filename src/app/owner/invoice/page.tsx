
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt, FileDown } from 'lucide-react';
import Logo from '@/components/logo';
import { getCases } from '@/lib/firebase';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CasesTable from '@/components/cases-table';
import { DatePicker } from '@/components/ui/date-picker';
import { endOfDay, startOfDay, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const materialOptions = ["Zolid", "Zirconia", "Nickel Free", "N-Guard", "Implant", "MookUp"];

export default function InvoicePage() {
  const [allCases, setAllCases] = useState<DentalCase[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({
    "Zolid": 25,
    "Zirconia": 30,
    "Nickel Free": 20,
    "N-Guard": 15,
    "Implant": 50,
    "MookUp": 10
  });
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

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

      if (!c.createdAt || typeof c.createdAt.toDate !== 'function') return false;
      const caseDate = c.createdAt.toDate();
      
      const isAfterFrom = fromDate ? caseDate >= startOfDay(fromDate) : true;
      const isBeforeTo = toDate ? caseDate <= endOfDay(toDate) : true;
      
      return isAfterFrom && isBeforeTo;
    });

  }, [allCases, selectedDoctor, fromDate, toDate]);

  const handlePriceChange = (material: string, newPrice: string) => {
    const price = Number(newPrice);
    if (!isNaN(price)) {
        setMaterialPrices(prevPrices => ({
            ...prevPrices,
            [material]: price
        }));
    }
  };

  const invoiceSummary = useMemo(() => {
    if (doctorCases.length === 0) return null;

    const summary = materialOptions.reduce((acc, material) => {
        acc[material] = { toothCount: 0, price: materialPrices[material] || 0, total: 0 };
        return acc;
    }, {} as Record<string, { toothCount: number; price: number; total: number }>);

    doctorCases.forEach(c => {
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
  }, [doctorCases, materialPrices]);
  
  const handleSaveAsPdf = async () => {
    if (!invoiceRef.current || !selectedDoctor) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot generate PDF. Make sure an invoice is displayed.',
        });
        return;
    }
    
    setIsSavingPdf(true);

    try {
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        const fileName = `invoice-${selectedDoctor.replace(/\s/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
            
            {invoiceSummary && selectedDoctor && (
                <div ref={invoiceRef} className="p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Invoice for {selectedDoctor}</CardTitle>
                             <CardDescription>
                                {fromDate && toDate 
                                    ? `From ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}`
                                    : 'All dates'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead className="text-right">Tooth Count</TableHead>
                                        <TableHead className="text-right w-[150px]">Price per Tooth (JOD)</TableHead>
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
                                                    <Input
                                                        type="number"
                                                        value={data.price}
                                                        onChange={(e) => handlePriceChange(material, e.target.value)}
                                                        className="h-8 text-right"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">{data.total.toFixed(2)}</TableCell>
                                            </TableRow>
                                        )
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="bg-muted/50 p-4 justify-end">
                            <div className="flex items-center gap-4">
                                <p className="text-lg font-bold">Grand Total:</p>
                                <p className="text-2xl font-bold text-primary">{invoiceSummary.grandTotal.toFixed(2)} JOD</p>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}

             {invoiceSummary && (
                <div className="flex justify-end">
                    <Button onClick={handleSaveAsPdf} disabled={isSavingPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {isSavingPdf ? 'Saving...' : 'Save as PDF'}
                    </Button>
                </div>
            )}

            {selectedDoctor && (
              <div>
                <h3 className="text-xl font-bold mb-4 mt-6">Cases Included in Invoice</h3>
                <CasesTable cases={doctorCases} />
              </div>
            )}
            
            {!selectedDoctor && (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>Please select a doctor to view their cases and generate an invoice.</p>
                </div>
            )}
           
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
