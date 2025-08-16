
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex flex-col items-start">
      <h1 className="text-2xl font-bold font-headline text-primary leading-tight">Elegant Smile</h1>
      <p className="text-xs text-primary -mt-1 ml-1">Dental Lab</p>
    </Link>
  );
}
