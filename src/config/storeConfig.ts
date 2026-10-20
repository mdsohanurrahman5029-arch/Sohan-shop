/**
 * ============================================================================
 * SOHAN SHOP — CENTRALIZED PRODUCT & STORE CONFIGURATION
 * ============================================================================
 *
 * এখান থেকেই Product Name, Price, Image, Size ইত্যাদি পরিবর্তন করতে হবে।
 *
 * নির্দেশনা (Beginner-Friendly Guide):
 * ১. নতুন প্রোডাক্ট যোগ করতে নিচের PRODUCTS তালিকায় { ... } ব্লকটি কপি করে পেস্ট করুন।
 * ২. কোনো প্রোডাক্ট ওয়েবসাইটে দেখাতে না চাইলে তার `active: false` করে দিন।
 * ৩. প্রোডাক্টের স্টক শেষ হয়ে গেলে `stock: false` করে দিন।
 * ৪. `images` এর ভেতরে সরাসরি ছবির লিংক ("https://..." বা "/src/assets/...") দিন।
 */

import tshirtFrontAsset from '../assets/images/tshirt_front_showcase_1791298823867.jpg';
import tshirtModelAsset from '../assets/images/tshirt_model_editorial_1791298839440.jpg';
import tshirtFabricAsset from '../assets/images/tshirt_fabric_detail_1791298852461.jpg';
import tshirtFoldedAsset from '../assets/images/tshirt_folded_pack_1791298864249.jpg';

const LEGACY_ASSET_PATH_MAP: Record<string, string> = {
  '/src/assets/images/tshirt_front_showcase_1791298823867.jpg': tshirtFrontAsset,
  'src/assets/images/tshirt_front_showcase_1791298823867.jpg': tshirtFrontAsset,
  '/src/assets/images/tshirt_model_editorial_1791298839440.jpg': tshirtModelAsset,
  'src/assets/images/tshirt_model_editorial_1791298839440.jpg': tshirtModelAsset,
  '/src/assets/images/tshirt_fabric_detail_1791298852461.jpg': tshirtFabricAsset,
  'src/assets/images/tshirt_fabric_detail_1791298852461.jpg': tshirtFabricAsset,
  '/src/assets/images/tshirt_folded_pack_1791298864249.jpg': tshirtFoldedAsset,
  'src/assets/images/tshirt_folded_pack_1791298864249.jpg': tshirtFoldedAsset,
};

/**
 * Resolves any stored image entry in strict priority:
 * 1. Object with `secure_url` -> `url` -> `secureUrl` -> `imageUrl` -> `mainImage` -> `thumbnail`
 * 2. String (if HTTPS Cloudinary URL, used directly; if http://res.cloudinary.com, upgraded to https://)
 * 3. Local Vite asset `/src/assets/images/...` or `src/assets/images/...` mapped to bundled asset URL
 */
export function resolveImageUrl(raw: unknown): string {
  if (!raw) return '';
  let urlStr = '';
  if (typeof raw === 'string') {
    urlStr = raw.trim();
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const candidate =
      obj.secure_url ||
      obj.url ||
      obj.secureUrl ||
      obj.imageUrl ||
      obj.mainImage ||
      obj.thumbnail ||
      obj.src ||
      '';
    if (typeof candidate === 'string') {
      urlStr = candidate.trim();
    }
  }
  if (!urlStr) return '';

  // Upgrade http://res.cloudinary.com to https://res.cloudinary.com
  if (urlStr.startsWith('http://res.cloudinary.com/')) {
    urlStr = urlStr.replace('http://', 'https://');
  }

  // Map legacy `/src/assets/images/...` or `src/assets/images/...` strings to bundled asset URLs
  if (LEGACY_ASSET_PATH_MAP[urlStr]) {
    return LEGACY_ASSET_PATH_MAP[urlStr];
  }

  // Never send an unmapped raw `/src/assets/...` or `src/assets/...` string directly to browser
  if (
    urlStr.startsWith('/src/assets/') ||
    urlStr.startsWith('src/assets/')
  ) {
    return tshirtFrontAsset;
  }

  return urlStr;
}

export interface ProductImage {
  url: string;
  alt: string;
  caption: string;
  color?: string;
}

export interface SizeMeasurement {
  size: string;
  chest: string;
  length: string;
  sleeve: string;
}

export interface ProductConfigItem {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  category?: string;
  images: (string | ProductImage)[];
  thumbnail?: string;
  mainImage?: string;
  imageUrl?: string;
  regularPrice: number;
  salePrice: number;
  discountPercentage?: number;
  sizes: string[];
  colors: string[];
  colorImages?: Record<string, string>;
  stock: boolean;
  stockQuantity?: number;
  features: string[];
  deliveryInfo?: {
    insideDhaka?: number;
    outsideDhaka?: number;
    timeDhaka?: string;
    timeOutside?: string;
  };
  active: boolean;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ============================================================================
 * PRODUCT_CONFIG / PRODUCTS
 * এখান থেকেই Product Name, Price, Image, Size ইত্যাদি পরিবর্তন করতে হবে।
 * ============================================================================
 */
export const PRODUCTS: ProductConfigItem[] = [
  {
    id: "product-001",
    name: "Premium Stylish T-Shirt",
    subtitle:
      "১০০% এক্সপোর্ট কোয়ালিটি কম্বড কটন — গরমে পরার জন্য সবচেয়ে আরামদায়ক ও আধুনিক ফিট",
    description:
      "বাংলাদেশের আবহাওয়ার কথা মাথায় রেখে আমরা তৈরি করেছি ১০০% অর্গানিক রিং-স্পান কম্বড কটন ফেব্রিকের এই প্রিমিয়াম টি-শার্ট। এটি যেমন গরমে সারাদিন বাতাস চলাচলে সাহায্য করে, তেমনি এর আধুনিক টেইলরড ফিট আপনাকে দেয় স্মার্ট ও মার্জিত লুক।",
    category: "T-Shirt",

    images: [
      tshirtFrontAsset,
      tshirtModelAsset,
      tshirtFabricAsset,
      tshirtFoldedAsset,
    ],
    thumbnail: tshirtFrontAsset,

    regularPrice: 990,
    salePrice: 750,
    discountPercentage: 24,

    sizes: ["M", "L", "XL", "XXL"],

    colors: ["Black", "Navy Blue", "Maroon"],

    stock: true,
    stockQuantity: 45,

    features: [
      "১০০% অরিজিনাল রিং-স্পান কম্বড কটন ফেব্রিক",
      "১৮০–১৯০ GSM পারফেক্ট থিকনেস — অতিরিক্ত মোটা বা পাতলা নয়",
      "রঙ ও সাইজের ১০০% গ্যারান্টি — ধোয়ার পর রঙ উঠবে না বা ক্ষেপে যাবে না",
      "পণ্য হাতে পেয়ে দেখে টাকা পরিশোধ করার সুবিধা (Cash on Delivery)",
    ],

    deliveryInfo: {
      insideDhaka: 60,
      outsideDhaka: 120,
      timeDhaka: "২৪–৪৮ ঘণ্টা (ঢাকার ভিতরে)",
      timeOutside: "২–৪ কার্যদিবস (ঢাকার বাইরে)",
    },

    active: true,
    position: 1,
  },
  {
    id: "product-002",
    name: "Luxury Edition Designer T-Shirt",
    subtitle:
      "প্রিমিয়াম হেভিওয়েট কম্বড কটন ও ডাবল রিবড কলার — প্রতিদিনের ক্যাজুয়াল ও স্মার্ট আউটফিটের জন্য",
    description:
      "যারা একটু প্রিমিয়াম ও স্ট্রাকচার্ড ফিট পছন্দ করেন তাদের জন্য আমাদের এই Luxury Edition টি-শার্ট। উঁচু মানের এনজাইম ও সিলিকন ওয়াশ ফেব্রিক যা বারবার ধোয়ার পরেও নতুনের মতো উজ্জ্বল থাকে।",
    category: "T-Shirt",

    images: [
      tshirtModelAsset,
      tshirtFrontAsset,
      tshirtFoldedAsset,
      tshirtFabricAsset,
    ],
    thumbnail: tshirtModelAsset,

    regularPrice: 1150,
    salePrice: 850,
    discountPercentage: 26,

    sizes: ["M", "L", "XL", "XXL"],

    colors: ["Navy Blue", "Charcoal Black"],

    stock: true,
    stockQuantity: 30,

    features: [
      "প্রিমিয়াম ১৯০+ GSM এক্সপোর্ট কোয়ালিটি কম্বড কটন",
      "গলায় ও হাতায় নিখুঁত ডাবল স্টিচিং এবং লাইক্রা রিব",
      "গরমে ঘাম শোষণকারী ও শতভাগ বাতাস চলাচল উপযোগী",
      "সারাদেশে দ্রুত হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা",
    ],

    deliveryInfo: {
      insideDhaka: 60,
      outsideDhaka: 120,
      timeDhaka: "২৪–৪৮ ঘণ্টা (ঢাকার ভিতরে)",
      timeOutside: "২–৪ কার্যদিবস (ঢাকার বাইরে)",
    },

    active: true,
    position: 2,
  },
  {
    id: "product-003",
    name: "Combo Pack (3 Pcs Premium T-Shirt)",
    subtitle:
      "৩টি জনপ্রিয় কালারের প্রিমিয়াম টি-শার্ট কম্বো প্যাক — বিশেষ সাশ্রয়ী মূল্যে",
    description:
      "ব্ল্যাক, নেভি ব্লু এবং মেরুন — এই ৩টি ক্ল্যাসিক কালারের টি-শার্টের এক্সক্লুসিভ কম্বো প্যাক। প্রতিদিনের ব্যবহারের জন্য সবচেয়ে সাশ্রয়ী এবং সেরা মানের কম্বো।",
    category: "Combo Pack",

    images: [
      tshirtFoldedAsset,
      tshirtFrontAsset,
      tshirtModelAsset,
      tshirtFabricAsset,
    ],
    thumbnail: tshirtFoldedAsset,

    regularPrice: 2800,
    salePrice: 1990,
    discountPercentage: 29,

    sizes: ["M", "L", "XL", "XXL"],

    colors: ["Combo (Black + Navy + Maroon)"],

    stock: true,
    stockQuantity: 20,

    features: [
      "একসাথে ৩টি প্রিমিয়াম কম্বড কটন টি-শার্ট (Black, Navy, Maroon)",
      "আলাদা কেনার চেয়ে কম্বো প্যাকে বিশেষ মূল্য ছাড়",
      "১০০% কালার ও সাইজ গ্যারান্টি — এক্সপোর্ট কোয়ালিটি স্টিচিং",
      "পণ্য হাতে পেয়ে চেক করে মূল্য পরিশোধের সুবিধা",
    ],

    deliveryInfo: {
      insideDhaka: 60,
      outsideDhaka: 120,
      timeDhaka: "২৪–৪৮ ঘণ্টা (ঢাকার ভিতরে)",
      timeOutside: "২–৪ কার্যদিবস (ঢাকার বাইরে)",
    },

    active: true,
    position: 3,
  },
  {
    id: "product-004-sample-inactive",
    name: "Winter Hoodie Edition (Sample Inactive Product)",
    description:
      "এই প্রোডাক্টটির active: false দেওয়া আছে, তাই এটি ওয়েবসাইটে কাস্টমারদের কাছে দেখা যাবে না।",
    category: "Winter Collection",
    images: [tshirtFrontAsset],
    thumbnail: tshirtFrontAsset,
    regularPrice: 1500,
    salePrice: 1190,
    sizes: ["M", "L", "XL"],
    colors: ["Black"],
    stock: false,
    stockQuantity: 0,
    features: ["Inactive Demo Product"],
    active: false,
    position: 4,
  },
];

export const PRODUCT_CONFIG = PRODUCTS;

// Helper to get only active products (`active: true`)
export const getActiveProducts = (): ProductConfigItem[] => {
  const activeList = PRODUCTS.filter((p) => p.active === true);
  return activeList.length > 0 ? activeList : [PRODUCTS[0]];
};

// Helper to normalize string or object image items (images[].secure_url, images[].url, images[], thumbnail, mainImage, imageUrl) into ProductImage objects
export const normalizeProductImages = (
  product: ProductConfigItem
): ProductImage[] => {
  const rawCollected: string[] = [];

  if (Array.isArray(product.images)) {
    product.images.forEach((item) => {
      const resolved = resolveImageUrl(item);
      if (resolved && !rawCollected.includes(resolved)) {
        rawCollected.push(resolved);
      }
    });
  }

  // Also check thumbnail, mainImage, and imageUrl in priority order
  const extraCandidates = [
    product.thumbnail,
    product.mainImage,
    product.imageUrl,
  ];
  extraCandidates.forEach((candidate) => {
    const resolved = resolveImageUrl(candidate);
    if (resolved && !rawCollected.includes(resolved)) {
      rawCollected.push(resolved);
    }
  });

  // If the product has valid Cloudinary URLs, always prefer Cloudinary URLs first
  const cloudinaryUrls = rawCollected.filter((u) =>
    u.includes('cloudinary.com')
  );
  const nonCloudinaryUrls = rawCollected.filter(
    (u) => !u.includes('cloudinary.com')
  );
  const prioritizedUrls =
    cloudinaryUrls.length > 0
      ? [...cloudinaryUrls, ...nonCloudinaryUrls]
      : rawCollected;

  return prioritizedUrls.map((url, index) => ({
    url,
    alt: `${product.name} - Image ${index + 1}`,
    caption: `${product.name} — ভিউ ${toBanglaNumber(index + 1)}`,
  }));
};

// Known Cloudinary image public_id -> color mapping for SOHAN SHOP products
const KNOWN_CLOUDINARY_COLOR_PUBLIC_IDS: Record<string, string[]> = {
  green: ['ummbwzf5dy4xc8jjyomy', 'wasmczscvsivaek55f0y'],
  purple: ['rxlqrkmoyy8jbivuuvsl', 'plsrnnm1doqub368vvjn'],
  maroon: ['exuedvirhpi7wp6wpwf7', 'afsoevxykadgz87hbxhr'],
  beige: ['cq1mlekugqmrbupbbhmg', 'kchpxakvhm1udpm3hier'],
  black: ['ohhtimrttmusqcsle35s', 'wsjy1sgrwy9nlegeqez8'],
};

/**
 * Returns a clean visual swatch hex color for common T-shirt color names.
 */
export const getColorSwatchHex = (colorName: string): string => {
  const c = (colorName || '').trim().toLowerCase();
  if (c.includes('green') || c.includes('olive') || c.includes('sage')) {
    return '#3D7159';
  }
  if (c.includes('purple') || c.includes('lavender') || c.includes('violet')) {
    return '#8E85C7';
  }
  if (c.includes('maroon') || c.includes('burgundy') || c.includes('wine')) {
    return '#6F424A';
  }
  if (c.includes('beige') || c.includes('cream') || c.includes('sand') || c.includes('khaki')) {
    return '#D2C1A3';
  }
  if (c.includes('navy') || c.includes('blue')) {
    return '#1E3A8A';
  }
  if (c.includes('black') || c.includes('charcoal')) {
    return '#262729';
  }
  if (c.includes('white')) {
    return '#F8FAFC';
  }
  if (c.includes('red')) {
    return '#DC2626';
  }
  return '#475569';
};

/**
 * Resolves the target gallery image index (and URL) for a selected color on a product.
 * Priority:
 * 1. Explicit `product.colorImages[selectedColor]` (case-insensitive match)
 * 2. Object inside `product.images` with a matching `color` or `variant` property
 * 3. Known Cloudinary public_id or URL substring matching the color name
 * 4. Proportional distribution when image count is a multiple of colors count (or >= colors count)
 * 5. Fallback to index 0 (first/main image) so it never crashes
 */
export const resolveColorVariantImageIndex = (
  product: ProductConfigItem,
  normalizedImages: ProductImage[],
  selectedColor: string
): number => {
  if (!selectedColor || normalizedImages.length === 0) return 0;

  const cleanColor = selectedColor.trim().toLowerCase();

  // 1. Check explicit product.colorImages map
  if (product.colorImages && typeof product.colorImages === 'object') {
    const matchedEntry = Object.entries(product.colorImages).find(
      ([key]) => key.trim().toLowerCase() === cleanColor
    );
    if (matchedEntry && matchedEntry[1]) {
      const targetUrl = resolveImageUrl(matchedEntry[1]);
      const foundIdx = normalizedImages.findIndex((img) => img.url === targetUrl);
      if (foundIdx !== -1) return foundIdx;
    }
  }

  // 2. Check if any raw product.images object has an explicit color/variant tag
  if (Array.isArray(product.images)) {
    for (const rawItem of product.images) {
      if (typeof rawItem === 'object' && rawItem !== null) {
        const obj = rawItem as Record<string, unknown>;
        const itemColor = String(obj.color || obj.variant || '')
          .trim()
          .toLowerCase();
        if (itemColor && itemColor === cleanColor) {
          const resolvedUrl = resolveImageUrl(rawItem);
          const foundIdx = normalizedImages.findIndex(
            (img) => img.url === resolvedUrl
          );
          if (foundIdx !== -1) return foundIdx;
        }
      }
    }
  }

  // 3. Check known Cloudinary public_id mapping (e.g., Green, Purple, Maroon, Beige, Black)
  const knownIds = KNOWN_CLOUDINARY_COLOR_PUBLIC_IDS[cleanColor];
  if (knownIds && knownIds.length > 0) {
    for (const pubId of knownIds) {
      const foundIdx = normalizedImages.findIndex((img) =>
        img.url.toLowerCase().includes(pubId.toLowerCase())
      );
      if (foundIdx !== -1) return foundIdx;
    }
  }

  // 4. Check if any image URL or caption contains the color name directly
  const urlMatchIdx = normalizedImages.findIndex((img) =>
    img.url.toLowerCase().includes(cleanColor)
  );
  if (urlMatchIdx !== -1) return urlMatchIdx;

  // 5. Fallback: map color position proportionally across available images, or default to 0
  const colorIdx = (product.colors || []).findIndex(
    (c) => c.trim().toLowerCase() === cleanColor
  );
  if (colorIdx !== -1 && normalizedImages.length >= (product.colors?.length || 1)) {
    const imgsPerColor = Math.floor(
      normalizedImages.length / Math.max(1, product.colors.length)
    );
    const computedIdx = colorIdx * Math.max(1, imgsPerColor);
    if (computedIdx < normalizedImages.length) {
      return computedIdx;
    }
  }

  return 0;
};

// Helper to compute discount amount & percentage automatically
export const getProductDiscountInfo = (product: ProductConfigItem) => {
  const discountAmount = Math.max(0, product.regularPrice - product.salePrice);
  const discountPercentage =
    product.discountPercentage !== undefined
      ? product.discountPercentage
      : product.regularPrice > 0
      ? Math.round((discountAmount / product.regularPrice) * 100)
      : 0;
  return { discountAmount, discountPercentage };
};

const defaultPrimaryProduct = getActiveProducts()[0];

/**
 * ============================================================================
 * STORE_CONFIG — CENTRAL STORE, DELIVERY & PAYMENT CONFIGURATION
 * ============================================================================
 */
export const STORE_CONFIG = {
  // Brand & Contact Settings
  storeName: "SOHAN SHOP",
  storeNameBangla: "সোহাণ শপ",
  phone: "01605082936",
  whatsapp: "8801605082936",
  supportHours: "সকাল ৯টা – রাত ১১টা (প্রতিদিন)",
  storeAddress: "মিরপুর-১০, ঢাকা-১২১৬, বাংলাদেশ",

  // Default Primary Product Settings (Automatically synced with first active product in PRODUCTS)
  productName: defaultPrimaryProduct.name,
  productSubtitle:
    defaultPrimaryProduct.subtitle || defaultPrimaryProduct.description,
  productCode: defaultPrimaryProduct.id,
  regularPrice: defaultPrimaryProduct.regularPrice,
  salePrice: defaultPrimaryProduct.salePrice,
  currencySymbol: "৳",

  // Sizes & Quantity Limits
  availableSizes: defaultPrimaryProduct.sizes,
  defaultSize: defaultPrimaryProduct.sizes[0] || "M",
  minQuantity: 1,
  maxQuantity: 10,

  // Delivery Charges (BDT)
  deliveryCharges: {
    insideDhaka: 60,
    outsideDhaka: 120,
  },
  dhakaDelivery: 60,
  outsideDhakaDelivery: 120,
  deliveryTimeDhaka: "২৪–৪৮ ঘণ্টা (ঢাকার ভিতরে)",
  deliveryTimeOutside: "২–৪ কার্যদিবস (ঢাকার বাইরে)",

  // Payment Configuration (Advance Delivery Charge via Personal Send Money; Product Price via COD)
  bkashPersonalNumber: "01785827611",
  nagadPersonalNumber: "01605082936",
  productPaymentMethod: "CASH_ON_DELIVERY",
  deliveryChargePaymentMethod: "PERSONAL_SEND_MONEY",

  // Cloudinary Free Image Hosting Configuration (Unsigned Preset ONLY — NEVER put API Secret here)
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "",
    folder: "sohan_shop/products",
  },

  // Campaign Offer Countdown Expiry (ISO 8601 format)
  campaignEndTime: "2026-12-31T23:59:59",

  // Default Product Image Gallery URLs (Automatically normalized from first active product)
  productImages: normalizeProductImages(defaultPrimaryProduct),

  // Size Chart Measurements (in inches)
  sizeChart: [
    { size: "M", chest: "৩৮ ইঞ্চি", length: "২৭ ইঞ্চি", sleeve: "৮.০ ইঞ্চি" },
    { size: "L", chest: "৪০ ইঞ্চি", length: "২৮ ইঞ্চি", sleeve: "৮.৫ ইঞ্চি" },
    { size: "XL", chest: "৪২ ইঞ্চি", length: "২৯ ইঞ্চি", sleeve: "৯.০ ইঞ্চি" },
    { size: "XXL", chest: "৪৪ ইঞ্চি", length: "৩০ ইঞ্চি", sleeve: "৯.৫ ইঞ্চি" },
  ] as SizeMeasurement[],

  // Product Highlights & Specifications
  shortHighlights: defaultPrimaryProduct.features,

  // Google Sheets Apps Script Web App URL (Optional)
  googleSheetsWebAppUrl: "",
};

// Convenience constants matching standard naming
export const PRODUCT_NAME = STORE_CONFIG.productName;
export const REGULAR_PRICE = STORE_CONFIG.regularPrice;
export const SALE_PRICE = STORE_CONFIG.salePrice;
export const DISCOUNT_AMOUNT =
  STORE_CONFIG.regularPrice - STORE_CONFIG.salePrice;
export const DELIVERY_CHARGE = {
  insideDhaka: STORE_CONFIG.deliveryCharges.insideDhaka,
  outsideDhaka: STORE_CONFIG.deliveryCharges.outsideDhaka,
};
export const BKASH_PERSONAL_NUMBER = STORE_CONFIG.bkashPersonalNumber;
export const NAGAD_PERSONAL_NUMBER = STORE_CONFIG.nagadPersonalNumber;
export const PRODUCT_IMAGES = STORE_CONFIG.productImages;
export const AVAILABLE_SIZES = STORE_CONFIG.availableSizes;
export const WHATSAPP_NUMBER = STORE_CONFIG.whatsapp;
export const STORE_PHONE = STORE_CONFIG.phone;
export const CAMPAIGN_END_TIME = STORE_CONFIG.campaignEndTime;
export const GOOGLE_SHEETS_WEB_APP_URL = STORE_CONFIG.googleSheetsWebAppUrl;

/**
 * All 64 Districts of Bangladesh in Bengali (Organized by Division)
 */
export interface DistrictGroup {
  division: string;
  districts: string[];
}

export const BANGLADESH_DISTRICTS_BY_DIVISION: DistrictGroup[] = [
  {
    division: "ঢাকা বিভাগ (Dhaka)",
    districts: [
      "ঢাকা",
      "গাজীপুর",
      "নারায়ণগঞ্জ",
      "নরসিংদী",
      "মানিকগঞ্জ",
      "মুন্সীগঞ্জ",
      "টাঙ্গাইল",
      "কিশোরগঞ্জ",
      "ফরিদপুর",
      "গোপালগঞ্জ",
      "মাদারীপুর",
      "রাজবাড়ী",
      "শরীয়তপুর",
    ],
  },
  {
    division: "চট্টগ্রাম বিভাগ (Chattogram)",
    districts: [
      "চট্টগ্রাম",
      "কক্সবাজার",
      "কুমিল্লা",
      "ব্রাহ্মণবাড়িয়া",
      "চাঁদপুর",
      "নোয়াখালী",
      "ফেনী",
      "লক্ষ্মীপুর",
      "রাঙ্গামাটি",
      "বান্দরবান",
      "খাগড়াছড়ি",
    ],
  },
  {
    division: "রাজশাহী বিভাগ (Rajshahi)",
    districts: [
      "রাজশাহী",
      "বগুড়া",
      "পাবনা",
      "সিরাজগঞ্জ",
      "নাটোর",
      "নওগাঁ",
      "চাঁপাইনবাবগঞ্জ",
      "জয়পুরহাট",
    ],
  },
  {
    division: "খুলনা বিভাগ (Khulna)",
    districts: [
      "খুলনা",
      "যশোর",
      "কুষ্টিয়া",
      "সাতক্ষীরা",
      "বাগেরহাট",
      "ঝিনাইদহ",
      "চুয়াডাঙ্গা",
      "মাগুরা",
      "নড়াইল",
      "মেহেরপুর",
    ],
  },
  {
    division: "সিলেট বিভাগ (Sylhet)",
    districts: ["সিলেট", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"],
  },
  {
    division: "বরিশাল বিভাগ (Barishal)",
    districts: [
      "বরিশাল",
      "পটুয়াখালী",
      "ভোলা",
      "পিরোজপুর",
      "বরগুনা",
      "ঝালকাঠি",
    ],
  },
  {
    division: "রংপুর বিভাগ (Rangpur)",
    districts: [
      "রংপুর",
      "দিনাজপুর",
      "কুড়িগ্রাম",
      "গাইবান্ধা",
      "নীলফামারী",
      "পঞ্চগড়",
      "ঠাকুরগাঁও",
      "লালমনিরহাট",
    ],
  },
  {
    division: "ময়মনসিংহ বিভাগ (Mymensingh)",
    districts: ["ময়মনসিংহ", "জামালপুর", "নেত্রকোনা", "শেরপুর"],
  },
];

/**
 * Format English numbers to Bengali numerals for authentic UI display
 */
export function toBanglaNumber(num: number | string): string {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/\d/g, (digit) => banglaDigits[Number(digit)]);
}
