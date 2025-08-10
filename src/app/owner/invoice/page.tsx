
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Receipt } from 'lucide-react';
import Logo from '@/components/logo';

export default function InvoicePage() {
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
          <CardContent>
            <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
              <p>Invoice generation and tracking will be available here.</p>
              <p className="text-sm">Select a doctor and date range to create an invoice.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

    