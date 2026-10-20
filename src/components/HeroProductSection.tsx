import React from 'react';
import { Minus, Plus, Star, Check } from 'lucide-react';
import {
  ProductConfigItem,
  STORE_CONFIG,
  getColorSwatchHex,
  getProductDiscountInfo,
  normalizeProductImages,
  resolveColorVariantImageIndex,
  toBanglaNumber,
} from '../config/storeConfig';
import { ProductGallery } from './ProductGallery';

interface HeroProductSectionProps {
  product: ProductConfigItem;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  quantity: number;
  onChangeQuantity: (newQty: number) => void;
  onOrderNowClick: () => void;
  onOpenSizeGuide: () => void;
}

export const HeroProductSection: React.FC<HeroProductSectionProps> = ({
  product,
  selectedSize,
  onSelectSize,
  selectedColor,
  onSelectColor,
  quantity,
  onChangeQuantity,
  onOrderNowClick,
  onOpenSizeGuide,
}) => {
  const subtotal = product.salePrice * quantity;
  const { discountAmount, discountPercentage } =
    getProductDiscountInfo(product);
  const images = normalizeProductImages(product);
  const activeColorVariantIndex = resolveColorVariantImageIndex(
    product,
    images,
    selectedColor
  );

  const insideDhakaCharge =
    product.deliveryInfo?.insideDhaka ??
    STORE_CONFIG.deliveryCharges.insideDhaka;
  const outsideDhakaCharge =
    product.deliveryInfo?.outsideDhaka ??
    STORE_CONFIG.deliveryCharges.outsideDhaka;

  const availableStock =
    product.stockQuantity !== undefined
      ? product.stockQuantity
      : product.stock
      ? STORE_CONFIG.maxQuantity
      : 0;
  const isInStock = product.stock && availableStock > 0;
  const maxAllowedQty = Math.max(
    1,
    Math.min(STORE_CONFIG.maxQuantity, availableStock)
  );

  const handleDecrement = () => {
    if (quantity > STORE_CONFIG.minQuantity) {
      onChangeQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxAllowedQty) {
      onChangeQuantity(quantity + 1);
    }
  };

  return (
    <section id="hero-product" className="py-6 sm:py-10 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Product Gallery (6 cols on desktop) */}
            <div className="lg:col-span-6 lg:sticky lg:top-24">
              <ProductGallery
                images={images}
                productName={product.name}
                selectedColor={selectedColor}
                activeColorVariantIndex={activeColorVariantIndex}
              />
            </div>

            {/* Right Column: Contiguous Purchase Module (6 cols on desktop) */}
            <div className="lg:col-span-6 flex flex-col">
              {/* Quiet Unboxed Metadata Line */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">
                  {STORE_CONFIG.storeName}
                </span>
                <span aria-hidden="true">·</span>
                <span>ID: {product.id}</span>
                <span aria-hidden="true">·</span>
                {isInStock ? (
                  <span className="text-emerald-700 font-semibold">
                    স্টকে আছে ({toBanglaNumber(availableStock)}টি)
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    স্টক আউট (Out of Stock)
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Subtitle / Description */}
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                {product.subtitle || product.description}
              </p>

              {/* Rating & Review Indicator (Clean unboxed inline metadata) */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  ৪.৯/৫.০
                </span>
                <span aria-hidden="true">·</span>
                <span>৪২৮+ ভেরিফাইড কাস্টমার রিভিউ</span>
              </div>

              {/* Pricing Block */}
              <div className="mt-5 pt-5 border-t border-slate-200">
                <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#DC2626] tabular-nums">
                    {STORE_CONFIG.currencySymbol}
                    {toBanglaNumber(product.salePrice)}
                  </div>
                  {product.regularPrice > product.salePrice && (
                    <>
                      <div className="text-lg sm:text-xl text-slate-400 line-through font-medium tabular-nums">
                        {STORE_CONFIG.currencySymbol}
                        {toBanglaNumber(product.regularPrice)}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-emerald-700 tabular-nums">
                        (সাশ্রয় {STORE_CONFIG.currencySymbol}
                        {toBanglaNumber(discountAmount)} টাকা ·{' '}
                        {toBanglaNumber(discountPercentage)}% ছাড়)
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  পণ্যের মূল্য ডেলিভারির সময় Cash on Delivery হিসেবে পরিশোধ করতে হবে (শুধুমাত্র ডেলিভারি চার্জ অগ্রিম প্রযোজ্য)।
                </p>
              </div>

              {/* Key Product Features */}
              {product.features && product.features.length > 0 && (
                <ul className="mt-5 space-y-2 border-t border-slate-200 pt-5">
                  {product.features.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-slate-700"
                    >
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-bold text-slate-900">
                      কালার নির্বাচন করুন (Color):{' '}
                      <span className="text-[#DC2626] font-extrabold ml-1">
                        {selectedColor}
                      </span>
                    </label>
                    <span className="text-xs text-slate-500">
                      কালারে ক্লিক করলে ছবি পরিবর্তন হবে
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color) => {
                      const active = selectedColor === color;
                      const variantImgIdx = resolveColorVariantImageIndex(
                        product,
                        images,
                        color
                      );
                      const variantThumbUrl =
                        images[variantImgIdx]?.url || images[0]?.url || '';
                      const swatchHex = getColorSwatchHex(color);

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => onSelectColor(color)}
                          aria-pressed={active}
                          className={`px-3.5 h-12 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#0F172A] text-white border-2 border-[#DC2626] ring-2 ring-[#DC2626]/20 shadow-sm'
                              : 'bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {variantThumbUrl ? (
                            <img
                              src={variantThumbUrl}
                              alt={color}
                              className="w-7 h-7 rounded-lg object-cover border border-white/30 shrink-0"
                            />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: swatchHex }}
                            />
                          )}
                          <span>{color}</span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-bold text-slate-900">
                      সাইজ নির্বাচন করুন (Size):{' '}
                      <span className="text-[#DC2626] font-extrabold ml-1">
                        {selectedSize}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={onOpenSizeGuide}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                    >
                      সাইজ মাপ দেখুন (Size Chart)
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                    {product.sizes.map((size) => {
                      const active = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => onSelectSize(size)}
                          aria-pressed={active}
                          className={`h-12 rounded-xl font-bold text-sm sm:text-base transition-all duration-150 flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#0F172A] text-white border-2 border-[#0F172A] shadow-sm'
                              : 'bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector & Live Subtotal */}
              <div className="mt-5">
                <label className="block text-sm font-bold text-slate-900 mb-2.5">
                  পরিমাণ (Quantity):
                </label>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={quantity <= STORE_CONFIG.minQuantity}
                      aria-label="পরিমাণ কমান"
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-14 text-center text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                      {toBanglaNumber(quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={!isInStock || quantity >= maxAllowedQty}
                      aria-label="পরিমাণ বাড়ান"
                      className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">
                      পণ্যের মোট মূল্য ({toBanglaNumber(quantity)}টি)
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                      {STORE_CONFIG.currencySymbol}
                      {toBanglaNumber(subtotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Hero CTA */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  disabled={!isInStock}
                  onClick={onOrderNowClick}
                  className="w-full py-4 px-6 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] disabled:bg-slate-400 text-white font-bold text-base sm:text-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {isInStock ? (
                    <>
                      <span>🛒 এখনই অর্ডার করুন</span>
                      <span className="text-white/90 font-semibold tabular-nums">
                        — {STORE_CONFIG.currencySymbol}
                        {toBanglaNumber(subtotal)}
                      </span>
                    </>
                  ) : (
                    <span>স্টক আউট (Out of Stock)</span>
                  )}
                </button>

                {/* Trust & Delivery Footnote */}
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600 text-center">
                  <span>💵 পণ্যের মূল্য ক্যাশ অন ডেলিভারি</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    🚚 ঢাকার ভিতরে ৳{toBanglaNumber(insideDhakaCharge)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    ঢাকার বাইরে ৳{toBanglaNumber(outsideDhakaCharge)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
