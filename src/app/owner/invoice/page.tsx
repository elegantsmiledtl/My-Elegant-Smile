
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Receipt, FileDown, Send, Trash2, History, Settings, Eye } from 'lucide-react';
import Logo from '@/components/logo';
import { getCases, saveInvoice, getInvoicesByDoctor, deleteInvoice, createNotification } from '@/lib/firebase';
import type { DentalCase, Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CasesTable from '@/components/cases-table';
import { DatePicker } from '@/components/ui/date-picker';
import { endOfDay, startOfDay, parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';


const materialOptions = ["Zolid", "Zirconia", "Nickel Free", "N-Guard", "Implant", "MookUp"];

export default function InvoicePage() {
  const [allCases, setAllCases] = useState<DentalCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [paidAmount, setPaidAmount] = useState<number>(0);
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

  // Watermark and Logo State
  const [isWatermarkInFront, setIsWatermarkInFront] = useState(false);
  const [watermarkSize, setWatermarkSize] = useState(400);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.1);
  const [watermarkX, setWatermarkX] = useState(50);
  const [watermarkY, setWatermarkY] = useState(50);


  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isToDatePickerOpen, setIsToDatePickerOpen] = useState(false);

  const timeZone = 'Asia/Amman';

  useEffect(() => {
    const fetchAllCases = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
    if (isLoading || !selectedDoctor || !fromDate || !toDate) return null;

     const filteredCasesByDate = allCases.filter(c => {
       if (c.dentistName !== selectedDoctor) return false;
       if (!c.createdAt) return false;
       
       if (c.isDeleted) return false;
       
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

    let subtotal = 0;
    Object.keys(summary).forEach(material => {
        const materialInfo = summary[material];
        materialInfo.price = materialPrices[material] || 0; // Ensure price is always up-to-date
        materialInfo.total = materialInfo.toothCount * materialInfo.price;
        subtotal += materialInfo.total;
    });
    
    const grandTotal = subtotal - paidAmount;

    return { summary, subtotal, paidAmount, grandTotal, cases: filteredCasesByDate };
  }, [allCases, selectedDoctor, fromDate, toDate, materialPrices, paidAmount, isLoading]);
  
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
            backgroundColor: null, // Transparent background to capture only the content
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight > pdfHeight ? pdfHeight : imgHeight, undefined, 'FAST');

        const fileName = `invoice-${selectedDoctor.replace(/\s/g, '_')}-${formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd')}.pdf`;
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


        const invoiceData: Omit<Invoice, 'id' | 'createdAt'> = {
            dentistName: selectedDoctor,
            fromDate: fromDate || null,
            toDate: toDate || null,
            summary: invoiceSummary.summary,
            subtotal: invoiceSummary.subtotal,
            paidAmount: invoiceSummary.paidAmount,
            grandTotal: invoiceSummary.grandTotal,
            cases: sanitizedCases,
        };

        await saveInvoice(invoiceData);
        
        // Create a notification for the doctor
        await createNotification(selectedDoctor, `Hello ${selectedDoctor}, Your Invoice Is Ready`);

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
  };

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
  };

  const handleSelectAllInvoices = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedInvoices(sharedInvoices.map(inv => inv.id));
    } else {
        setSelectedInvoices([]);
    }
  };

  const formatDateGeneric = (timestamp: any, dateFormat: string): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    if (!isValid(date)) return "Invalid Date";
    try {
        return formatInTimeZone(date, timeZone, dateFormat);
    } catch (e) {
        return "Invalid Date";
    }
  };

  const formatDate = (timestamp: any) => formatDateGeneric(timestamp, 'PPP');
  const formatDateTime = (timestamp: any) => formatDateGeneric(timestamp, 'PPP p');
  
  const formatAmount = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0';
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-center items-center">
          <Logo width={150} height={40} />
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
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
                    <>
                     <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 border rounded-lg bg-muted/50">
                        <p className="font-semibold text-sm">Filter by creation date:</p>
                        <div className="flex gap-2 items-center">
                             <DatePicker 
                                 value={fromDate} 
                                 onChange={(date) => {
                                    setFromDate(date);
                                    setIsFromDatePickerOpen(false);
                                    setIsToDatePickerOpen(true);
                                 }} 
                                 placeholder="From Date" 
                                 onOpenChange={setIsFromDatePickerOpen}
                                 open={isFromDatePickerOpen}
                             />
                             <span>-</span>
                             <DatePicker 
                                 value={toDate} 
                                 onChange={setToDate} 
                                 placeholder="To Date" 
                                 onOpenChange={setIsToDatePickerOpen}
                                 open={isToDatePickerOpen}
                             />
                        </div>
                     </div>
                    </>
                )}
               
              </CardContent>
               
                {!selectedDoctor && (
                     <div className="m-6 text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <p>Please select a doctor to view their cases and generate an invoice.</p>
                    </div>
                )}
                
                 {selectedDoctor && !invoiceSummary && fromDate && toDate && !isLoading && (
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

            
             {invoiceSummary && (
                <Card className="shadow-lg mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-6 h-6 text-primary" />
                            PDF Layout Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                         <div className="space-y-6">
                            <div className="flex items-center space-x-2 p-2 rounded-lg border bg-muted/50">
                                <Switch
                                    id="logo-position"
                                    checked={isWatermarkInFront}
                                    onCheckedChange={setIsWatermarkInFront}
                                />
                                <Label htmlFor="logo-position" className="font-semibold">
                                    Show Watermark in Front of Text
                                </Label>
                            </div>
                            
                            <div>
                                <Label>Watermark Size: {watermarkSize}px</Label>
                                <Slider
                                    value={[watermarkSize]}
                                    onValueChange={(value) => setWatermarkSize(value[0])}
                                    max={800}
                                    step={10}
                                />
                            </div>
                            <div>
                                <Label>Watermark Opacity: {watermarkOpacity.toFixed(2)}</Label>
                                <Slider
                                    value={[watermarkOpacity]}
                                    onValueChange={(value) => setWatermarkOpacity(value[0])}
                                    max={1}
                                    step={0.05}
                                />
                            </div>
                            <div>
                                <Label>Watermark Horizontal Position: {watermarkX}%</Label>
                                <Slider
                                    value={[watermarkX]}
                                    onValueChange={(value) => setWatermarkX(value[0])}
                                    max={100}
                                    step={1}
                                />
                            </div>
                            <div>
                                <Label>Watermark Vertical Position: {watermarkY}%</Label>
                                <Slider
                                    value={[watermarkY]}
                                    onValueChange={(value) => setWatermarkY(value[0])}
                                    max={100}
                                    step={1}
                                />
                            </div>
                        </div>
                        <div className="relative h-48 w-full bg-gray-200 rounded-md overflow-hidden">
                           {/* Watermark/Logo Preview */}
                           <div
                                className="absolute transition-all duration-200"
                                style={{
                                    top: `${watermarkY}%`,
                                    left: `${watermarkX}%`,
                                    transform: `translate(-${watermarkX}%, -${watermarkY}%)`,
                                    zIndex: isWatermarkInFront ? 20 : 0
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://i.imgur.com/Lf9QBbc.png"
                                    alt="Watermark Preview"
                                    style={{
                                        width: `${watermarkSize}px`,
                                        height: 'auto',
                                        opacity: watermarkOpacity,
                                    }}
                                />
                            </div>
                           <div className="p-4 text-center relative z-10">
                                <h3 className="font-bold">Invoice Content Preview</h3>
                                <p className="text-sm text-muted-foreground">Adjust settings to see changes</p>
                           </div>
                        </div>
                    </CardContent>
                </Card>
            )}

        
             {invoiceSummary && fromDate && toDate && (
              <div className="mt-6">
                {/* The live, interactive invoice for the UI */}
                <div className="bg-white text-black p-4 rounded-lg shadow-md">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">Invoice for {selectedDoctor}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                        {fromDate && toDate 
                                            ? `From ${formatInTimeZone(fromDate, timeZone, 'PPP')} to ${formatInTimeZone(toDate, timeZone, 'PPP')}`
                                            : 'All dates'
                                        }
                                    </p>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Material</TableHead>
                                            <TableHead className="text-right">Unit(s)</TableHead>
                                            <TableHead className="text-right w-[150px]">Price per Unit (JOD)</TableHead>
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
                                                            value={materialPrices[material] ?? ''}
                                                            onChange={(e) => handlePriceChange(material, e.target.value)}
                                                            className="h-8 text-right bg-white"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatAmount(data.total)}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter className="bg-muted/50 p-4 justify-end">
                                <div className="flex flex-col gap-2 text-right">
                                    <div className="flex items-center gap-4 justify-end">
                                        <p className="font-semibold">Subtotal:</p>
                                        <p className="text-lg font-semibold w-[120px] text-left">
                                            {formatAmount(invoiceSummary.subtotal)} JOD
                                        </p>
                                    </div>
                                     <div className="flex items-center gap-4 justify-end">
                                        <Label htmlFor="paid-amount" className="font-semibold">Paid Amount:</Label>
                                        <Input
                                            id="paid-amount"
                                            type="number"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                            className="h-8 text-left bg-white w-[120px] font-bold text-destructive"
                                            placeholder="0"
                                        />
                                    </div>
                                     <div className="flex items-center gap-4 justify-end border-t pt-2 mt-2">
                                        <p className="text-lg font-bold">Total Due:</p>
                                        <p className="text-2xl font-bold text-primary w-[120px] text-left">
                                            {`${formatAmount(invoiceSummary.grandTotal)} JOD`}
                                        </p>
                                    </div>
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
                                hidePatientNumber
                                highlightDeleted={false}
                            />
                        </div>
                    </div>
                </div>
              </div>
            )}
             
            {/* Hidden, simplified invoice for PDF generation */}
            <div className="fixed -z-50 -top-[9999px] -left-[9999px] w-[800px] bg-white text-black">
                <div ref={printableInvoiceRef} className="relative p-8">
                    {invoiceSummary && selectedDoctor && fromDate && toDate && (
                         <>
                            <div className="absolute inset-0 flex items-center justify-center" style={{
                                top: `${watermarkY}%`,
                                left: `${watermarkX}%`,
                                transform: `translate(-${watermarkX}%, -${watermarkY}%)`,
                                zIndex: isWatermarkInFront ? 20 : 0,
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://i.imgur.com/Lf9QBbc.png"
                                    alt="Watermark"
                                    style={{
                                        width: `${watermarkSize}px`,
                                        height: 'auto',
                                        opacity: watermarkOpacity,
                                    }}
                                />
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="text-center mb-8">
                                    <h1 className="text-3xl font-bold">Elegant Smile</h1>
                                    <h2 className="text-2xl">Invoice</h2>
                                </div>
                                <div className="flex justify-between mb-6">
                                    <div>
                                        <p className="font-bold">Doctor:</p>
                                        <p>{selectedDoctor}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">Date Range:</p>
                                        <p>{`From ${formatInTimeZone(fromDate, timeZone, 'PPP')} to ${formatInTimeZone(toDate, timeZone, 'PPP')}`}</p>
                                    </div>
                                </div>

                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">Material</th>
                                            <th className="border p-2 text-right">Unit(s)</th>
                                            <th className="border p-2 text-right">Price per Unit (JOD)</th>
                                            <th className="border p-2 text-right">Total (JOD)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(invoiceSummary.summary).map(([material, data]) => (
                                            data.toothCount > 0 && (
                                                <tr key={material}>
                                                    <td className="border p-2 font-medium">{material}</td>
                                                    <td className="border p-2 text-right">{data.toothCount}</td>
                                                    <td className="border p-2 text-right">{formatAmount(data.price)}</td>
                                                    <td className="border p-2 text-right font-semibold">{formatAmount(data.total)}</td>
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="flex justify-end mt-6">
                                    <div className="w-2/5 space-y-2">
                                        <div className="flex justify-between items-center text-lg p-2">
                                            <span className="font-bold">Subtotal:</span>
                                            <span>{`${formatAmount(invoiceSummary.subtotal)} JOD`}</span>
                                        </div>
                                         <div className="flex justify-between items-center text-lg p-2">
                                            <span className="font-bold">Paid Amount:</span>
                                            <span className="font-bold" style={{ color: invoiceSummary.paidAmount > 0 ? 'red' : 'inherit' }}>
                                                {`${formatAmount(invoiceSummary.paidAmount)} JOD`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-100">
                                            <span>Total Due:</span>
                                            <span>{`${formatAmount(invoiceSummary.grandTotal)} JOD`}</span>
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
                                                <th className="border p-2 text-right">Unit(s)</th>
                                                <th className="border p-2 text-left">Prosthesis</th>
                                                <th className="border p-2 text-left">Material</th>
                                                <th className="border p-2 text-left">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {invoiceSummary.cases.map(c => (
                                                <tr key={c.id}>
                                                    <td className="border p-2">{formatDate(c.createdAt)}</td>
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
                        </>
                    )}
                </div>
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
                                                <span>Invoice from {formatDateTime(invoice.createdAt)}</span>
                                                <span className="font-bold text-primary">{formatAmount(invoice.grandTotal)} JOD</span>
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
                                                            <TableHead className="text-right">Unit(s)</TableHead>
                                                            <TableHead className="text-right">Price per Unit (JOD)</TableHead>
                                                            <TableHead className="text-right">Total (JOD)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(invoice.summary).map(([material, data]) => (
                                                            data.toothCount > 0 && (
                                                                <TableRow key={material}>
                                                                    <TableCell className="font-medium">{material}</TableCell>
                                                                    <TableCell className="text-right">{data.toothCount}</TableCell>
                                                                    <TableCell className="text-right">{formatAmount(data.price)}</TableCell>
                                                                    <TableCell className="text-right font-semibold">
                                                                        {formatAmount(data.total)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                            <CardFooter className="bg-muted/50 p-4 justify-end">
                                                <div className="flex flex-col gap-2 text-right">
                                                    <div className="flex items-center gap-4 justify-end">
                                                        <p className="font-semibold">Subtotal:</p>
                                                        <p className="text-lg font-semibold w-[120px] text-left">
                                                            {formatAmount(invoice.subtotal)} JOD
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 justify-end">
                                                        <p className="font-semibold">Paid Amount:</p>
                                                        <p className="text-lg font-bold w-[120px] text-left" style={{color: invoice.paidAmount > 0 ? 'red' : 'inherit'}}>
                                                           {formatAmount(invoice.paidAmount)} JOD
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 justify-end border-t pt-2 mt-2">
                                                        <p className="text-lg font-bold">Total Due:</p>
                                                        <p className="text-2xl font-bold text-primary w-[120px] text-left">
                                                            {formatAmount(invoice.grandTotal)} JOD
                                                        </p>
                                                    </div>
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
                                                hidePatientNumber
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

    