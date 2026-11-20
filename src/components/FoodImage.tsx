import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface FoodImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const FoodImage: React.FC<FoodImageProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 text-orange-700 ${className}`}
        aria-label={alt}
      >
        <UtensilsCrossed className="h-6 w-6 opacity-75" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
};
