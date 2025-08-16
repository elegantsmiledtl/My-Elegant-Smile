
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
import { Trash2, Edit, Phone } from 'lucide-react';
import type { DentalCase } from '@/types';

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
import { useState } from 'react';
import { parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Checkbox } from './ui/checkbox';

interface CasesTableProps {
  cases: DentalCase[];
  onDeleteCase?: (id: string) => void;
  onUpdateCase?: (updatedCase: DentalCase) => void;
  hideDentist?: boolean;
  hideDeliveryDate?: boolean;
  hideShade?: boolean;
  hideSource?: boolean;
  hidePatientNumber?: boolean;
  selectedCases?: string[];
  onSelectedCasesChange?: (selectedIds: string[]) => void;
}

export default function CasesTable({ 
    cases, 
    onDeleteCase, 
    onUpdateCase,
    hideDentist,
    hideDeliveryDate,
    hideShade,
    hideSource = true,
    hidePatientNumber,
    selectedCases = [],
    onSelectedCasesChange
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
  
  const showActions = onDeleteCase && onUpdateCase;
  const showCheckboxes = !!onSelectedCasesChange;
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
            <TableHead>Created At</TableHead>
            {!hideDeliveryDate && <TableHead>Delivery Date</TableHead>}
            <TableHead>Patient</TableHead>
            {showPatientNumber && <TableHead>Patient Number</TableHead>}
            {!hideDentist && <TableHead>Dentist</TableHead>}
            <TableHead>Tooth #(s)</TableHead>
            <TableHead>Tooth Count</TableHead>
            <TableHead>Prosthesis</TableHead>
            <TableHead>Material</TableHead>
            {!hideShade && <TableHead>Shade</TableHead>}
            {!hideSource && <TableHead>Source</TableHead>}
            <TableHead>Notes</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((c) => (
            <TableRow key={c.id} data-state={selectedCases.includes(c.id) && "selected"}>
              {showCheckboxes && (
                  <TableCell>
                      <Checkbox
                          checked={selectedCases.includes(c.id)}
                          onCheckedChange={(checked) => handleSelectRow(c.id, checked)}
                          aria-label={`Select row ${c.id}`}
                      />
                  </TableCell>
              )}
              <TableCell>{formatDateTime(c.createdAt)}</TableCell>
              {!hideDeliveryDate && <TableCell>{formatDate(c.deliveryDate)}</TableCell>}
              <TableCell className="font-medium">{c.patientName}</TableCell>
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
              <TableCell>{c.prosthesisType}</TableCell>
              <TableCell>{c.material}</TableCell>
              {!hideShade && <TableCell>{c.shade}</TableCell>}
              {!hideSource && (
                <TableCell>
                  {c.source || 'Desktop'}
                </TableCell>
              )}
              <TableCell className="max-w-[200px] truncate">{c.notes}</TableCell>
              {showActions && (
                <TableCell className="text-right">
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
                          for {c.patientName}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteCase && onDeleteCase(c.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              )}
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
