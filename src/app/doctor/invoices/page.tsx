
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt, FileDown } from 'lucide-react';
import SmallLogo from '@/components/small-logo';
import { getInvoicesByDoctor } from '@/lib/firebase';
import type { Invoice, DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import CasesTable from '@/components/cases-table';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


export default function DoctorInvoicesPage() {
  const router = useRouter();
  const [dentistName, setDentistName] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const printableInvoiceRef = useRef<HTMLDivElement>(null);
  const [invoiceForPdf, setInvoiceForPdf] = useState<Invoice | null>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const timeZone = 'Asia/Amman';

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

  const formatDateGeneric = (timestamp: any, dateFormat: string): string => {
    if (!timestamp) return 'N/A';
    // Firestore Timestamps or ISO strings from JSON
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

  const handleSaveAsPdf = async (invoice: Invoice) => {
    setInvoiceForPdf(invoice);
    setIsSavingPdf(true);
  };
  
  useEffect(() => {
      if (invoiceForPdf && isSavingPdf) {
          generatePdf();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceForPdf, isSavingPdf]);

  const generatePdf = async () => {
    const invoiceElement = printableInvoiceRef.current;
     if (!invoiceElement || !dentistName || !invoiceForPdf) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot generate PDF. Invoice data is missing.',
        });
        setIsSavingPdf(false);
        setInvoiceForPdf(null);
        return;
    }

    try {
        const canvas = await html2canvas(invoiceElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
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
        
        const fileName = `invoice-${dentistName.replace(/\s/g, '_')}-${formatDate(invoiceForPdf.createdAt)}.pdf`;
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
        setInvoiceForPdf(null);
    }
  }


  return (
    <>
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto grid grid-cols-3 items-center">
            <div />
            <div className="flex justify-center">
                <SmallLogo />
            </div>
            <div className="flex justify-end">
            </div>
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
                                    <span className="font-bold text-primary">{formatAmount(invoice.grandTotal)} JOD</span>
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
                                    <CardFooter className="bg-muted/50 p-4 justify-end items-center">
                                        <Button
                                            onClick={() => handleSaveAsPdf(invoice)}
                                            disabled={isSavingPdf && invoiceForPdf?.id === invoice.id}
                                            size="sm"
                                            className="mr-auto bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <FileDown className="mr-2 h-4 w-4" />
                                            {isSavingPdf && invoiceForPdf?.id === invoice.id ? 'Saving...' : 'Download Invoice'}
                                        </Button>
                                        <div className="flex flex-col gap-2 text-right">
                                            <div className="flex items-center gap-4 justify-end">
                                                <p className="font-semibold">Subtotal:</p>
                                                <p className="text-lg font-semibold w-[120px] text-left">
                                                    {formatAmount(invoice.subtotal)} JOD
                                                </p>
                                            </div>
                                             <div className="flex items-center gap-4 justify-end">
                                                <p className="font-semibold">Paid Amount:</p>
                                                <p className="text-lg font-bold w-[120px] text-left text-destructive">
                                                    - {formatAmount(invoice.paidAmount)} JOD
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
     {/* Hidden, simplified invoice for PDF generation */}
    <div className="fixed -z-50 -top-[9999px] -left-[9999px] w-[800px] bg-white text-black">
        <div ref={printableInvoiceRef} className="relative p-8">
            {invoiceForPdf && (
                <>
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                        opacity: 1,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://i.imgur.com/BYbgglV.png" alt="Watermark" style={{ width: '400px' }} />
                </div>

                <div className="relative space-y-6" style={{ zIndex: 1 }}>
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold">Elegant Smile</h1>
                        <h2 className="text-2xl">Invoice</h2>
                    </div>
                        <div className="flex justify-between mb-6">
                        <div>
                            <p className="font-bold">Doctor:</p>
                            <p>{invoiceForPdf.dentistName}</p>
                        </div>
                        <div>
                            <p className="font-bold">Date Range:</p>
                            <p>{`From ${formatDate(invoiceForPdf.fromDate)} to ${formatDate(invoiceForPdf.toDate)}`}</p>
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
                            {Object.entries(invoiceForPdf.summary).map(([material, data]) => (
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
                                <span>{`${formatAmount(invoiceForPdf.subtotal)} JOD`}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg p-2">
                                <span className="font-bold">Paid Amount:</span>
                                <span className="font-bold text-red-600">{`- ${formatAmount(invoiceForPdf.paidAmount)} JOD`}</span>
                            </div>
                            <div className="flex justify-between items-center text-xl font-bold p-2 bg-gray-100">
                                <span>Total Due:</span>
                                <span>{`${formatAmount(invoiceForPdf.grandTotal)} JOD`}</span>
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
                                {invoiceForPdf.cases.map(c => (
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
    </>
  );
}
