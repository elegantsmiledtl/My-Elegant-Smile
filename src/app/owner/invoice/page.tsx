
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
    const invoiceElement = invoiceRef.current;
    if (!invoiceElement || !selectedDoctor) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot generate PDF. Make sure an invoice is displayed.',
        });
        return;
    }

    setIsSavingPdf(true);

    // Use a timeout to allow React to re-render with isSavingPdf=true before we manipulate the DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    const cleanupNodes: { parent: HTMLElement; node: HTMLElement }[] = [];

    // Temporarily replace inputs with static text for PDF generation
    const priceInputs = invoiceElement.querySelectorAll<HTMLInputElement>('input[type="number"]');
    priceInputs.forEach(input => {
        const parent = input.parentElement;
        if (parent) {
            const textNode = document.createElement('span');
            textNode.textContent = input.value;
            parent.insertBefore(textNode, input);
            cleanupNodes.push({ parent, node: textNode });
            input.style.display = 'none';
        }
    });

    // Temporarily replace calculated totals with static text
    if (invoiceSummary) {
        Object.entries(invoiceSummary.summary).forEach(([material, data]) => {
            if (data.toothCount > 0) {
                const totalCell = invoiceElement.querySelector(`[data-total-for="${material}"]`);
                if (totalCell) {
                    const textNode = document.createElement('span');
                    textNode.textContent = data.total.toFixed(2);
                    totalCell.appendChild(textNode);
                    cleanupNodes.push({ parent: totalCell as HTMLElement, node: textNode });
                }
            }
        });
        const grandTotalCell = invoiceElement.querySelector('[data-grand-total]');
        if (grandTotalCell) {
             const textNode = document.createElement('span');
             textNode.textContent = `${invoiceSummary.grandTotal.toFixed(2)} JOD`;
             grandTotalCell.appendChild(textNode);
             cleanupNodes.push({ parent: grandTotalCell as HTMLElement, node: textNode });
        }
    }


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
        const imgY = 10; // Margin from top

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
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
        // Restore the inputs and totals
        priceInputs.forEach(input => {
            input.style.display = '';
        });
        cleanupNodes.forEach(({ parent, node }) => {
            if (parent.contains(node)) {
                parent.removeChild(node);
            }
        });

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
        <div ref={invoiceRef}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              Invoice Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6" >
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
            
            <div className="p-4">
              {invoiceSummary && selectedDoctor && (
                  <div className="space-y-6">
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-xl">Invoice for {selectedDoctor}</CardTitle>
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
                                                  <TableCell className="text-right font-semibold" data-total-for={material}>
                                                    {isSavingPdf ? null : data.total.toFixed(2)}
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
                                  <p className="text-2xl font-bold text-primary" data-grand-total>
                                    {isSavingPdf ? null : `${invoiceSummary.grandTotal.toFixed(2)} JOD`}
                                  </p>
                              </div>
                          </CardFooter>
                      </Card>

                      <div>
                        <h3 className="text-xl font-bold mb-4 mt-6">Cases Included in Invoice</h3>
                        <CasesTable 
                            cases={doctorCases} 
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
            
            {!selectedDoctor && (
                 <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <p>Please select a doctor to view their cases and generate an invoice.</p>
                </div>
            )}
        </Card>
        </div>
      </main>
    </div>
  );
}
