
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { verifyUser, addLoginLog } from '@/lib/firebase';
import Logo from '@/components/logo';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const prefilledName = searchParams.get('name');
    if (prefilledName) {
      setName(decodeURIComponent(prefilledName));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted) return;
    setIsLoading(true);

    try {
      const matchedUser = await verifyUser(name, password);

      if (matchedUser) {
        toast({
          title: 'Login Successful',
          description: `Welcome back, ${matchedUser.name}!`,
        });
        localStorage.setItem('loggedInUser', JSON.stringify({ name: matchedUser.name }));
        await addLoginLog(matchedUser.name); // Log the successful login
        router.push(`/doctor-portal`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid name or password.',
        });
      }
    } catch (error) {
       toast({
          variant: 'destructive',
          title: 'Login Error',
          description: 'An error occurred during login. Please try again.',
        });
       console.error("Login error:", error);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
       <div className="absolute top-8 left-8">
         <Logo />
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Doctor Portal Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your cases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">User Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
