import React from 'react';
import { Check } from 'lucide-react';
import {
  ProductConfigItem,
  STORE_CONFIG,
  toBanglaNumber,
} from '../config/storeConfig';

interface ProductDescriptionSectionProps {
  product: ProductConfigItem;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onOrderNowClick: () => void;
}

export const ProductDescriptionSection: React.FC<ProductDescriptionSectionProps> = ({
  product,
  selectedSize,
  onSelectSize,
  onOrderNowClick,
}) => {
  const insideDhakaCharge =
    product.deliveryInfo?.insideDhaka ??
    STORE_CONFIG.deliveryCharges.insideDhaka;
  const outsideDhakaCharge =
    product.deliveryInfo?.outsideDhaka ??
    STORE_CONFIG.deliveryCharges.outsideDhaka;

  return (
    <section id="product-details" className="py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10">
        {/* Detailed Bengali Product Narrative & Specifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#DC2626] mb-1">
              পণ্যের বিস্তারিত বিবরণ ({product.id})
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              কেন {STORE_CONFIG.storeName}-এর {product.name} আপনার প্রতিদিনের সেরা পছন্দ?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Dynamic Product Features & Delivery Info */}
          <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
                প্রোডাক্টের প্রধান বৈশিষ্ট্যসমূহ (Product Features):
              </h3>
              <ul className="space-y-2">
                {product.features.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
                সাইজ, কালার ও ডেলিভারি তথ্য:
              </h3>
              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  • <strong>উপলব্ধ সাইজ (Available Sizes):</strong>{' '}
                  {product.sizes.join(', ')}
                </p>
                {product.colors.length > 0 && (
                  <p>
                    • <strong>উপলব্ধ কালার (Available Colors):</strong>{' '}
                    {product.colors.join(', ')}
                  </p>
                )}
                <p>
                  • <strong>স্টক স্ট্যাটাস:</strong>{' '}
                  {product.stock
                    ? 'স্টকে আছে (In Stock)'
                    : 'স্টক আউট (Out of Stock)'}
                </p>
                <p>
                  • <strong>ডেলিভারি চার্জ:</strong> ঢাকার ভিতরে ৳
                  {toBanglaNumber(insideDhakaCharge)} · ঢাকার বাইরে ৳
                  {toBanglaNumber(outsideDhakaCharge)}
                </p>
              </div>
            </div>
          </div>

          {/* 4 Editorial Numbered Specifications */}
          <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ০১. ফেব্রিক ও ম্যাটেরিয়াল কোয়ালিটি
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                ১০০% এক্সপোর্ট গ্রেড কম্বড কটন (১৮০–১৯০ GSM)। ফেব্রিকটি অত্যন্ত মোলায়েম ও শ্বাসপ্রশ্বাসযোগ্য (Breathable), যা অতিরিক্ত ঘাম শোষণ করে শরীর ঠান্ডা রাখে।
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ০২. আরাম ও আধুনিক ফিট (Comfort & Fit)
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                আমাদের নিজস্ব প্যাটার্নে তৈরি রেগুলার মডার্ন ফিট যা কাঁধ ও বুকে চমৎকারভাবে মানিয়ে যায়। দীর্ঘ সময় ভ্রমণ, অফিস, ক্যাম্পাস বা আড্ডায় পরার জন্য শতভাগ আরামদায়ক।
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ০৩. টেকসই স্টিচিং ও কালার গ্যারান্টি
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                গলায় প্রিমিয়াম লাইক্রা রিব ব্যবহার করা হয়েছে যেন বারবার ধোয়ার পরেও কলার ঢিলা না হয়। এনজাইম ও সিলিকন ওয়াশ করায় রঙ উঠবে না এবং ববলিন বা রোঁয়া ওঠার ভয় নেই।
              </p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ০৪. বহুমুখী ব্যবহার ও যত্ন (Usage & Care)
              </h3>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                জিন্স, গ্যাবার্ডিন বা ট্রাউজারের সাথে ক্যাজুয়াল কিংবা সেমি-ফরমাল লুকে সহজেই মানানসই। সাধারণ ঠান্ডা পানিতে মাইল্ড ডিটারজেন্ট দিয়ে ধুয়ে নিলেই নতুনের মতো থাকবে।
              </p>
            </div>
          </div>
        </div>

        {/* Size Chart & Measurement Table */}
        <div
          id="size-guide"
          className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-[#DC2626] mb-1">
                সঠিক মাপ নির্বাচন করুন
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                সাইজ মেজারমেন্ট চার্ট (ইঞ্চিতে)
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                টেবিলের যেকোনো সাইজে ক্লিক করে সরাসরি আপনার সাইজটি সিলেক্ট করতে পারেন।
              </p>
            </div>

            <button
              type="button"
              onClick={onOrderNowClick}
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              সাইজ অনুযায়ী অর্ডার করুন →
            </button>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs sm:text-sm font-bold text-slate-700 bg-slate-50">
                  <th className="py-3.5 px-4 rounded-tl-xl">সাইজ (Size)</th>
                  <th className="py-3.5 px-4">বুক (Chest)</th>
                  <th className="py-3.5 px-4">লম্বা (Length)</th>
                  <th className="py-3.5 px-4">হাতা (Sleeve)</th>
                  <th className="py-3.5 px-4 text-right rounded-tr-xl">নির্বাচন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm tabular-nums">
                {STORE_CONFIG.sizeChart
                  .filter((row) => product.sizes.includes(row.size))
                  .map((row) => {
                    const isSelected = selectedSize === row.size;
                    return (
                      <tr
                        key={row.size}
                        onClick={() => onSelectSize(row.size)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-red-50/70 font-semibold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {row.size}
                        </td>
                        <td className="py-3.5 px-4">{row.chest}</td>
                        <td className="py-3.5 px-4">{row.length}</td>
                        <td className="py-3.5 px-4">{row.sleeve}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-block text-xs font-bold px-3 py-1 rounded-lg ${
                              isSelected
                                ? 'bg-[#DC2626] text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isSelected ? 'নির্বাচিত ✓' : 'সিলেক্ট করুন'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Verified Customer Social Proof Adjacent to Product Claims */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="text-sm text-slate-600 leading-relaxed">
              <p className="text-slate-800 font-medium">
                “আগে অনলাইনে টি-শার্ট কিনে কাপড়ের মান নিয়ে হতাশ হয়েছিলাম, কিন্তু SOHAN SHOP থেকে L সাইজ নেওয়ার পর দেখলাম কাপড়ের থিকনেস এবং সেলাই সত্যিই দারুণ। ডেলিভারি ম্যানের সামনে চেক করে টাকা দিয়েছি।”
              </p>
              <footer className="mt-2 text-xs text-slate-500">
                — <strong className="text-slate-800">তানভীর আহমেদ</strong> · সিনিয়র এক্সিকিউটিভ, উত্তরা, ঢাকা · ভেরিফাইড ক্রেতা
              </footer>
            </blockquote>

            <blockquote className="text-sm text-slate-600 leading-relaxed">
              <p className="text-slate-800 font-medium">
                “গরমে প্রতিদিন পরার জন্য ২টা অর্ডার করেছিলাম। ৩ বার ধোয়ার পরও রঙ বা সাইজের কোনো পরিবর্তন হয়নি। দাম অনুযায়ী কোয়ালিটি ১০ এ ১০।”
              </p>
              <footer className="mt-2 text-xs text-slate-500">
                — <strong className="text-slate-800">মাহমুদুল হাসান রাহাত</strong> · ব্যবসায়ী, আগ্রাবাদ, চট্টগ্রাম · ভেরিফাইড ক্রেতা
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};
