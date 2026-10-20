import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, Shirt } from 'lucide-react';
import { ProductImage } from '../config/storeConfig';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  selectedColor?: string;
  activeColorVariantIndex?: number;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  selectedColor,
  activeColorVariantIndex,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // Reset to first image when selected product changes
  useEffect(() => {
    setActiveIndex(0);
    if (images && images.length > 0) {
      console.info(
        `[SOHAN SHOP ProductGallery] Rendering gallery for "${productName}" (${images.length} images):`,
        images.map((i) => i.url)
      );
    }
  }, [productName, images.length]);

  // Automatically jump to the matching variant image when selectedColor changes
  useEffect(() => {
    if (
      activeColorVariantIndex !== undefined &&
      activeColorVariantIndex >= 0 &&
      activeColorVariantIndex < (images?.length || 0)
    ) {
      setActiveIndex(activeColorVariantIndex);
    }
  }, [selectedColor, activeColorVariantIndex, images?.length]);

  const safeImages = images && images.length > 0 ? images : [];
  const currentImage = safeImages[activeIndex] || safeImages[0] || null;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
  };

  const markImageFailed = (url: string) => {
    console.error('[DIAGNOSTIC 4/4 - Customer ProductGallery <img src> FAILED]', {
      productName,
      failedImgSrc: url,
    });
    setFailedImages((prev) => ({ ...prev, [url]: true }));
  };

  return (
    <div className="w-full select-none">
      {/* Main Image Frame */}
      <div
        className="relative aspect-square w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage && currentImage.url && !failedImages[currentImage.url] ? (
          <img
            key={currentImage.url}
            src={currentImage.url}
            alt={currentImage.alt}
            onLoad={() => {
              console.info(
                '[DIAGNOSTIC 4/4 - Customer ProductGallery <img src> Loaded]',
                {
                  productName,
                  finalImgSrc: currentImage.url,
                }
              );
            }}
            onError={() => markImageFailed(currentImage.url)}
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-full object-cover object-center transition-opacity duration-200 cursor-zoom-in"
          />
        ) : (
          /* Resilient Styled CSS Fallback Container */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-center">
            <Shirt className="w-20 h-20 text-slate-400 mb-3 stroke-[1.5]" />
            <p className="text-base font-bold text-slate-800">{productName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {currentImage?.caption}
            </p>
          </div>
        )}

        {/* Subtle Bottom Scrim with Image Caption & Counter */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 py-3.5 flex items-center justify-between text-white pointer-events-none">
          <span className="text-xs sm:text-sm font-medium truncate pr-3">
            {selectedColor
              ? `${productName} (${selectedColor})`
              : currentImage?.caption}
          </span>
          <span className="text-xs font-medium text-white/90 tabular-nums shrink-0">
            {activeIndex + 1} / {safeImages.length}
          </span>
        </div>

        {/* Zoom / Fullscreen Trigger Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          aria-label="ছবি বড় করে দেখুন"
          className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-sm transition-transform duration-150 hover:scale-105 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Left / Right Navigation Arrows */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="আগের ছবি"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-sm transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="পরের ছবি"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-sm transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      <div className="mt-3.5 grid grid-cols-5 sm:grid-cols-5 gap-2 sm:gap-2.5">
        {safeImages.map((img, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={img.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={img.alt}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 scale-[1.01]'
                  : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              {img.url && !failedImages[img.url] ? (
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  onError={() => markImageFailed(img.url)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <Shirt className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-sm font-medium truncate">
                {currentImage?.caption}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="বন্ধ করুন"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-square max-h-[75vh] w-full flex items-center justify-center bg-black">
              {currentImage && currentImage.url && !failedImages[currentImage.url] ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt}
                  onError={() => markImageFailed(currentImage.url)}
                  className="max-w-full max-h-[75vh] object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 p-8">
                  <Shirt className="w-16 h-16 mx-auto mb-2" />
                  <p>{productName}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handlePrev}
                aria-label="আগের ছবি"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="পরের ছবি"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
