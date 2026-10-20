/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle, Package } from 'lucide-react';
import {
  DELIVERY_CHARGE,
  ProductConfigItem,
  STORE_CONFIG,
} from './config/storeConfig';
import {
  fetchActiveProductsWithRetry,
  subscribeToActiveProducts,
} from './services/firestoreService';
import { Header } from './components/Header';
import { OfferBanner } from './components/OfferBanner';
import { ProductSelectorSection } from './components/ProductSelectorSection';
import { HeroProductSection } from './components/HeroProductSection';
import { ProductDescriptionSection } from './components/ProductDescriptionSection';
import {
  DeliveryLocationType,
  OrderFormSection,
} from './components/OrderFormSection';
import { Footer } from './components/Footer';
import { StickyMobileCTA } from './components/StickyMobileCTA';
import { AdminPanel } from './components/AdminPanel';

const checkIsAdminRoute = (): boolean => {
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash === '#/admin' ||
    window.location.hash === '#admin'
  );
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute);
  // Customer View strictly displays ONLY Firestore products where active === true (no local/sample fallback)
  const [activeProducts, setActiveProducts] = useState<ProductConfigItem[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductConfigItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>(
    STORE_CONFIG.defaultSize || 'M'
  );
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(STORE_CONFIG.minQuantity);
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocationType | null>(null);

  // Sync URL navigation for /admin and public storefront
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasSelectedInitialFirestoreProductRef = useRef<boolean>(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);

  const applyFetchedProducts = useCallback((dbProducts: ProductConfigItem[]) => {
    const strictlyActive = (dbProducts || []).filter((p) => p.active === true);
    setActiveProducts(strictlyActive);

    if (strictlyActive.length === 0) {
      setSelectedProduct(null);
      return;
    }

    setSelectedProduct((prev) => {
      if (!prev || !hasSelectedInitialFirestoreProductRef.current) {
        hasSelectedInitialFirestoreProductRef.current = true;
        return strictlyActive[0];
      }
      const updatedMatch =
        strictlyActive.find((p) => p.id === prev.id) || strictlyActive[0];
      return updatedMatch;
    });
  }, []);

  const loadCustomerProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductLoadError(null);
    try {
      const fetched = await fetchActiveProductsWithRetry(3);
      applyFetchedProducts(fetched);
    } catch (err) {
      console.error('[CUSTOMER PRODUCTS ERROR] Failed after retries:', err);
      setProductLoadError('পণ্য লোড হতে একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [applyFetchedProducts]);

  // 1. Primary load via one-time getDocs() with 3 retries, then optional onSnapshot()
  useEffect(() => {
    let isMounted = true;
    let unsubscribeSnapshot: (() => void) | null = null;

    loadCustomerProducts().finally(() => {
      if (!isMounted) return;
      // Optional realtime enhancement — never clears already-loaded products on WebChannel error
      unsubscribeSnapshot = subscribeToActiveProducts((liveProducts) => {
        if (isMounted) {
          applyFetchedProducts(liveProducts);
          setProductLoadError(null);
        }
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [loadCustomerProducts, applyFetchedProducts]);

  // Keep selectedSize, selectedColor, and quantity within valid bounds when selectedProduct updates
  useEffect(() => {
    if (!selectedProduct) return;
    if (!selectedProduct.sizes.includes(selectedSize)) {
      setSelectedSize(selectedProduct.sizes[0] || 'M');
    }
    if (
      selectedProduct.colors.length > 0 &&
      !selectedProduct.colors.includes(selectedColor)
    ) {
      setSelectedColor(selectedProduct.colors[0]);
    } else if (selectedProduct.colors.length === 0) {
      setSelectedColor('');
    }
    const maxStock =
      selectedProduct.stockQuantity !== undefined
        ? Math.max(1, Math.min(STORE_CONFIG.maxQuantity, selectedProduct.stockQuantity))
        : STORE_CONFIG.maxQuantity;
    if (quantity > maxStock) {
      setQuantity(maxStock);
    }
  }, [selectedProduct, selectedSize, selectedColor, quantity]);

  const handleSelectProduct = (product: ProductConfigItem) => {
    setSelectedProduct(product);
    if (!product.sizes.includes(selectedSize)) {
      setSelectedSize(product.sizes[0] || 'M');
    }
    if (!product.colors.includes(selectedColor)) {
      setSelectedColor(product.colors[0] || '');
    }
  };

  // Render Completely Separate Protected Admin Panel on /admin route
  if (isAdminRoute) {
    return <AdminPanel onExitAdmin={navigateToStore} />;
  }

  const subtotal = selectedProduct ? selectedProduct.salePrice * quantity : 0;
  const insideDhakaFee =
    selectedProduct?.deliveryInfo?.insideDhaka ??
    DELIVERY_CHARGE.insideDhaka;
  const outsideDhakaFee =
    selectedProduct?.deliveryInfo?.outsideDhaka ??
    DELIVERY_CHARGE.outsideDhaka;

  const deliveryCharge =
    deliveryLocation === 'inside_dhaka'
      ? insideDhakaFee
      : deliveryLocation === 'outside_dhaka'
      ? outsideDhakaFee
      : 0;
  const grandTotal = subtotal + deliveryCharge;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* 1. Compact & Trustworthy SOHAN SHOP Header */}
      <Header onScrollToSection={scrollToSection} />

      {/* 2. Promotional Campaign Offer & Live Countdown Banner (only when an active product exists) */}
      {selectedProduct && (
        <OfferBanner
          product={selectedProduct}
          onOrderClick={() => scrollToSection('order-form-section')}
        />
      )}

      {/* Main Content Flow */}
      <main className="flex-1">
        {/* Non-blocking Bengali Retry Banner if initial Firestore getDocs retries fail */}
        {productLoadError && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{productLoadError}</span>
              </div>
              <button
                type="button"
                onClick={loadCustomerProducts}
                disabled={isLoadingProducts}
                className="px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isLoadingProducts ? 'animate-spin' : ''
                  }`}
                />
                <span>আবার চেষ্টা করুন</span>
              </button>
            </div>
          </div>
        )}

        {isLoadingProducts && activeProducts.length === 0 ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
              <p className="text-sm sm:text-base font-semibold text-slate-700">
                পণ্য লোড হচ্ছে...
              </p>
            </div>
          </div>
        ) : activeProducts.length === 0 || !selectedProduct ? (
          /* Clean Empty State when Firestore has 0 active products */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                এই মুহূর্তে কোনো পণ্য পাওয়া যায়নি।
              </h2>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={loadCustomerProducts}
                  disabled={isLoadingProducts}
                  className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      isLoadingProducts ? 'animate-spin' : ''
                    }`}
                  />
                  <span>আবার চেষ্টা করুন</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 3. Multi-Product Active Collection Grid */}
            <ProductSelectorSection
              products={activeProducts}
              selectedProduct={selectedProduct}
              onSelectProduct={(product) => {
                handleSelectProduct(product);
                scrollToSection('hero-product');
              }}
            />

            {/* 4. Hero Product Showcase (Gallery + Contiguous Purchase Module) */}
            <HeroProductSection
              product={selectedProduct}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              quantity={quantity}
              onChangeQuantity={setQuantity}
              onOrderNowClick={() => scrollToSection('order-form-section')}
              onOpenSizeGuide={() => scrollToSection('size-guide')}
            />

            {/* 5. Detailed Bengali Product Description, Size Chart & Customer Proof */}
            <ProductDescriptionSection
              product={selectedProduct}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              onOrderNowClick={() => scrollToSection('order-form-section')}
            />

            {/* 6. One-Step Checkout Order Form & Live Order Summary */}
            <OrderFormSection
              activeProducts={activeProducts}
              selectedProduct={selectedProduct}
              onSelectProduct={handleSelectProduct}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              quantity={quantity}
              onChangeQuantity={setQuantity}
              deliveryLocation={deliveryLocation}
              onChangeDeliveryLocation={setDeliveryLocation}
            />
          </>
        )}
      </main>

      {/* 7. Professional Footer */}
      <Footer onOpenAdmin={navigateToAdmin} />

      {/* 8. Sticky Bottom Mobile Conversion Bar (only when an active product exists) */}
      {selectedProduct && activeProducts.length > 0 && (
        <StickyMobileCTA
          grandTotal={grandTotal}
          selectedSize={selectedSize}
          quantity={quantity}
          onOrderClick={() => scrollToSection('order-form-section')}
        />
      )}
    </div>
  );
}
