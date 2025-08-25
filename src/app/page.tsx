
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, UserCog, PlusCircle } from 'lucide-react';
import Logo from '@/components/logo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-4">
            <Button asChild variant="outline">
              <Link href="/owner">Owner Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Doctor Portal</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4">
          Welcome To Elegant Smile Dental Lab
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          Your central application for managing dental lab cases. Access the owner dashboard for analytics, add new cases, or log in to the doctor portal.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-6 h-6 text-primary" />
                Owner Dashboard
              </CardTitle>
              <CardDescription>
                View analytics, manage all cases, and handle user accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/owner">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-primary" />
                Add a New Case
              </CardTitle>
              <CardDescription>
                Quickly enter details for a new dental case for any doctor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/add-case">
                  Add Case <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-4 text-center text-muted-foreground text-sm">
        <p>Elegant Smile Dental Lab &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
