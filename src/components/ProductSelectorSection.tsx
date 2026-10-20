import React, { useState } from 'react';
import { Check, Shirt } from 'lucide-react';
import {
  ProductConfigItem,
  STORE_CONFIG,
  getProductDiscountInfo,
  normalizeProductImages,
  toBanglaNumber,
} from '../config/storeConfig';

interface ProductSelectorSectionProps {
  products: ProductConfigItem[];
  selectedProduct: ProductConfigItem;
  onSelectProduct: (product: ProductConfigItem) => void;
}

export const ProductSelectorSection: React.FC<ProductSelectorSectionProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
}) => {
  const [failedThumbnails, setFailedThumbnails] = useState<
    Record<string, boolean>
  >({});

  const strictlyActiveProducts = (products || []).filter(
    (p) =>
      p.active === true &&
      !String(p.id || '').toLowerCase().includes('sample-inactive')
  );

  if (strictlyActiveProducts.length === 0) {
    return null;
  }

  return (
    <section id="product-collection" className="pt-6 sm:pt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
            <div>
              <p className="text-xs font-semibold text-[#DC2626] mb-1">
                আমাদের কালেকশন ({toBanglaNumber(strictlyActiveProducts.length)}টি প্রোডাক্ট)
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                আপনার পছন্দের প্রোডাক্টটি নির্বাচন করুন
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              যেকোনো প্রোডাক্টে ক্লিক করলে নিচের বিস্তারিত তথ্য ও অর্ডার ফর্ম অটোমেটিক আপডেট হবে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {strictlyActiveProducts.map((product) => {
              const isSelected = product.id === selectedProduct.id;
              const images = normalizeProductImages(product);
              const coverImage = images[0];
              const { discountPercentage } = getProductDiscountInfo(product);

              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className={`group rounded-xl border-2 p-3.5 transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#DC2626] bg-red-50/25 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Product Thumbnail */}
                    <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 mb-3">
                      {coverImage &&
                      coverImage.url &&
                      !failedThumbnails[coverImage.url] ? (
                        <img
                          key={coverImage.url}
                          src={coverImage.url}
                          alt={product.name}
                          loading="lazy"
                          onLoad={() => {
                            console.info(
                              '[DIAGNOSTIC 4/4 - Customer Product Card <img src> Loaded]',
                              {
                                productId: product.id,
                                finalImgSrc: coverImage.url,
                              }
                            );
                          }}
                          onError={() => {
                            console.error(
                              '[DIAGNOSTIC 4/4 - Customer Product Card <img src> FAILED]',
                              {
                                productId: product.id,
                                failedImgSrc: coverImage.url,
                              }
                            );
                            setFailedThumbnails((prev) => ({
                              ...prev,
                              [coverImage.url]: true,
                            }));
                          }}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <Shirt className="w-10 h-10 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Clean Unboxed Metadata */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span className="font-mono">{product.id}</span>
                      <span aria-hidden="true">·</span>
                      {product.stock ? (
                        <span className="text-emerald-700 font-semibold">
                          স্টকে আছে
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          স্টক আউট
                        </span>
                      )}
                      {discountPercentage > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#DC2626] font-semibold tabular-nums">
                            {toBanglaNumber(discountPercentage)}% ছাড়
                          </span>
                        </>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {product.name}
                    </h3>

                    {/* Available Sizes & Colors Summary */}
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      সাইজ: {product.sizes.join(', ')}
                      {product.colors.length > 0 &&
                        ` · কালার: ${product.colors.join(', ')}`}
                    </p>
                  </div>

                  {/* Price & Selection Action */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-lg font-extrabold text-[#DC2626]">
                        {STORE_CONFIG.currencySymbol}
                        {toBanglaNumber(product.salePrice)}
                      </span>
                      {product.regularPrice > product.salePrice && (
                        <del className="text-xs text-slate-400">
                          {STORE_CONFIG.currencySymbol}
                          {toBanglaNumber(product.regularPrice)}
                        </del>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>নির্বাচিত</span>
                        </>
                      ) : (
                        <span>সিলেক্ট করুন</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
