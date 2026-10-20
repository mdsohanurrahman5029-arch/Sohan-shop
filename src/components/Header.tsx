import React from 'react';
import { PhoneCall, ShoppingBag } from 'lucide-react';
import { STORE_CONFIG } from '../config/storeConfig';

interface HeaderProps {
  onScrollToSection: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onScrollToSection }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title (Single clean text element) */}
        <a
          href="#top"
          className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          {STORE_CONFIG.storeName}
        </a>

        {/* Zone 2: 4 Clean Navigation Links (Single-line text with hover underline) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onScrollToSection('hero-product')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            প্রোডাক্ট প্রিভিউ
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection('product-details')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            বিস্তারিত বিবরণ
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection('size-guide')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            সাইজ চার্ট
          </button>
          <button
            type="button"
            onClick={() => onScrollToSection('order-form-section')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ক্যাশ অন ডেলিভারি
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions (Support Call + Direct Order Scroll) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <a
            href={`tel:${STORE_CONFIG.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="সরাসরি কল করুন"
          >
            <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DC2626] shrink-0" />
            <span className="tabular-nums">{STORE_CONFIG.phone}</span>
          </a>

          <button
            type="button"
            onClick={() => onScrollToSection('order-form-section')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>অর্ডার করুন</span>
          </button>
        </div>
      </div>
    </header>
  );
};
