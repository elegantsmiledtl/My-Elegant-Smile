
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
  isLoginPage?: boolean;
}

export default function Logo({ width = 300, height = 80, isLoginPage = false }: LogoProps) {
  const isSmall = width < 200;
  const src = isSmall 
    ? "https://i.imgur.com/Hfy1pIv.png" 
    : "https://i.imgur.com/kDubvxf.png";
  
  const alt = isSmall 
    ? "Elegant Smile Small Logo" 
    : "Elegant Smile Logo";

  const LogoImage = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority
      data-ai-hint="logo"
    />
  );
  
  if (isLoginPage) {
    return <div className="flex items-center gap-2 cursor-default">{LogoImage}</div>
  }

  return (
    <Link href="/" className="flex items-center gap-2">
      {LogoImage}
    </Link>
  );
}

    

    