import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function OptimizedImage({ src, alt, className, width = "800", height = "800", ...props }: OptimizedImageProps) {
  return (
    <img
      src={src}
      srcSet={`${src} 400w, ${src} 800w, ${src} 1200w`}
      sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 100vw"
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      alt={alt}
      {...props}
    />
  );
}
