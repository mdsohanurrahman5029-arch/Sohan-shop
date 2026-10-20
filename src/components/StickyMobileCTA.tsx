import React from 'react';
import { PhoneCall } from 'lucide-react';
import {
  STORE_CONFIG,
  STORE_PHONE,
  toBanglaNumber,
} from '../config/storeConfig';

interface StickyMobileCTAProps {
  grandTotal: number;
  selectedSize: string;
  quantity: number;
  onOrderClick: () => void;
}

export const StickyMobileCTA: React.FC<StickyMobileCTAProps> = ({
  grandTotal,
  selectedSize,
  quantity,
  onOrderClick,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3.5 py-2 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
        {/* Compact Call Button */}
        <a
          href={`tel:${STORE_PHONE}`}
          aria-label="সরাসরি কল করুন"
          className="h-11 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 transition-colors"
        >
          <PhoneCall className="w-4 h-4 text-[#DC2626]" />
          <span>কল</span>
        </a>

        {/* Primary Conversion Order CTA */}
        <button
          type="button"
          onClick={onOrderClick}
          className="flex-1 h-11 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-between transition-all whitespace-nowrap cursor-pointer"
        >
          <span>অর্ডার কনফার্ম করুন ({selectedSize} × {toBanglaNumber(quantity)})</span>
          <span className="font-extrabold tabular-nums">
            {STORE_CONFIG.currencySymbol}
            {toBanglaNumber(grandTotal)}
          </span>
        </button>
      </div>
    </div>
  );
};
