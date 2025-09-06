
'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function SmallLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image 
        src="https://i.imgur.com/6oUDQAi.png" 
        alt="Elegant Smile Logo" 
        width={100} 
        height={33}
        priority
        data-ai-hint="logo"
        className="w-auto h-auto"
      />
    </Link>
  );
}
