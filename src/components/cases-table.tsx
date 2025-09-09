

'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Phone, Send } from 'lucide-react';
import type { DentalCase } from '@/types';
import { cn } from "@/lib/utils";

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
} from "@/components/ui/alert-dialog"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CaseEntryForm from './case-entry-form';
import { useState, useRef } from 'react';
import { parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

interface CasesTableProps {
  cases: DentalCase[];
  onDeleteCase?: (dentalCase: DentalCase) => void;
  onUpdateCase?: (updatedCase: DentalCase) => void;
  onDeletionRequest?: (id: string, patientName: string) => void; // New prop
  hideDentist?: boolean;
  hideDeliveryDate?: boolean;
  hideShade?: boolean;
  hidePatientNumber?: boolean;
  selectedCases?: string[];
  onSelectedCasesChange?: (selectedIds: string[]) => void;
  highlightDeleted?: boolean;
  showSerialNumber?: boolean;
  showTotalAmount?: boolean;
}

function EditableUnitPriceCell({ dentalCase, onUpdateCase }: { dentalCase: DentalCase, onUpdateCase?: (updatedCase: DentalCase) => void }) {
    const [price, setPrice] = useState(dentalCase.unitPrice ?? 0);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (onUpdateCase && price !== dentalCase.unitPrice) {
            onUpdateCase({ ...dentalCase, unitPrice: price });
        }
        setIsEditing(false);
    };
    
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPrice(value === '' ? 0 : parseFloat(value));
    };
    
    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                type="number"
                value={price}
                onChange={handlePriceChange}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="h-8 w-24"
                autoFocus
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="cursor-pointer font-medium p-2">
            {price} JOD
        </div>
    );
}

export default function CasesTable({ 
    cases, 
    onDeleteCase, 
    onUpdateCase,
    onDeletionRequest,
    hideDentist,
    hideDeliveryDate,
    hideShade,
    hidePatientNumber,
    selectedCases = [],
    onSelectedCasesChange,
    highlightDeleted = true,
    showSerialNumber = false,
    showTotalAmount = false,
}: CasesTableProps) {
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState<DentalCase | null>(null);
  const timeZone = 'Asia/Amman';

  const handleEditClick = (caseData: DentalCase) => {
    setCaseToEdit(caseData);
    setIsEditDialogOpen(true);
  }

  const formatDateGeneric = (timestamp: any, dateFormat: string) => {
    if (!timestamp) return 'N/A';
    let date;
    
    if (timestamp.toDate) { // Firestore Timestamp
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') { // ISO string from JSON
      date = parseISO(timestamp);
    } else if (timestamp instanceof Date) { // JavaScript Date
      date = timestamp;
    } else {
      return 'Invalid Date';
    }

    if (!isValid(date)) {
        return "Invalid Date";
    }

    try {
      return formatInTimeZone(date, timeZone, dateFormat);
    } catch {
      return 'Invalid Date Format';
    }
  };

  const formatDate = (timestamp: any) => formatDateGeneric(timestamp, 'PPP');
  const formatDateTime = (timestamp: any) => formatDateGeneric(timestamp, 'PPP p');
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return 'N/A';
    return `${amount.toFixed(2)} JOD`;
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (onSelectedCasesChange) {
      onSelectedCasesChange(checked ? cases.map(c => c.id) : []);
    }
  };
  
  const handleSelectRow = (caseId: string, checked: boolean | 'indeterminate') => {
    if (onSelectedCasesChange) {
      const newSelected = checked 
        ? [...selectedCases, caseId]
        : selectedCases.filter(id => id !== caseId);
      onSelectedCasesChange(newSelected);
    }
  };

  if (!cases || cases.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
        <p>No cases to display.</p>
      </div>
    );
  }
  
  const showActions = !!onDeleteCase && !!onUpdateCase;
  const showCheckboxes = !!onSelectedCasesChange;
  const showDeletionRequest = !!onDeletionRequest;
  const showUnitPrice = cases.some(c => c.unitPrice !== undefined);
  const numSelected = selectedCases.length;
  const rowCount = cases.length;
  const showPatientNumber = cases.some(c => c.patientNumber) && !hidePatientNumber;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showCheckboxes && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={numSelected === rowCount && rowCount > 0}
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {showSerialNumber && <TableHead>S/N</TableHead>}
            <TableHead>Created At</TableHead>
            {!hideDeliveryDate && <TableHead>Delivery Date</TableHead>}
            <TableHead>Patient</TableHead>
            {!hideDentist && <TableHead>Dentist</TableHead>}
            <TableHead>Tooth #(s)</TableHead>
            <TableHead>Unit(s)</TableHead>
            {showUnitPrice && <TableHead>Unit Price</TableHead>}
            {showTotalAmount && <TableHead>Total Amount</TableHead>}
            <TableHead>Material</TableHead>
            <TableHead>Prosthesis</TableHead>
            {showPatientNumber && <TableHead>Patient Number</TableHead>}
            {!hideShade && <TableHead>Shade</TableHead>}
            <TableHead>Notes</TableHead>
            {(showActions || showDeletionRequest) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c, index) => (
            <TableRow 
              key={c.id} 
              data-state={selectedCases.includes(c.id) && "selected"}
              className={cn(
                  c.deletionRequested && "bg-yellow-100 hover:bg-yellow-200/80 text-yellow-900",
                  // Only apply deleted styling if the highlight prop is true AND the case is deleted.
                  highlightDeleted && c.isDeleted && "bg-red-100 hover:bg-red-200/80 text-red-900 line-through opacity-60"
                )}
            >
              {showCheckboxes && (
                  <TableCell>
                      <Checkbox
                          checked={selectedCases.includes(c.id)}
                          onCheckedChange={(checked) => handleSelectRow(c.id, checked)}
                          aria-label={`Select row ${c.id}`}
                      />
                  </TableCell>
              )}
              {showSerialNumber && <TableCell className="font-medium">{(rowCount - index).toString().padStart(2, '0')}</TableCell>}
              <TableCell>{formatDateTime(c.createdAt)}</TableCell>
              {!hideDeliveryDate && <TableCell>{formatDate(c.deliveryDate)}</TableCell>}
              <TableCell className="font-medium">{c.patientName}</TableCell>
              {!hideDentist && (
                 <TableCell>
                    <Link href={`/doctor/${encodeURIComponent(c.dentistName)}`} className="text-primary hover:underline">
                    {c.dentistName}
                    </Link>
                </TableCell>
              )}
              <TableCell>{c.toothNumbers}</TableCell>
              <TableCell className="font-medium">
                {c.toothNumbers.split(',').filter(t => t.trim() !== '').length}
              </TableCell>
              {showUnitPrice && (
                <TableCell>
                   <EditableUnitPriceCell dentalCase={c} onUpdateCase={onUpdateCase} />
                </TableCell>
              )}
              {showTotalAmount && (
                <TableCell className="font-semibold text-primary">
                    {formatCurrency(c.totalAmount)}
                </TableCell>
              )}
              <TableCell>{c.material}</TableCell>
              <TableCell>{c.prosthesisType}</TableCell>
              {showPatientNumber && (
                <TableCell>
                  {c.patientNumber ? (
                    <a href={`tel:${c.patientNumber}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {c.patientNumber}
                    </a>
                  ) : 'N/A'}
                </TableCell>
              )}
              {!hideShade && <TableCell>{c.shade}</TableCell>}
              <TableCell className="max-w-[200px] truncate">{c.notes}</TableCell>
              
              <TableCell className="text-right">
                {showActions && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(c)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the case
                            for {c.patientName}. For Dr.Ibraheem Omar, this will only hide the case from the owner view.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteCase && onDeleteCase(c)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {showDeletionRequest && (
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        disabled={!!c.deletionRequested}
                        className="disabled:opacity-70 disabled:bg-yellow-100"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Case?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will send a notification to the lab owner to approve the deletion of the case for {c.patientName}. You will be notified once it's approved. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeletionRequest(c.id, c.patientName)}>
                          Yes, Send Request
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Case</DialogTitle>
            </DialogHeader>
            {caseToEdit && onUpdateCase && (
                 <CaseEntryForm 
                  caseToEdit={caseToEdit} 
                  onUpdate={(updatedCase) => {
                    onUpdateCase(updatedCase);
                    setIsEditDialogOpen(false);
                  }} 
                />
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}

    
