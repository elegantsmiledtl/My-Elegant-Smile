
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="https://i.imgur.com/BYbgglV.png"
        alt="Elegant Smile Logo"
        width={300}
        height={80}
        priority
        data-ai-hint="logo"
      />
    </Link>
  );
}
