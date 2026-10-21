import { useState } from 'react';

/** Sized link for Unsplash photos; other links are used as given. */
export function sizedImage(url: string, w: number, h: number): string {
  if (!url) return '';
  if (/images\.unsplash\.com/.test(url)) return `${url.split('?')[0]}?w=${w}&h=${h}&fit=crop&q=70&auto=format`;
  return url;
}

type DishImageProps = { name: string; imageUrl?: string | null; w?: number; h?: number; className?: string };

/** Dish photo, or a coloured letter tile when there is no photo (or it fails). */
export default function DishImage({ name, imageUrl, w = 320, h = 240, className = '' }: DishImageProps) {
  const [broken, setBroken] = useState(false);
  if (!imageUrl || broken) {
    const hue = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360;
    return (
      <div className={`dish-img dish-fallback ${className}`} style={{ ['--h' as string]: hue }} aria-hidden="true">
        <span>{(name.trim()[0] ?? '?').toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      className={`dish-img ${className}`}
      src={sizedImage(imageUrl, w, h)}
      srcSet={`${sizedImage(imageUrl, w, h)} 1x, ${sizedImage(imageUrl, w * 2, h * 2)} 2x`}
      alt={name}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
