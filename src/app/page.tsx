
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, User, UserCog } from 'lucide-react';
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
          </div>
        </header>
        <main className="flex-grow container mx-auto flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-12">
            <Logo />
          </div>
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <Button asChild size="lg" className="w-full bg-[#C6A963] hover:bg-[#C6A963]/90 text-white font-bold">
              <Link href="/owner">Enter Lab Portal</Link>
            </Button>
             <Button asChild size="lg" className="w-full bg-[#C6A963] hover:bg-[#C6A963]/90 text-white font-bold">
              <Link href="/login">Doctor User</Link>
            </Button>
          </div>
        </main>
        <footer className="py-4 text-center text-muted-foreground text-sm">
          <p>Elegant Smile &copy; {new Date().getFullYear()}</p>
        </footer>
      </div>
    </>
  );
}
