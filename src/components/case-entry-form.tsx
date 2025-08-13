
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { DentalCase } from '@/types';
import ToothSelector from './tooth-selector';
import { useRouter } from 'next/navigation';
import { DatePicker } from './ui/date-picker';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { useRef, useState } from 'react';

const formSchema = z.object({
  patientName: z.string().min(2, { message: 'Patient name must be at least 2 characters.' }),
  dentistName: z.string().min(2, { message: 'Dentist name must be at least 2 characters.' }),
  toothNumbers: z.string().min(1, { message: 'At least one tooth number is required.' }),
  prosthesisType: z.string().min(1, { message: 'A prosthesis type must be selected.' }),
  material: z.string().min(1, { message: 'A material must be selected.' }),
  shade: z.string().min(1, { message: 'Shade is required.' }),
  deliveryDate: z.date().optional(),
  notes: z.string().optional(),
});

type CaseFormValues = z.infer<typeof formSchema>;

interface CaseEntryFormProps {
  caseToEdit?: Partial<DentalCase>; // Allow partial for template
  onUpdate?: (updatedCase: DentalCase) => void;
  onAddCase?: (newCase: Omit<DentalCase, 'id' | 'createdAt'>) => void;
}

const materialOptions = ["Zolid", "Zirconia", "Nickel Free", "N-Guard", "Implant", "MookUp"];
const prosthesisTypeOptions = ["Separate", "Bridge"];

export default function CaseEntryForm({ caseToEdit, onUpdate, onAddCase }: CaseEntryFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const toothSelectorRef = useRef<HTMLInputElement>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Helper to convert Firestore Timestamp to Date
  const toDate = (timestamp: any): Date | undefined => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return undefined;
  };

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientName: caseToEdit?.patientName || '',
      dentistName: caseToEdit?.dentistName || '',
      toothNumbers: caseToEdit?.toothNumbers || '',
      prosthesisType: caseToEdit?.prosthesisType || '',
      material: caseToEdit?.material || '',
      shade: caseToEdit?.shade || '',
      deliveryDate: toDate(caseToEdit?.deliveryDate),
      notes: caseToEdit?.notes || '',
    },
  });
  
  const isEditMode = !!caseToEdit?.id;

  function onSubmit(values: CaseFormValues) {
    // Sanitize data before submitting
    const caseData: any = { ...values };
    if (caseData.deliveryDate === undefined) {
      caseData.deliveryDate = null;
    }

    if (isEditMode && onUpdate && caseToEdit.id && caseToEdit.createdAt) {
        onUpdate({ ...caseData, id: caseToEdit.id, createdAt: caseToEdit.createdAt });
        toast({
            title: 'Case Updated',
            description: `Case for ${values.patientName} has been successfully updated.`,
        });
    } else if (onAddCase) {
        onAddCase(caseData);
        // The toast and reset are now handled in the page component.
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <PlusCircle className="w-6 h-6 text-primary" />
          {isEditMode ? 'Edit Case' : 'Add New Case'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Patient Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dentistName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Dentist Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!!caseToEdit?.dentistName} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                        control={form.control}
                        name="deliveryDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel className="font-bold">Delivery Date (Optional)</FormLabel>
                            <FormControl>
                                <DatePicker 
                                    value={field.value} 
                                    onChange={(date) => {
                                      field.onChange(date);
                                      setIsDatePickerOpen(false);
                                      // Timeout to allow state update before focusing
                                      setTimeout(() => {
                                          toothSelectorRef.current?.focus();
                                          toothSelectorRef.current?.click();
                                      }, 0)
                                    }}
                                    open={isDatePickerOpen}
                                    onOpenChange={setIsDatePickerOpen}
                                    placeholder="Select delivery date"
                                    className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                                    fromDate={new Date()}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                      control={form.control}
                      name="toothNumbers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Tooth Number(s)</FormLabel>
                          <FormControl>
                            <ToothSelector ref={toothSelectorRef} value={field.value} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="prosthesisType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="font-bold">Prosthesis Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-row space-x-4"
                            >
                              {prosthesisTypeOptions.map((item) => (
                                <FormItem key={item} className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={item} />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                               ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="font-bold">Material</FormLabel>
                           <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-2"
                            >
                              {materialOptions.map((item) => (
                                <FormItem key={item} className="flex items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={item} />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                               ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Shade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Notes / Instructions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Add any specific instructions..." {...field} className="min-h-[100px]"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>
            
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 mt-6">
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Save Changes' : 'Add Case'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
