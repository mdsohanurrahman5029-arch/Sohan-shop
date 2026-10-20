import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  CAMPAIGN_END_TIME,
  ProductConfigItem,
  STORE_CONFIG,
  getProductDiscountInfo,
  toBanglaNumber,
} from '../config/storeConfig';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const calculateTimeLeft = (targetIso: string): TimeLeft => {
  const targetTime = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (isNaN(targetTime) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
};

interface OfferBannerProps {
  product: ProductConfigItem;
  onOrderClick: () => void;
}

export const OfferBanner: React.FC<OfferBannerProps> = ({
  product,
  onOrderClick,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(CAMPAIGN_END_TIME)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(CAMPAIGN_END_TIME));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const padBangla = (val: number) =>
    toBanglaNumber(String(val).padStart(2, '0'));
  const { discountAmount, discountPercentage } =
    getProductDiscountInfo(product);

  return (
    <section className="bg-[#0F172A] text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left: Offer Title & Price Breakdown */}
          <div className="text-center lg:text-left space-y-1.5">
            <p className="text-xs sm:text-sm font-semibold text-amber-400 tracking-wide">
              🔥 বিশেষ অফার — সীমিত সময়ের জন্য ({toBanglaNumber(discountPercentage)}% ছাড়) 🔥
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-sm sm:text-base">
              <span className="text-slate-300">
                রেগুলার প্রাইস:{' '}
                <del className="text-slate-400 font-medium tabular-nums">
                  {STORE_CONFIG.currencySymbol}
                  {toBanglaNumber(product.regularPrice)}
                </del>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-white font-bold text-base sm:text-lg tabular-nums">
                অফার প্রাইস: {STORE_CONFIG.currencySymbol}
                {toBanglaNumber(product.salePrice)}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                সাশ্রয়: {STORE_CONFIG.currencySymbol}
                {toBanglaNumber(discountAmount)} টাকা ছাড়!
              </span>
            </div>
          </div>

          {/* Right: Live JavaScript Countdown Timer & Quick Action */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {!timeLeft.expired ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 mr-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>অফার শেষ হতে বাকি:</span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 tabular-nums">
                  <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                    <div className="text-sm sm:text-base font-bold text-white leading-none">
                      {padBangla(timeLeft.days)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-none">
                      দিন
                    </div>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                    <div className="text-sm sm:text-base font-bold text-white leading-none">
                      {padBangla(timeLeft.hours)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-none">
                      ঘণ্টা
                    </div>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                    <div className="text-sm sm:text-base font-bold text-white leading-none">
                      {padBangla(timeLeft.minutes)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-none">
                      মিনিট
                    </div>
                  </div>
                  <span className="text-slate-500 font-bold">:</span>
                  <div className="bg-slate-800/90 border border-red-500/40 rounded-lg px-2.5 py-1.5 text-center min-w-[52px]">
                    <div className="text-sm sm:text-base font-bold text-amber-400 leading-none">
                      {padBangla(timeLeft.seconds)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-none">
                      সেকেন্ড
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-medium text-amber-400">
                বিশেষ স্টক থাকা পর্যন্ত অফারটি চলমান থাকবে
              </span>
            )}

            <button
              type="button"
              onClick={onOrderClick}
              className="hidden xl:inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              অফারটি লুফে নিন →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
