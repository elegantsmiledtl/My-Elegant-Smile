
'use client';

import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="font-headline text-4xl font-bold text-primary">
        Elegant Smile
      </span>
    </Link>
  );
}
