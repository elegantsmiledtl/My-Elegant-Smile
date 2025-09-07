
'use client';

import Link from 'next/link';

export default function SmallLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
       <span className="font-headline text-3xl font-bold text-primary">
        Elegant Smile
      </span>
    </Link>
  );
}
