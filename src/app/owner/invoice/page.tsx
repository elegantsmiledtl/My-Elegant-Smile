
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt, FileDown, Send, Trash2, History } from 'lucide-react';
import Logo from '@/components/logo';
import { getCases, saveInvoice, getInvoicesByDoctor, deleteInvoice } from '@/lib/firebase';
import type { DentalCase, Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CasesTable from '@/components/cases-table';
import { DatePicker } from '@/components/ui/date-picker';
import { endOfDay, startOfDay, format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Checkbox } from '@/components/ui/checkbox';


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
  const printableInvoiceRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedInvoices, setSharedInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);


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

  const fetchSharedInvoices = async (doctorName: string) => {
    try {
        const invoices = await getInvoicesByDoctor(doctorName);
        setSharedInvoices(invoices);
    } catch (error) {
        console.error("Firebase Error:", error);
        toast({
            variant: 'destructive',
            title: 'Database Error',
            description: 'Could not fetch shared invoices.',
        });
    }
  }

  useEffect(() => {
    if (selectedDoctor) {
        fetchSharedInvoices(selectedDoctor);
        setSelectedInvoices([]); // Reset selection when doctor changes
    } else {
        setSharedInvoices([]);
    }
  }, [selectedDoctor, toast]);

  const sortedDoctors = useMemo(() => {
    const doctorNames = new Set(allCases.map(c => c.dentistName));
    return Array.from(doctorNames).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const invoiceSummary = useMemo(() => {
    if (!selectedDoctor || !fromDate || !toDate) return null;

     const filteredCasesByDate = allCases.filter(c => {
       if (c.dentistName !== selectedDoctor) return false;
       if (!c.createdAt) return false;
       
        let caseDate;
        if (typeof c.createdAt.toDate === 'function') {
            caseDate = c.createdAt.toDate();
        } else {
            caseDate = new Date(c.createdAt);
        }
       if (isNaN(caseDate.getTime())) return false;
       
        const isAfterFrom = fromDate ? caseDate >= startOfDay(fromDate) : true;
        const isBeforeTo = toDate ? caseDate <= endOfDay(toDate) : true;
        return isAfterFrom && isBeforeTo;
    });

    if (filteredCasesByDate.length === 0) return null;

    const summary = materialOptions.reduce((acc, material) => {
        acc[material] = { toothCount: 0, price: materialPrices[material] || 0, total: 0 };
        return acc;
    }, {} as Record<string, { toothCount: number; price: number; total: number }>);

    filteredCasesByDate.forEach(c => {
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

    return { summary, grandTotal, cases: filteredCasesByDate };
  }, [allCases, selectedDoctor, fromDate, toDate, materialPrices]);
  
   const handlePriceChange = (material: string, value: string) => {
    const newPrice = parseFloat(value);
    if (!isNaN(newPrice)) {
      setMaterialPrices(prev => ({
        ...prev,
        [material]: newPrice,
      }));
    }
  };

   const handleSaveAsPdf = async () => {
    const invoiceElement = printableInvoiceRef.current;
    if (!invoiceElement || !selectedDoctor || !invoiceSummary) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot generate PDF. Make sure an invoice is displayed.',
        });
        return;
    }

    setIsSavingPdf(true);

    try {
        const canvas = await html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        
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

  const handleShareInvoice = async () => {
    if (!selectedDoctor || !invoiceSummary) {
        toast({
            variant: 'destructive',
            title: 'Cannot Share',
            description: 'Please select a doctor and generate an invoice first.',
        });
        return;
    }
    
    setIsSharing(true);

    try {
        // Sanitize cases data before saving
        const sanitizedCases = invoiceSummary.cases.map(c => {
          const sanitizedCase: any = { ...c };
          if (c.createdAt && typeof c.createdAt.toDate === 'function') {
            sanitizedCase.createdAt = c.createdAt.toDate().toISOString();
          }
          if (c.deliveryDate && typeof c.deliveryDate.toDate === 'function') {
            sanitizedCase.deliveryDate = c.deliveryDate.toDate().toISOString();
          }
          return sanitizedCase as DentalCase;
        });


        const invoiceData = {
            dentistName: selectedDoctor,
            fromDate: fromDate || null,
            toDate: toDate || null,
            summary: invoiceSummary.summary,
            grandTotal: invoiceSummary.grandTotal,
            cases: sanitizedCases,
        };

        await saveInvoice(invoiceData);
        
        toast({
            title: 'Invoice Shared!',
            description: `An invoice for ${selectedDoctor} has been saved and is now visible in their portal.`,
        });
        // Refresh the shared invoices list
        fetchSharedInvoices(selectedDoctor);
        
        // Also download the PDF
        await handleSaveAsPdf();

    } catch (error) {
        console.error("Invoice Sharing Error:", error);
        toast({
            variant: 'destructive',
            title: 'Sharing Failed',
            description: 'Could not share the invoice. Please try again.',
        });
    } finally {
        setIsSharing(false);
    }
  };


  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteInvoice(invoiceId);
      toast({
        title: 'Invoice Deleted',
        description: 'The shared invoice has been successfully deleted.',
      });
      if (selectedDoctor) {
        fetchSharedInvoices(selectedDoctor);
      }
    } catch (error) {
       console.error("Invoice Deletion Error:", error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'Could not delete the invoice. Please try again.',
        });
    }
  }

  const handleDeleteSelectedInvoices = async () => {
      try {
          const deletePromises = selectedInvoices.map(id => deleteInvoice(id));
          await Promise.all(deletePromises);
          toast({
              title: 'Invoices Deleted',
              description: `${selectedInvoices.length} selected invoices have been successfully deleted.`,
          });
          if (selectedDoctor) {
              fetchSharedInvoices(selectedDoctor);
          }
          setSelectedInvoices([]); // Clear selection
      } catch (error) {
          console.error("Bulk Deletion Error:", error);
          toast({
              variant: 'destructive',
              title: 'Deletion Failed',
              description: 'Could not delete the selected invoices. Please try again.',
          });
      }
  };
  
  const handleSelectInvoice = (invoiceId: string, checked: boolean | 'indeterminate') => {
      setSelectedInvoices(prev => 
        checked ? [...prev, invoiceId] : prev.filter(id => id !== invoiceId)
      );
  }

  const handleSelectAllInvoices = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedInvoices(sharedInvoices.map(inv => inv.id));
    } else {
        setSelectedInvoices([]);
    }
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    try {
        return format(date, 'PPP');
    } catch (e) {
        return "Invalid Date";
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
        <div className="space-y-6">
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
               
              </CardContent>
               
                {!selectedDoctor && (
                     <div className="m-6 text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>Please select a doctor to view their cases and generate an invoice.</p>
                    </div>
                )}
                
                 {selectedDoctor && !invoiceSummary && fromDate && toDate && (
                    <div className="m-6 text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>No cases found for the selected doctor in this date range.</p>
                    </div>
                )}

                 {selectedDoctor && (!fromDate || !toDate) && (
                    <div className="m-6 text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>Please select a 'from' and 'to' date to generate the invoice.</p>
                    </div>
                )}
            </Card>
        
            {/* The live, interactive invoice for the UI */}
            {invoiceSummary && fromDate && toDate && (
                <div className="bg-white text-black p-4">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Invoice for {selectedDoctor}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                        {fromDate && toDate 
                                            ? `From ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}`
                                            : 'All dates'
                                        }
                                    </p>
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
                                                            className="h-8 text-right bg-white"
                                                        />
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
                                cases={invoiceSummary.cases}
                                hideDentist 
                                hideDeliveryDate 
                                hideShade 
                                hideSource
                            />
                        </div>
                    </div>
                </div>
            )}
             
            {/* Hidden, simplified invoice for PDF generation */}
            <div ref={printableInvoiceRef} className="bg-white text-black p-8 absolute -z-50 -top-[9999px] -left-[9999px] w-[800px]">
                {invoiceSummary && selectedDoctor && fromDate && toDate && (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                           <h1 className="text-3xl font-bold text-primary">Elegant Smile</h1>
                           <h2 className="text-2xl">Invoice</h2>
                        </div>
                         <div className="flex justify-between mb-6">
                            <div>
                                <p className="font-bold">Doctor:</p>
                                <p>{selectedDoctor}</p>
                            </div>
                            <div>
                                <p className="font-bold">Date Range:</p>
                                <p>{`From ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}`}</p>
                            </div>
                        </div>

                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">Material</th>
                                    <th className="border p-2 text-right">Tooth Count</th>
                                    <th className="border p-2 text-right">Price per Tooth (JOD)</th>
                                    <th className="border p-2 text-right">Total (JOD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(invoiceSummary.summary).map(([material, data]) => (
                                    data.toothCount > 0 && (
                                        <tr key={material}>
                                            <td className="border p-2 font-medium">{material}</td>
                                            <td className="border p-2 text-right">{data.toothCount}</td>
                                            <td className="border p-2 text-right">{data.price.toFixed(2)}</td>
                                            <td className="border p-2 text-right font-semibold">{data.total.toFixed(2)}</td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="flex justify-end mt-6">
                             <div className="w-1/3">
                                 <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-100">
                                    <span>Total:</span>
                                    <span>{`${invoiceSummary.grandTotal.toFixed(2)} JOD`}</span>
                                </div>
                             </div>
                        </div>

                         <div className="mt-8">
                            <h3 className="text-xl font-bold mb-4">Cases Included in Invoice</h3>
                             <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2 text-left">Created At</th>
                                        <th className="border p-2 text-left">Patient</th>
                                        <th className="border p-2 text-left">Tooth #(s)</th>
                                        <th className="border p-2 text-right">Tooth Count</th>
                                        <th className="border p-2 text-left">Prosthesis</th>
                                        <th className="border p-2 text-left">Material</th>
                                        <th className="border p-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                 <tbody>
                                   {invoiceSummary.cases.map(c => (
                                        <tr key={c.id}>
                                            <td className="border p-2">{format(c.createdAt.toDate(), 'PPP p')}</td>
                                            <td className="border p-2">{c.patientName}</td>
                                            <td className="border p-2">{c.toothNumbers}</td>
                                            <td className="border p-2 text-right">{c.toothNumbers.split(',').filter(t => t.trim() !== '').length}</td>
                                            <td className="border p-2">{c.prosthesisType}</td>
                                            <td className="border p-2">{c.material}</td>
                                            <td className="border p-2">{c.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {invoiceSummary && fromDate && toDate && (
                <div className="flex justify-end p-6 pt-0 gap-2">
                    <Button onClick={handleShareInvoice} disabled={isSharing || isSavingPdf}>
                        <Send className="mr-2 h-4 w-4" />
                        {isSharing ? 'Sharing...' : 'Save & Share Invoice'}
                    </Button>
                    <Button onClick={handleSaveAsPdf} disabled={isSavingPdf || isSharing}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {isSavingPdf ? 'Saving...' : 'Save as PDF'}
                    </Button>
                </div>
            )}

            {selectedDoctor && sharedInvoices.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-6 h-6 text-primary" />
                                Shared Invoice History for {selectedDoctor}
                            </CardTitle>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="select-all" 
                                        onCheckedChange={handleSelectAllInvoices}
                                        checked={selectedInvoices.length === sharedInvoices.length && sharedInvoices.length > 0}
                                        indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < sharedInvoices.length}
                                    />
                                    <label
                                        htmlFor="select-all"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Select All
                                    </label>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant="destructive"
                                            size="sm"
                                            disabled={selectedInvoices.length === 0}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Selected ({selectedInvoices.length})
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete {selectedInvoices.length} selected invoice(s).
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteSelectedInvoices} className="bg-destructive hover:bg-destructive/90">
                                                Yes, delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                            {sharedInvoices.map((invoice, index) => (
                                <AccordionItem value={`item-${index}`} key={invoice.id}>
                                    <div className="flex items-center w-full">
                                         <Checkbox
                                            id={`select-invoice-${invoice.id}`}
                                            className="mx-4"
                                            checked={selectedInvoices.includes(invoice.id)}
                                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked)}
                                        />
                                        <AccordionTrigger className="flex-grow">
                                            <div className="flex justify-between w-full pr-4">
                                                <span>Invoice from {format(invoice.createdAt.toDate(), 'PPP p')}</span>
                                                <span className="font-bold text-primary">{invoice.grandTotal.toFixed(2)} JOD</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="mr-2 flex-shrink-0">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete this shared invoice. The doctor will no longer be able to see it.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
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
                    </CardContent>
                </Card>
            )}
        </div>
      </main>
    </div>
  );
}
