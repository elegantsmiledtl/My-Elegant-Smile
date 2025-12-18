
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/logo';

export default function DoctorQrCodePage() {
  const [loginUrl, setLoginUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      const url = new URL('/login', window.location.origin);
      setLoginUrl(url.toString());
    }
  }, []);

  const copyToClipboard = () => {
    if (loginUrl) {
      navigator.clipboard.writeText(loginUrl).then(() => {
        toast({
          title: "Copied!",
          description: "Login URL has been copied to your clipboard.",
        });
      }, (err) => {
        toast({
          variant: "destructive",
          title: "Failed to copy",
          description: "Could not copy URL to clipboard.",
        });
        console.error('Could not copy text: ', err);
      });
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
       <div className="absolute top-8 left-1/2 -translate-x-1/2">
         <Logo />
      </div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Doctor Login QR Code</CardTitle>
          <CardDescription>
            Share this QR code with doctors. When scanned, it will take them to the login page for the doctor portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 gap-8">
          {loginUrl ? (
            <div className="relative p-4 bg-white rounded-lg" style={{ height: "auto", margin: "0 auto", maxWidth: 288, width: "100%" }}>
                <QRCode
                size={256}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                value={loginUrl}
                fgColor="#000000"
                level="H"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-md">
                     <Image src="https://i.imgur.com/Hfy1pIv.png" alt="Elegant Smile Logo" width={60} height={60} data-ai-hint="logo" />
                </div>
            </div>
          ) : (
            <div className="h-[288px] w-[288px] flex items-center justify-center">
              <p>Generating QR code...</p>
            </div>
          )}
          <div className="w-full space-y-2">
            <Label htmlFor="portal-url">Portal Login URL</Label>
            <div className="flex w-full items-center space-x-2">
                <Input id="portal-url" type="text" value={loginUrl} readOnly />
                <Button type="button" onClick={copyToClipboard} variant="secondary">Copy</Button>
            </div>
            <p className="text-xs text-muted-foreground">
                For testing, you can copy this URL and open it in a new browser tab.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

    