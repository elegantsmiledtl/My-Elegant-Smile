
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image 
        src="https://i.imgur.com/6oUDQAi.png" 
        alt="Elegant Smile Logo" 
        width={150} 
        height={50}
        priority
        data-ai-hint="logo"
        className="w-auto h-auto"
      />
    </Link>
  );
}
