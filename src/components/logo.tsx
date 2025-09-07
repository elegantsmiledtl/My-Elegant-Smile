
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 300, height = 80 }: LogoProps) {
  const isSmall = width < 200;
  const src = isSmall 
    ? "https://i.imgur.com/Lf9QBbc.png" 
    : "https://i.imgur.com/BYbgglV.png";
  
  const alt = isSmall 
    ? "Elegant Smile Small Logo" 
    : "Elegant Smile Logo";

  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        data-ai-hint="logo"
      />
    </Link>
  );
}
