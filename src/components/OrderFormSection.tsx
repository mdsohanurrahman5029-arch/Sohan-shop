import React, { useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  PhoneCall,
  Send,
  Truck,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  BANGLADESH_DISTRICTS_BY_DIVISION,
  BKASH_PERSONAL_NUMBER,
  DELIVERY_CHARGE,
  GOOGLE_SHEETS_WEB_APP_URL,
  NAGAD_PERSONAL_NUMBER,
  ProductConfigItem,
  STORE_CONFIG,
  STORE_PHONE,
  WHATSAPP_NUMBER,
  getColorSwatchHex,
  normalizeProductImages,
  resolveColorVariantImageIndex,
  toBanglaNumber,
} from '../config/storeConfig';
import { createOrderInFirestore } from '../services/firestoreService';

export type DeliveryLocationType = 'inside_dhaka' | 'outside_dhaka';
export type PaymentMethodType = 'bKash' | 'Nagad';
export type PaymentStatusType =
  | 'PAYMENT VERIFICATION PENDING'
  | 'PAID'
  | 'REJECTED';
export type OrderStatusType =
  | 'PENDING PAYMENT VERIFICATION'
  | 'CONFIRMED'
  | 'PAYMENT REJECTED';

interface OrderFormSectionProps {
  activeProducts: ProductConfigItem[];
  selectedProduct: ProductConfigItem;
  onSelectProduct: (product: ProductConfigItem) => void;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  deliveryLocation: DeliveryLocationType | null;
  onChangeDeliveryLocation: (loc: DeliveryLocationType) => void;
}

interface FormErrors {
  customerName?: string;
  mobileNumber?: string;
  district?: string;
  fullAddress?: string;
  deliveryLocation?: string;
  paymentMethod?: string;
  senderMobile?: string;
  transactionId?: string;
}

interface SubmittedOrderData {
  orderId: string;
  timestamp: string;
  customerName: string;
  mobileNumber: string;
  district: string;
  fullAddress: string;
  productId: string;
  productName: string;
  unitPrice: number;
  size: string;
  color: string;
  quantity: number;
  deliveryLocationKey: DeliveryLocationType;
  deliveryTypeLabel: string;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  onlinePaid: number;
  codAmount: number;
  paymentMethod: PaymentMethodType;
  paymentAccountNumber: string;
  senderMobile: string;
  transactionId: string;
  paymentStatus: PaymentStatusType;
  orderStatus: OrderStatusType;
  note?: string;
}

let orderSequenceCounter = 1;

const generateUniqueOrderId = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(orderSequenceCounter++).padStart(4, '0');
  return `SOHAN-${yyyy}${mm}${dd}-${seq}`;
};

export const OrderFormSection: React.FC<OrderFormSectionProps> = ({
  activeProducts,
  selectedProduct,
  onSelectProduct,
  selectedSize,
  onSelectSize,
  selectedColor,
  onSelectColor,
  quantity,
  onChangeQuantity,
  deliveryLocation,
  onChangeDeliveryLocation,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [fullAddress, setFullAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(
    null
  );
  const [senderMobile, setSenderMobile] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] =
    useState<SubmittedOrderData | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const insideDhakaFee =
    selectedProduct.deliveryInfo?.insideDhaka ??
    DELIVERY_CHARGE.insideDhaka;
  const outsideDhakaFee =
    selectedProduct.deliveryInfo?.outsideDhaka ??
    DELIVERY_CHARGE.outsideDhaka;

  // Strict Calculations:
  // Product Total = selectedProduct.salePrice * quantity (Always Cash on Delivery)
  // Delivery Charge = 60 (Inside Dhaka) or 120 (Outside Dhaka) (Always Paid in Advance)
  const subtotal = selectedProduct.salePrice * quantity;
  const deliveryCharge =
    deliveryLocation === 'inside_dhaka'
      ? insideDhakaFee
      : deliveryLocation === 'outside_dhaka'
      ? outsideDhakaFee
      : 0;
  const grandTotal = subtotal + deliveryCharge;
  const onlinePaid = deliveryCharge;
  const codAmount = subtotal;

  const deliveryTypeLabel =
    deliveryLocation === 'inside_dhaka'
      ? 'ঢাকার ভিতরে'
      : deliveryLocation === 'outside_dhaka'
      ? 'ঢাকার বাইরে'
      : 'নির্বাচন করা হয়নি';

  const activePaymentNumber =
    paymentMethod === 'bKash'
      ? BKASH_PERSONAL_NUMBER
      : paymentMethod === 'Nagad'
      ? NAGAD_PERSONAL_NUMBER
      : '';

  const handleCopyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch {
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    }
  };

  const handleSelectDeliveryLocation = (loc: DeliveryLocationType) => {
    onChangeDeliveryLocation(loc);
    if (errors.deliveryLocation) {
      setErrors((prev) => ({ ...prev, deliveryLocation: undefined }));
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    if (errors.district) {
      setErrors((prev) => ({ ...prev, district: undefined }));
    }
  };

  const normalizePhoneDigits = (input: string): string => {
    const banglaToEng: Record<string, string> = {
      '০': '0',
      '১': '1',
      '২': '2',
      '৩': '3',
      '৪': '4',
      '৫': '5',
      '৬': '6',
      '৭': '7',
      '৮': '8',
      '৯': '9',
    };
    return input
      .replace(/[০-৯]/g, (d) => banglaToEng[d] || d)
      .replace(/[\s-]/g, '');
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedName = customerName.trim();
    const cleanPhone = normalizePhoneDigits(mobileNumber.trim());
    const trimmedAddress = fullAddress.trim();
    const cleanSenderMobile = normalizePhoneDigits(senderMobile.trim());
    const trimmedTrxId = transactionId.trim();

    if (!trimmedName || trimmedName.length < 2) {
      newErrors.customerName = 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।';
    }

    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
    if (!cleanPhone) {
      newErrors.mobileNumber = 'আপনার সচল মোবাইল নাম্বারটি লিখুন।';
    } else if (!bdPhoneRegex.test(cleanPhone)) {
      newErrors.mobileNumber =
        'সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।';
    }

    if (!district) {
      newErrors.district = 'আপনার জেলা নির্বাচন করুন।';
    }

    if (!trimmedAddress || trimmedAddress.length < 6) {
      newErrors.fullAddress =
        'ডেলিভারির জন্য আপনার সম্পূর্ণ ঠিকানা (বাড়ি/রোড/থানা) লিখুন।';
    }

    if (!deliveryLocation) {
      newErrors.deliveryLocation =
        'অর্ডার সম্পন্ন করার আগে ডেলিভারি লোকেশন (ঢাকার ভিতরে বা ঢাকার বাইরে) নির্বাচন করুন।';
    }

    if (!paymentMethod) {
      newErrors.paymentMethod =
        'ডেলিভারি চার্জ পাঠানোর জন্য পেমেন্ট মাধ্যম (bKash অথবা Nagad) নির্বাচন করুন।';
    }

    if (!cleanSenderMobile) {
      newErrors.senderMobile = 'যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি লিখুন।';
    } else if (!bdPhoneRegex.test(cleanSenderMobile)) {
      newErrors.senderMobile =
        'যে নম্বর থেকে টাকা পাঠিয়েছেন তার সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।';
    }

    if (!trimmedTrxId || trimmedTrxId.length < 4) {
      newErrors.transactionId =
        'অনুগ্রহ করে সঠিক Transaction ID (TrxID) লিখুন।';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildWhatsAppUrl = (data: SubmittedOrderData) => {
    const lines = [
      `SOHAN SHOP - NEW ORDER`,
      ``,
      `Order ID: ${data.orderId}`,
      `Customer Name: ${data.customerName}`,
      `Customer Phone: ${data.mobileNumber}`,
      `District: ${data.district}`,
      `Full Address: ${data.fullAddress}`,
      data.note ? `Note: ${data.note}` : null,
      ``,
      `Product ID: ${data.productId}`,
      `Product: ${data.productName}`,
      `Unit Price: ${STORE_CONFIG.currencySymbol}${data.unitPrice}`,
      `Size: ${data.size}`,
      data.color ? `Color: ${data.color}` : null,
      `Quantity: ${data.quantity}`,
      ``,
      `Delivery Location: ${data.deliveryTypeLabel}`,
      ``,
      `Product Total: ${STORE_CONFIG.currencySymbol}${data.subtotal}`,
      `Delivery Charge: ${STORE_CONFIG.currencySymbol}${data.deliveryCharge}`,
      `Total Order Value: ${STORE_CONFIG.currencySymbol}${data.grandTotal}`,
      ``,
      `Payment Method: ${data.paymentMethod} Personal Send Money (${data.paymentAccountNumber})`,
      `Sender Mobile: ${data.senderMobile}`,
      `Transaction ID: ${data.transactionId}`,
      ``,
      `Online Paid: ${STORE_CONFIG.currencySymbol}${data.onlinePaid}`,
      `COD Amount: ${STORE_CONFIG.currencySymbol}${data.codAmount}`,
      ``,
      `Payment Status: ${data.paymentStatus}`,
      `Order Status: ${data.orderStatus}`,
    ].filter((line) => line !== null);

    const encodedMessage = encodeURIComponent(lines.join('\n'));
    const cleanWhatsAppNumber = WHATSAPP_NUMBER.replace(/\D/g, '');
    return `https://wa.me/${cleanWhatsAppNumber}?text=${encodedMessage}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !deliveryLocation || !paymentMethod) return;

    setIsSubmitting(true);
    const normalizedPhone = normalizePhoneDigits(mobileNumber.trim()).replace(
      /^(?:\+?88)/,
      ''
    );
    const normalizedSender = normalizePhoneDigits(senderMobile.trim()).replace(
      /^(?:\+?88)/,
      ''
    );
    const cleanTrxId = transactionId.trim().toUpperCase();
    const timestamp = new Date().toISOString();
    const orderId = generateUniqueOrderId();

    const exactDeliveryCharge =
      deliveryLocation === 'inside_dhaka' ? insideDhakaFee : outsideDhakaFee;
    const exactSubtotal = selectedProduct.salePrice * quantity;
    const exactGrandTotal = exactSubtotal + exactDeliveryCharge;
    const exactDeliveryLabel =
      deliveryLocation === 'inside_dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে';
    const paymentAcc =
      paymentMethod === 'bKash' ? BKASH_PERSONAL_NUMBER : NAGAD_PERSONAL_NUMBER;

    const newOrderData: SubmittedOrderData = {
      orderId,
      timestamp,
      customerName: customerName.trim(),
      mobileNumber: normalizedPhone,
      district,
      fullAddress: fullAddress.trim(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      unitPrice: selectedProduct.salePrice,
      size: selectedSize,
      color: selectedColor,
      quantity,
      deliveryLocationKey: deliveryLocation,
      deliveryTypeLabel: exactDeliveryLabel,
      subtotal: exactSubtotal,
      deliveryCharge: exactDeliveryCharge,
      grandTotal: exactGrandTotal,
      onlinePaid: exactDeliveryCharge,
      codAmount: exactSubtotal,
      paymentMethod,
      paymentAccountNumber: paymentAcc,
      senderMobile: normalizedSender,
      transactionId: cleanTrxId,
      paymentStatus: 'PAYMENT VERIFICATION PENDING',
      orderStatus: 'PENDING PAYMENT VERIFICATION',
      note: orderNote.trim() || undefined,
    };

    try {
      await createOrderInFirestore({
        orderId,
        customerName: newOrderData.customerName,
        mobileNumber: newOrderData.mobileNumber,
        district: newOrderData.district,
        fullAddress: newOrderData.fullAddress,
        note: newOrderData.note,
        productId: newOrderData.productId,
        productName: newOrderData.productName,
        unitPrice: newOrderData.unitPrice,
        size: newOrderData.size,
        color: newOrderData.color,
        quantity: newOrderData.quantity,
        deliveryLocation: deliveryLocation,
        deliveryTypeLabel: newOrderData.deliveryTypeLabel,
        subtotal: newOrderData.subtotal,
        deliveryCharge: newOrderData.deliveryCharge,
        grandTotal: newOrderData.grandTotal,
        onlinePaid: newOrderData.onlinePaid,
        codAmount: newOrderData.codAmount,
        paymentMethod: newOrderData.paymentMethod,
        paymentAccountNumber: newOrderData.paymentAccountNumber,
        senderMobile: newOrderData.senderMobile,
        transactionId: newOrderData.transactionId,
      });
    } catch (err) {
      console.warn('Firestore order save note:', err);
    }

    if (GOOGLE_SHEETS_WEB_APP_URL && GOOGLE_SHEETS_WEB_APP_URL.trim() !== '') {
      try {
        await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Timestamp: timestamp,
            OrderId: orderId,
            CustomerName: newOrderData.customerName,
            Phone: newOrderData.mobileNumber,
            District: newOrderData.district,
            Address: newOrderData.fullAddress,
            ProductId: newOrderData.productId,
            Product: newOrderData.productName,
            UnitPrice: newOrderData.unitPrice,
            Size: newOrderData.size,
            Color: newOrderData.color,
            Quantity: newOrderData.quantity,
            DeliveryType: newOrderData.deliveryTypeLabel,
            Subtotal: newOrderData.subtotal,
            DeliveryCharge: newOrderData.deliveryCharge,
            GrandTotal: newOrderData.grandTotal,
            PaymentMethod: newOrderData.paymentMethod,
            SenderMobile: newOrderData.senderMobile,
            TransactionId: newOrderData.transactionId,
            OnlinePaid: newOrderData.onlinePaid,
            CODAmount: newOrderData.codAmount,
            PaymentStatus: newOrderData.paymentStatus,
            OrderStatus: newOrderData.orderStatus,
          }),
        });
      } catch {
        // Non-blocking fallback so WhatsApp ordering always works seamlessly
      }
    }

    setSubmittedOrder(newOrderData);
    setIsSubmitting(false);
  };

  const handleAdminStatusChange = (
    newPaymentStatus: PaymentStatusType,
    newOrderStatus: OrderStatusType
  ) => {
    if (!submittedOrder) return;
    setSubmittedOrder({
      ...submittedOrder,
      paymentStatus: newPaymentStatus,
      orderStatus: newOrderStatus,
    });
  };

  return (
    <section id="order-form-section" className="py-8 sm:py-12 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8 lg:p-10">
          {/* Section Header */}
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-semibold text-[#DC2626] mb-1">
              সহজ অর্ডার ও ডেলিভারি কনফার্মেশন
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              অর্ডার কনফার্ম করতে নিচের ফর্মটি পূরণ করুন
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              শুধুমাত্র ডেলিভারি চার্জ অগ্রিম Send Money করে অর্ডার কনফার্ম করুন।{' '}
              <strong className="text-slate-900">
                পণ্যের মূল্য ডেলিভারির সময় Cash on Delivery হিসেবে পরিশোধ করতে হবে।
              </strong>
            </p>
          </div>

          {submittedOrder ? (
            /* ============================================================
               ORDER CONFIRMATION & PAYMENT VERIFICATION STATUS VIEW
               ============================================================ */
            <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-start gap-3.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                      আপনার অর্ডার সফলভাবে জমা হয়েছে!
                    </h3>
                    <p className="mt-1 text-sm sm:text-base font-medium text-slate-700">
                      ডেলিভারি চার্জের পেমেন্টের তথ্য পাওয়া গেছে।
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500">
                      আমাদের প্রতিনিধি আপনার {submittedOrder.paymentMethod}{' '}
                      Transaction ID যাচাই করে দ্রুত অর্ডারটি কনফার্ম করবেন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSubmittedOrder(null)}
                  className="self-start sm:self-auto text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer shrink-0"
                >
                  নতুন অর্ডার / তথ্য সংশোধন
                </button>
              </div>

              {/* Payment & Order Verification Status Bar */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Payment Status (পেমেন্ট স্ট্যাটাস)
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    {submittedOrder.paymentStatus ===
                      'PAYMENT VERIFICATION PENDING' && (
                      <>
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-amber-700">
                          PAYMENT VERIFICATION PENDING
                        </span>
                      </>
                    )}
                    {submittedOrder.paymentStatus === 'PAID' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                          PAID
                        </span>
                      </>
                    )}
                    {submittedOrder.paymentStatus === 'REJECTED' && (
                      <>
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-red-700">
                          REJECTED
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {submittedOrder.paymentStatus ===
                      'PAYMENT VERIFICATION PENDING' &&
                      'অ্যাডমিন আপনার পাঠানো ডেলিভারি চার্জ যাচাই করছেন।'}
                    {submittedOrder.paymentStatus === 'PAID' &&
                      'ডেলিভারি চার্জ পেমেন্ট যাচাই সম্পন্ন হয়েছে।'}
                    {submittedOrder.paymentStatus === 'REJECTED' &&
                      'পেমেন্ট তথ্য মেলেনি। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block">
                    Order Status (অর্ডার স্ট্যাটাস)
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    {submittedOrder.orderStatus ===
                      'PENDING PAYMENT VERIFICATION' && (
                      <>
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-amber-700">
                          PENDING PAYMENT VERIFICATION
                        </span>
                      </>
                    )}
                    {submittedOrder.orderStatus === 'CONFIRMED' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                          CONFIRMED
                        </span>
                      </>
                    )}
                    {submittedOrder.orderStatus === 'PAYMENT REJECTED' && (
                      <>
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="text-sm sm:text-base font-extrabold text-red-700">
                          PAYMENT REJECTED
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {submittedOrder.orderStatus ===
                      'PENDING PAYMENT VERIFICATION' &&
                      'পেমেন্ট ভেরিফিকেশনের পর অর্ডার CONFIRMED হবে।'}
                    {submittedOrder.orderStatus === 'CONFIRMED' &&
                      'আপনার অর্ডারটি কনফার্ম হয়েছে এবং ডেলিভারির জন্য প্রস্তুত হচ্ছে।'}
                    {submittedOrder.orderStatus === 'PAYMENT REJECTED' &&
                      'সঠিক Transaction ID দিয়ে পুনরায় যোগাযোগ করুন।'}
                  </p>
                </div>
              </div>

              {/* Complete Order Details Grid */}
              <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
                <h4 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-200">
                  অর্ডার ও পেমেন্ট বিবরণী
                </h4>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2.5 text-slate-700">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Order ID:</span>
                      <strong className="text-slate-900 font-mono">
                        {submittedOrder.orderId}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Customer Name:</span>
                      <strong className="text-slate-900">
                        {submittedOrder.customerName}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Phone:</span>
                      <strong className="text-slate-900 tabular-nums">
                        {submittedOrder.mobileNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">জেলা ও ঠিকানা:</span>
                      <strong className="text-slate-900 text-right">
                        {submittedOrder.district} — {submittedOrder.fullAddress}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Product:</span>
                      <strong className="text-slate-900 text-right">
                        {submittedOrder.productName} ({submittedOrder.productId})
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        Size, Color & Quantity:
                      </span>
                      <strong className="text-slate-900 tabular-nums">
                        Size {submittedOrder.size}
                        {submittedOrder.color
                          ? ` · ${submittedOrder.color}`
                          : ''}{' '}
                        × {submittedOrder.quantity}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-slate-700 tabular-nums border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Delivery Location:</span>
                      <strong className="text-slate-900">
                        {submittedOrder.deliveryTypeLabel}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Delivery Charge:</span>
                      <strong className="text-slate-900">
                        {STORE_CONFIG.currencySymbol}
                        {submittedOrder.deliveryCharge}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Payment Method:</span>
                      <strong className="text-slate-900">
                        {submittedOrder.paymentMethod} Personal Send Money
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Sender Mobile:</span>
                      <strong className="text-slate-900">
                        {submittedOrder.senderMobile}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Transaction ID:</span>
                      <strong className="text-slate-900 font-mono">
                        {submittedOrder.transactionId}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2 pt-1 border-t border-slate-200">
                      <span className="text-slate-600 font-semibold">
                        Online Paid (ডেলিভারি চার্জ):
                      </span>
                      <strong className="text-emerald-700">
                        {STORE_CONFIG.currencySymbol}
                        {submittedOrder.onlinePaid}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-900 font-bold">
                        COD Amount (ডেলিভারির সময় দেয়):
                      </span>
                      <strong className="text-lg font-extrabold text-[#DC2626]">
                        {STORE_CONFIG.currencySymbol}
                        {submittedOrder.codAmount}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Order Notification & Direct Call */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <a
                  href={buildWhatsAppUrl(submittedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-4 px-6 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-sm transition-colors whitespace-nowrap"
                >
                  <Send className="w-5 h-5 shrink-0" />
                  <span>WhatsApp-এ অর্ডার পাঠান</span>
                </a>

                <a
                  href={`tel:${STORE_PHONE}`}
                  className="py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <PhoneCall className="w-5 h-5 shrink-0" />
                  <span className="tabular-nums">কল করুন: {STORE_PHONE}</span>
                </a>
              </div>

              {/* Security Note: Payment Verification is Strictly Performed in /admin */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  অ্যাডমিন প্যানেল থেকে আপনার পেমেন্ট যাচাই করার পর অর্ডার CONFIRMED হবে।
                </span>
              </div>
            </div>
          ) : (
            /* ============================================================
               TWO-COLUMN CHECKOUT FORM & LIVE ORDER SUMMARY
               ============================================================ */
            <form
              onSubmit={handleSubmit}
              noValidate
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start"
            >
              {/* Left Column: Customer Info, Delivery Location & Payment Flow (7 cols) */}
              <div className="lg:col-span-7 space-y-7">
                {/* STEP 1: Product, Color, Size & Quantity */}
                <div className="pb-6 border-b border-slate-200 space-y-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    ১. প্রোডাক্ট, সাইজ ও পরিমাণ যাচাই করুন
                  </h3>

                  {/* Product Switcher inside Form if multiple active products exist */}
                  {activeProducts.length > 1 && (
                    <div>
                      <label
                        htmlFor="selectedProductSelect"
                        className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                      >
                        নির্বাচিত প্রোডাক্ট (Product){' '}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        id="selectedProductSelect"
                        value={selectedProduct.id}
                        onChange={(e) => {
                          const found = activeProducts.find(
                            (p) => p.id === e.target.value
                          );
                          if (found) onSelectProduct(found);
                        }}
                        className="w-full h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-semibold text-slate-900 focus:border-slate-900 focus:outline-none cursor-pointer"
                      >
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {STORE_CONFIG.currencySymbol}
                            {p.salePrice} ({p.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Color Selection inside Form */}
                  {selectedProduct.colors &&
                    selectedProduct.colors.length > 0 && (
                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                          নির্বাচিত কালার (Color){' '}
                          <span className="text-[#DC2626]">*</span>{' '}
                          <span className="text-[#DC2626] font-extrabold ml-1">
                            ({selectedColor})
                          </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.colors.map((color) => {
                            const active = selectedColor === color;
                            const normImgs =
                              normalizeProductImages(selectedProduct);
                            const variantIdx = resolveColorVariantImageIndex(
                              selectedProduct,
                              normImgs,
                              color
                            );
                            const variantImgUrl =
                              normImgs[variantIdx]?.url ||
                              normImgs[0]?.url ||
                              '';
                            const swatchHex = getColorSwatchHex(color);

                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => onSelectColor(color)}
                                className={`px-3.5 h-11 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer ${
                                  active
                                    ? 'bg-[#0F172A] text-white border-2 border-[#DC2626] ring-2 ring-[#DC2626]/20'
                                    : 'bg-slate-50 text-slate-800 border border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {variantImgUrl ? (
                                  <img
                                    src={variantImgUrl}
                                    alt={color}
                                    className="w-6 h-6 rounded-md object-cover border border-white/30 shrink-0"
                                  />
                                ) : (
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Size Selection inside Form */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                        নির্বাচিত সাইজ (Size){' '}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedProduct.sizes.map((size) => {
                          const active = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => onSelectSize(size)}
                              className={`h-11 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#0F172A] text-white border-2 border-[#0F172A]'
                                  : 'bg-slate-50 text-slate-800 border border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quantity Stepper inside Form */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                        পরিমাণ (Quantity){' '}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <div className="flex items-center h-11 rounded-xl border border-slate-300 bg-slate-50 p-1 w-full max-w-[180px]">
                        <button
                          type="button"
                          onClick={() =>
                            quantity > STORE_CONFIG.minQuantity &&
                            onChangeQuantity(quantity - 1)
                          }
                          disabled={quantity <= STORE_CONFIG.minQuantity}
                          aria-label="পরিমাণ কমান"
                          className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="flex-1 text-center font-bold text-base text-slate-900 tabular-nums">
                          {toBanglaNumber(quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const maxStock =
                              selectedProduct.stockQuantity !== undefined
                                ? Math.min(
                                    STORE_CONFIG.maxQuantity,
                                    selectedProduct.stockQuantity
                                  )
                                : STORE_CONFIG.maxQuantity;
                            if (quantity < maxStock) {
                              onChangeQuantity(quantity + 1);
                            }
                          }}
                          disabled={
                            quantity >=
                            (selectedProduct.stockQuantity !== undefined
                              ? Math.min(
                                  STORE_CONFIG.maxQuantity,
                                  selectedProduct.stockQuantity
                                )
                              : STORE_CONFIG.maxQuantity)
                          }
                          aria-label="পরিমাণ বাড়ান"
                          className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Customer Information */}
                <div className="pb-6 border-b border-slate-200 space-y-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    ২. আপনার নাম ও ডেলিভারি ঠিকানা দিন
                  </h3>

                  <div>
                    <label
                      htmlFor="customerName"
                      className="block text-sm font-semibold text-slate-800 mb-1.5"
                    >
                      আপনার নাম (Customer Name){' '}
                      <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="customerName"
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.customerName) {
                          setErrors((prev) => ({
                            ...prev,
                            customerName: undefined,
                          }));
                        }
                      }}
                      placeholder="আপনার পূর্ণ নাম লিখুন (যেমন: মো: রাহিম উদ্দিন)"
                      className={`w-full h-12 px-4 rounded-xl border text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                        errors.customerName
                          ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                          : 'border-slate-300 bg-white focus:border-slate-900'
                      }`}
                    />
                    {errors.customerName && (
                      <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.customerName}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="mobileNumber"
                        className="block text-sm font-semibold text-slate-800 mb-1.5"
                      >
                        মোবাইল নাম্বার (Mobile Number){' '}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="mobileNumber"
                        type="tel"
                        inputMode="tel"
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value);
                          if (errors.mobileNumber) {
                            setErrors((prev) => ({
                              ...prev,
                              mobileNumber: undefined,
                            }));
                          }
                        }}
                        placeholder="017XXXXXXXX"
                        className={`w-full h-12 px-4 rounded-xl border text-sm sm:text-base text-slate-900 placeholder:text-slate-400 tabular-nums focus:outline-none transition-colors ${
                          errors.mobileNumber
                            ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                            : 'border-slate-300 bg-white focus:border-slate-900'
                        }`}
                      />
                      {errors.mobileNumber && (
                        <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.mobileNumber}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="district"
                        className="block text-sm font-semibold text-slate-800 mb-1.5"
                      >
                        জেলা নির্বাচন করুন (District){' '}
                        <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        id="district"
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className={`w-full h-12 px-3.5 rounded-xl border text-sm sm:text-base text-slate-900 bg-white focus:outline-none transition-colors cursor-pointer ${
                          errors.district
                            ? 'border-red-500 bg-red-50/40'
                            : 'border-slate-300 focus:border-slate-900'
                        }`}
                      >
                        {BANGLADESH_DISTRICTS_BY_DIVISION.map((group) => (
                          <optgroup key={group.division} label={group.division}>
                            {group.districts.map((distName) => (
                              <option key={distName} value={distName}>
                                {distName}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {errors.district && (
                        <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.district}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="fullAddress"
                      className="block text-sm font-semibold text-slate-800 mb-1.5"
                    >
                      সম্পূর্ণ ঠিকানা (Full Address){' '}
                      <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      id="fullAddress"
                      rows={3}
                      value={fullAddress}
                      onChange={(e) => {
                        setFullAddress(e.target.value);
                        if (errors.fullAddress) {
                          setErrors((prev) => ({
                            ...prev,
                            fullAddress: undefined,
                          }));
                        }
                      }}
                      placeholder="বাসা/হোল্ডিং নং, রোড নং, এলাকা, থানা/উপজেলা পরিষ্কারভাবে লিখুন..."
                      className={`w-full p-3.5 rounded-xl border text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors ${
                        errors.fullAddress
                          ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                          : 'border-slate-300 bg-white focus:border-slate-900'
                      }`}
                    />
                    {errors.fullAddress && (
                      <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.fullAddress}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="orderNote"
                      className="block text-xs sm:text-sm font-medium text-slate-600 mb-1.5"
                    >
                      অর্ডার নোট (ঐচ্ছিক / Optional)
                    </label>
                    <input
                      id="orderNote"
                      type="text"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="ডেলিভারি সংক্রান্ত কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* STEP 3: Mandatory Delivery Location Selection */}
                <div className="pb-6 border-b border-slate-200 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      ৩. ডেলিভারি লোকেশন নির্বাচন করুন{' '}
                      <span className="text-[#DC2626]">*</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      পেমেন্ট করার আগে আপনার ডেলিভারি এলাকা নির্বাচন করুন:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label
                      onClick={() =>
                        handleSelectDeliveryLocation('inside_dhaka')
                      }
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        deliveryLocation === 'inside_dhaka'
                          ? 'border-[#0F172A] bg-slate-900 text-white shadow-sm'
                          : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryLocation"
                          checked={deliveryLocation === 'inside_dhaka'}
                          onChange={() =>
                            handleSelectDeliveryLocation('inside_dhaka')
                          }
                          className="w-4 h-4 accent-[#DC2626] shrink-0"
                        />
                        <div>
                          <div className="text-sm sm:text-base font-bold">
                            ঢাকার ভিতরে — Delivery Charge{' '}
                            {STORE_CONFIG.currencySymbol}
                            {insideDhakaFee}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              deliveryLocation === 'inside_dhaka'
                                ? 'text-slate-300'
                                : 'text-slate-500'
                            }`}
                          >
                            ডেলিভারি চার্জ: {STORE_CONFIG.currencySymbol}
                            {toBanglaNumber(insideDhakaFee)} (
                            {STORE_CONFIG.deliveryTimeDhaka})
                          </div>
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() =>
                        handleSelectDeliveryLocation('outside_dhaka')
                      }
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                        deliveryLocation === 'outside_dhaka'
                          ? 'border-[#0F172A] bg-slate-900 text-white shadow-sm'
                          : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryLocation"
                          checked={deliveryLocation === 'outside_dhaka'}
                          onChange={() =>
                            handleSelectDeliveryLocation('outside_dhaka')
                          }
                          className="w-4 h-4 accent-[#DC2626] shrink-0"
                        />
                        <div>
                          <div className="text-sm sm:text-base font-bold">
                            ঢাকার বাইরে — Delivery Charge{' '}
                            {STORE_CONFIG.currencySymbol}
                            {outsideDhakaFee}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              deliveryLocation === 'outside_dhaka'
                                ? 'text-slate-300'
                                : 'text-slate-500'
                            }`}
                          >
                            ডেলিভারি চার্জ: {STORE_CONFIG.currencySymbol}
                            {toBanglaNumber(outsideDhakaFee)} (
                            {STORE_CONFIG.deliveryTimeOutside})
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {errors.deliveryLocation && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.deliveryLocation}</span>
                    </p>
                  )}
                </div>

                {/* STEP 4: Payment Flow */}
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      ৪. পেমেন্ট মাধ্যম নির্বাচন করুন (শুধু ডেলিভারি চার্জ Send Money করুন){' '}
                      <span className="text-[#DC2626]">*</span>
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm font-medium text-slate-700">
                      পণ্যের মূল্য ডেলিভারির সময় Cash on Delivery হিসেবে পরিশোধ করতে হবে।
                    </p>
                  </div>

                  {!deliveryLocation ? (
                    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 text-xs sm:text-sm text-amber-900 font-medium">
                      পেমেন্ট অপশন দেখতে অনুগ্রহ করে উপরে ৩ নং ধাপে আগে{' '}
                      <strong>“ঢাকার ভিতরে”</strong> অথবা{' '}
                      <strong>“ঢাকার বাইরে”</strong> ডেলিভারি লোকেশন নির্বাচন করুন।
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-500">
                            Delivery Location (ডেলিভারি লোকেশন):
                          </div>
                          <div className="text-sm sm:text-base font-bold text-slate-900">
                            {deliveryTypeLabel}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          <div className="text-xs text-slate-500">
                            Delivery Charge (ডেলিভারি চার্জ):
                          </div>
                          <div className="text-lg sm:text-xl font-extrabold text-[#DC2626] tabular-nums">
                            {STORE_CONFIG.currencySymbol}
                            {deliveryCharge} (৳{toBanglaNumber(deliveryCharge)})
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs sm:text-sm text-slate-800 flex items-center justify-between gap-2">
                        <span className="font-bold text-[#DC2626]">
                          শুধু ডেলিভারি চার্জ Send Money করুন — {STORE_CONFIG.currencySymbol}
                          {deliveryCharge}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          পণ্যের মূল্য Cash on Delivery ({STORE_CONFIG.currencySymbol}
                          {subtotal})
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">
                          পেমেন্ট মাধ্যম নির্বাচন করুন{' '}
                          <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('bKash');
                              if (errors.paymentMethod) {
                                setErrors((prev) => ({
                                  ...prev,
                                  paymentMethod: undefined,
                                }));
                              }
                            }}
                            className={`h-14 px-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              paymentMethod === 'bKash'
                                ? 'border-[#E2136E] bg-[#E2136E] text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <span>bKash</span>
                            <span
                              className={`text-xs font-medium ${
                                paymentMethod === 'bKash'
                                  ? 'text-white/90'
                                  : 'text-slate-500'
                              }`}
                            >
                              (Personal)
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('Nagad');
                              if (errors.paymentMethod) {
                                setErrors((prev) => ({
                                  ...prev,
                                  paymentMethod: undefined,
                                }));
                              }
                            }}
                            className={`h-14 px-4 rounded-xl border-2 font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              paymentMethod === 'Nagad'
                                ? 'border-[#EC1C24] bg-[#EC1C24] text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <span>Nagad</span>
                            <span
                              className={`text-xs font-medium ${
                                paymentMethod === 'Nagad'
                                  ? 'text-white/90'
                                  : 'text-slate-500'
                              }`}
                            >
                              (Personal)
                            </span>
                          </button>
                        </div>
                        {errors.paymentMethod && (
                          <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.paymentMethod}</span>
                          </p>
                        )}
                      </div>

                      {paymentMethod && (
                        <div className="p-4 sm:p-5 rounded-2xl border border-slate-300 bg-slate-50 space-y-5">
                          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-slate-500 block">
                                  {paymentMethod} Personal Send Money
                                </span>
                                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-wide font-mono">
                                  {activePaymentNumber}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyNumber(activePaymentNumber)
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                              >
                                {copiedNumber === activePaymentNumber ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>COPIED!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>COPY NUMBER</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-[#DC2626] pt-2 border-t border-slate-100">
                              উপরের {paymentMethod} নম্বরে শুধু{' '}
                              {STORE_CONFIG.currencySymbol}
                              {deliveryCharge} Send Money করুন।
                            </p>
                            <p className="text-xs text-slate-600">
                              পণ্যের মূল্য ডেলিভারির সময় Cash on Delivery হিসেবে পরিশোধ করতে হবে।
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Payment Method (পেমেন্ট মাধ্যম)
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={`${paymentMethod} Personal Send Money (${activePaymentNumber})`}
                                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor="senderMobile"
                                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                                >
                                  যে নম্বর থেকে টাকা পাঠিয়েছেন{' '}
                                  <span className="text-[#DC2626]">*</span>
                                </label>
                                <input
                                  id="senderMobile"
                                  type="tel"
                                  inputMode="tel"
                                  value={senderMobile}
                                  onChange={(e) => {
                                    setSenderMobile(e.target.value);
                                    if (errors.senderMobile) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        senderMobile: undefined,
                                      }));
                                    }
                                  }}
                                  placeholder="01XXXXXXXXX"
                                  className={`w-full h-12 px-4 rounded-xl border text-sm sm:text-base text-slate-900 placeholder:text-slate-400 tabular-nums focus:outline-none transition-colors ${
                                    errors.senderMobile
                                      ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                                      : 'border-slate-300 bg-white focus:border-slate-900'
                                  }`}
                                />
                                {errors.senderMobile && (
                                  <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{errors.senderMobile}</span>
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="transactionId"
                                  className="block text-sm font-semibold text-slate-800 mb-1.5"
                                >
                                  Transaction ID{' '}
                                  <span className="text-[#DC2626]">*</span>
                                </label>
                                <input
                                  id="transactionId"
                                  type="text"
                                  value={transactionId}
                                  onChange={(e) => {
                                    setTransactionId(e.target.value);
                                    if (errors.transactionId) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        transactionId: undefined,
                                      }));
                                    }
                                  }}
                                  placeholder="যেমন: BJM84K92L"
                                  className={`w-full h-12 px-4 rounded-xl border text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-mono uppercase focus:outline-none transition-colors ${
                                    errors.transactionId
                                      ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                                      : 'border-slate-300 bg-white focus:border-slate-900'
                                  }`}
                                />
                                {errors.transactionId && (
                                  <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{errors.transactionId}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Order Summary Card (5 cols) */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 bg-slate-50 rounded-2xl border border-slate-200 p-5 sm:p-6">
                <h3 className="text-lg font-bold text-slate-900 pb-3.5 border-b border-slate-200">
                  অর্ডার সামারি (Order Summary)
                </h3>

                <div className="mt-4 space-y-3 text-sm tabular-nums">
                  {(() => {
                    const normImgs = normalizeProductImages(selectedProduct);
                    const variantIdx = resolveColorVariantImageIndex(
                      selectedProduct,
                      normImgs,
                      selectedColor
                    );
                    const summaryImgUrl =
                      normImgs[variantIdx]?.url || normImgs[0]?.url || '';
                    return (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {summaryImgUrl && (
                            <img
                              src={summaryImgUrl}
                              alt={`${selectedProduct.name} ${selectedColor}`}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                            />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs text-slate-500 block">
                              Product (পণ্য):
                            </span>
                            <strong className="text-slate-900 block truncate">
                              {selectedProduct.name}
                            </strong>
                            <span className="text-xs text-slate-500 font-mono">
                              ID: {selectedProduct.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedColor && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Color (কালার):</span>
                      <strong className="text-slate-900">
                        {selectedColor}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Size (সাইজ):</span>
                    <strong className="text-slate-900">{selectedSize}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Quantity (পরিমাণ):</span>
                    <strong className="text-slate-900">
                      {quantity} ({toBanglaNumber(quantity)}টি)
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-600">
                      Product Total (পণ্যের মূল্য):
                    </span>
                    <strong className="text-slate-900">
                      {STORE_CONFIG.currencySymbol}
                      {subtotal}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      Delivery Location (ডেলিভারি লোকেশন):
                    </span>
                    <strong
                      className={
                        deliveryLocation
                          ? 'text-slate-900'
                          : 'text-amber-700 font-semibold'
                      }
                    >
                      {deliveryTypeLabel}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      Delivery Charge (ডেলিভারি চার্জ):
                    </span>
                    <strong className="text-slate-900">
                      {deliveryLocation
                        ? `${STORE_CONFIG.currencySymbol}${deliveryCharge}`
                        : 'লোকেশন সিলেক্ট করুন'}
                    </strong>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-300 flex items-baseline justify-between">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      Total Order Value (মোট মূল্য):
                    </span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {STORE_CONFIG.currencySymbol}
                      {grandTotal}
                    </span>
                  </div>

                  <div className="mt-3 p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-700">
                        Online Paid (অগ্রিম ডেলিভারি চার্জ):
                      </span>
                      <strong className="text-emerald-700 font-extrabold">
                        {deliveryLocation
                          ? `${STORE_CONFIG.currencySymbol}${onlinePaid}`
                          : `${STORE_CONFIG.currencySymbol}${insideDhakaFee} / ${STORE_CONFIG.currencySymbol}${outsideDhakaFee}`}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-900">
                        Cash on Delivery (পণ্যের মূল্য):
                      </span>
                      <strong className="text-base sm:text-lg font-extrabold text-[#DC2626]">
                        {STORE_CONFIG.currencySymbol}
                        {codAmount}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-3.5 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>পণ্যের মূল্য Cash on Delivery</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    পণ্যের মূল্য ডেলিভারির সময় Cash on Delivery হিসেবে পরিশোধ করতে হবে। শুধুমাত্র ডেলিভারি চার্জ (
                    {deliveryLocation
                      ? `${STORE_CONFIG.currencySymbol}${deliveryCharge}`
                      : `৳${insideDhakaFee}/৳${outsideDhakaFee}`}
                    ) এখন bKash বা Nagad-এ Send Money করুন।
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct.stock}
                  className="mt-5 w-full py-4 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-bold text-base sm:text-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  <span>
                    {selectedProduct.stock
                      ? `অর্ডার কনফার্ম করুন — ${STORE_CONFIG.currencySymbol}${grandTotal}`
                      : 'স্টক আউট (Out of Stock)'}
                  </span>
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>অ্যাডমিন পেমেন্ট ভেরিফিকেশনের পর অর্ডার কনফার্ম হবে</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
