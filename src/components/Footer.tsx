import React from 'react';
import { PhoneCall, MessageCircle } from 'lucide-react';
import {
  STORE_CONFIG,
  STORE_PHONE,
  WHATSAPP_NUMBER,
  toBanglaNumber,
} from '../config/storeConfig';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  const cleanWhatsApp = WHATSAPP_NUMBER.replace(/\D/g, '');

  return (
    <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          {/* Column 1: Brand & Trust */}
          <div>
            <div className="text-xl font-extrabold text-white tracking-tight">
              {STORE_CONFIG.storeName}
            </div>
            <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">
              প্রিমিয়াম কোয়ালিটির পোশাক ও লাইফস্টাইল পণ্যের বিশ্বস্ত অনলাইন শপ। আমরা সারা বাংলাদেশে শতভাগ মানসম্মত পণ্য দ্রুততম সময়ে পৌঁছে দিই।
            </p>
            <p className="mt-3 text-xs text-emerald-400 font-medium">
              💵 ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।
            </p>
          </div>

          {/* Column 2: Delivery Information */}
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide mb-3">
              ডেলিভারি ও রিটার্ন পলিসি
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li>
                • ঢাকার ভিতরে ডেলিভারি চার্জ: ৳
                {toBanglaNumber(STORE_CONFIG.dhakaDelivery)} (
                {STORE_CONFIG.deliveryTimeDhaka})
              </li>
              <li>
                • ঢাকার বাইরে ডেলিভারি চার্জ: ৳
                {toBanglaNumber(STORE_CONFIG.outsideDhakaDelivery)} (
                {STORE_CONFIG.deliveryTimeOutside})
              </li>
              <li>
                • ডেলিভারি ম্যানের সামনে পণ্য চেক করে নেওয়ার সম্পূর্ণ সুবিধা।
              </li>
              <li>
                • সাইজ বা পণ্যে কোনো সমস্যা থাকলে তাৎক্ষণিক এক্সচেঞ্জ সুবিধা।
              </li>
            </ul>
          </div>

          {/* Column 3: Direct Customer Support */}
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide mb-3">
              কাস্টমার সাপোর্ট ও যোগাযোগ
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-3">
              যেকোনো প্রয়োজনে বা ফোনে অর্ডার করতে আমাদের কল করুন অথবা WhatsApp-এ মেসেজ দিন:
            </p>
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5">
              <a
                href={`tel:${STORE_PHONE}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-amber-400 transition-colors tabular-nums"
              >
                <PhoneCall className="w-4 h-4 text-[#DC2626] shrink-0" />
                <span>হটলাইন: {STORE_PHONE}</span>
              </a>
              <a
                href={`https://wa.me/${cleanWhatsApp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors tabular-nums"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp: +{cleanWhatsApp}</span>
              </a>
              <p className="text-xs text-slate-500 mt-1">
                সাপোর্ট সময়: {STORE_CONFIG.supportHours}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© 2026 SOHAN SHOP. All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            <span>সারা বাংলাদেশে হোম ডেলিভারি · ক্যাশ অন ডেলিভারি</span>
            {onOpenAdmin && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="text-slate-500 hover:text-slate-300 underline underline-offset-4 transition-colors cursor-pointer"
                >
                  Admin Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
