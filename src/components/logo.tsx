
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="https://i.imgur.com/BYbgglV.png"
        alt="Elegant Smile Logo"
        width={200}
        height={50}
        priority
        data-ai-hint="logo"
      />
    </Link>
  );
}
