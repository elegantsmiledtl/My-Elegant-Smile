
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, UserCog } from 'lucide-react';
import Logo from '@/components/logo';
import { Metadata } from 'next';
import Head from 'next/head';

export default function HomePage() {
  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest-owner.json" />
      </Head>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="bg-card border-b shadow-sm p-4">
          <div className="container mx-auto flex justify-end items-center">
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
          <div className="mb-12">
            <Logo />
          </div>
        </main>
        <footer className="py-4 text-center text-muted-foreground text-sm">
          <p>Elegant Smile Dental Lab &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
}
