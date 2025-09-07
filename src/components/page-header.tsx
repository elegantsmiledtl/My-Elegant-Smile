
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileUp, User, LogIn, RefreshCw } from 'lucide-react';
import type { DentalCase } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { convertJsonToCsv, downloadFile } from '@/lib/utils';
import Link from 'next/link';
import { Toaster } from '@/components/ui/toaster';


interface PageHeaderProps {
  cases: DentalCase[];
  setCases: React.Dispatch<React.SetStateAction<DentalCase[]>>;
  onReload: () => void;
}

export default function PageHeader({ cases, setCases, onReload }: PageHeaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReload = () => {
    window.location.reload();
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const importedCases = JSON.parse(text, (key, value) => {
            if (key === 'createdAt' && typeof value === 'string') {
              return new Date(value);
            }
            return value;
          });

          // Basic validation
          if (Array.isArray(importedCases) && importedCases.every(c => c.id && c.patientName)) {
            setCases(importedCases);
            toast({
              title: "Success",
              description: "Successfully imported cases from JSON file.",
            });
          } else {
            throw new Error("Invalid JSON file format.");
          }

        } catch (error) {
          toast({
            variant: "destructive",
            title: "Import Failed",
            description: error instanceof Error ? error.message : "Could not parse the JSON file.",
          });
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if(event.target) {
      event.target.value = '';
    }
  };

  const handleExportCsv = () => {
    if (cases.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'There are no cases to export.',
      });
      return;
    }
    try {
      const csvString = convertJsonToCsv(cases);
      downloadFile(csvString, 'elegant-smile-data.csv', 'text/csv');
      toast({
        title: 'Export Successful',
        description: 'Cases have been exported to CSV.',
      });
    } catch(error) {
        toast({
            variant: "destructive",
            title: "Export Failed",
            description: "Could not convert data to CSV.",
        });
    }
  };

  return (
    <header className="bg-card border-b shadow-sm p-4">
      <Toaster />
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Button asChild size="sm">
                <Link href="/owner">
                    <User className="mr-2 h-4 w-4" /> Owner View
                </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" /> Doctor Portal
                </Link>
            </Button>
            <Button onClick={handleReload} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          
        </div>
      </div>
    </header>
  );
}
