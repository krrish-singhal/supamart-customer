import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import brandLogos from '../../utils/brandLogos';
import { optimizeCloudinaryUrl } from '../../utils/cloudinaryImage';

const PLACEHOLDER = require('../../../assets/images/brand-placeholder.png');

// Priority: brand.logoUrl (admin-uploaded, a live Firestore field) -> a locally-bundled
// logo for this exact brand name (this file's brandLogos map) -> local placeholder. No
// online/network lookup of any kind -- a brand either has a real photo, or it shows the
// placeholder, same discipline as products/categories. This deliberately replaced the
// old real-time Wikipedia/Simple-Icons lookup (utils/getBrandLogo.js, deleted).
export default function BrandLogo({ brand, size = 56, style, className = '' }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [brand?.logoUrl]);

  const bundled = brand?.name ? brandLogos[brand.name] : undefined;
  // Scaled to the actual render size (with headroom for 2-3x pixel density) rather than a
  // fixed width — brand logos render anywhere from a small carousel chip to a larger tile.
  const uploaded = brand?.logoUrl && !errored
    ? { uri: optimizeCloudinaryUrl(brand.logoUrl, Math.max(size * 3, 150)) }
    : null;
  const source = uploaded || bundled || PLACEHOLDER;

  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#f8fafc' }, style]}
      className={className}
      contentFit="contain"
      transition={150}
      onError={uploaded ? () => setErrored(true) : undefined}
    />
  );
}
