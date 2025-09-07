
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function SmallLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="https://i.imgur.com/Lf9QBbc.png"
        alt="Elegant Smile Small Logo"
        width={150}
        height={40}
        priority
        data-ai-hint="logo"
      />
    </Link>
  );
}
