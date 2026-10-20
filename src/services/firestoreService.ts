import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DELIVERY_CHARGE,
  PRODUCTS,
  ProductConfigItem,
  resolveImageUrl,
} from '../config/storeConfig';
import {
  db,
  ensureAdminAuthenticated,
  FIREBASE_DATABASE_ID,
  FIREBASE_PROJECT_ID,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DeliveryLocationType,
  OrderStatusType,
  PaymentMethodType,
  PaymentStatusType,
} from '../components/OrderFormSection';

export interface FirestoreProductDocument {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  regularPrice: number;
  salePrice: number;
  discountPercentage: number;
  images: (string | Record<string, unknown>)[];
  thumbnail: string;
  mainImage?: string;
  imageUrl?: string;
  sizes: string[];
  colors: string[];
  colorImages?: Record<string, string>;
  stockQuantity: number;
  stock: boolean;
  features: string[];
  active: boolean;
  position: number;
  insideDhakaDelivery: number;
  outsideDhakaDelivery: number;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface FirestoreOrderDocument {
  orderId: string;
  customerName: string;
  mobileNumber: string;
  district: string;
  fullAddress: string;
  note: string;
  productId: string;
  productName: string;
  unitPrice: number;
  size: string;
  color: string;
  quantity: number;
  deliveryLocation: DeliveryLocationType;
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
  stockDeducted: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

const formatTimestampToIso = (val?: Timestamp | string): string => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  return new Date().toISOString();
};

export function isStrictlyCustomerVisibleProduct(
  docData: FirestoreProductDocument | ProductConfigItem
): boolean {
  if (!docData) return false;
  if (docData.active !== true) return false;

  // Never show sample/inactive demo products in the public Customer View
  const idLower = String(docData.id || '').toLowerCase();
  const nameLower = String(docData.name || '').toLowerCase();
  if (
    idLower.includes('sample-inactive') ||
    nameLower.includes('sample inactive product')
  ) {
    return false;
  }

  return true;
}

export function mapFirestoreProductToConfig(
  docData: FirestoreProductDocument
): ProductConfigItem {
  const rawExtracted: string[] = [];

  // Priority: images[].secure_url -> images[].url -> images[] -> thumbnail -> mainImage -> imageUrl
  if (Array.isArray(docData.images)) {
    docData.images.forEach((entry) => {
      const resolved = resolveImageUrl(entry);
      if (resolved && !rawExtracted.includes(resolved)) {
        rawExtracted.push(resolved);
      }
    });
  }

  const resolvedThumbnail = resolveImageUrl(docData.thumbnail);
  const resolvedMainImage = resolveImageUrl(docData.mainImage);
  const resolvedImageUrl = resolveImageUrl(docData.imageUrl);

  [resolvedThumbnail, resolvedMainImage, resolvedImageUrl].forEach((extra) => {
    if (extra && !rawExtracted.includes(extra)) {
      rawExtracted.push(extra);
    }
  });

  // Always prefer valid Cloudinary HTTPS URLs if present on the product
  const cloudinaryImgs = rawExtracted.filter((u) =>
    u.includes('cloudinary.com')
  );
  const otherImgs = rawExtracted.filter((u) => !u.includes('cloudinary.com'));
  const finalImages =
    cloudinaryImgs.length > 0 ? [...cloudinaryImgs, ...otherImgs] : rawExtracted;

  const primaryResolvedUrl =
    (resolvedThumbnail && resolvedThumbnail.includes('cloudinary.com')
      ? resolvedThumbnail
      : '') ||
    finalImages[0] ||
    resolvedThumbnail ||
    resolvedMainImage ||
    resolvedImageUrl ||
    '';

  console.info('[CUSTOMER IMAGE] Product ID:', docData.id);
  console.info('[CUSTOMER IMAGE] Resolved URL:', primaryResolvedUrl || '(placeholder fallback)');

  return {
    id: docData.id,
    name: docData.name,
    subtitle: docData.subtitle || '',
    description: docData.description,
    category: docData.category || 'General',
    images: finalImages,
    thumbnail: primaryResolvedUrl,
    mainImage: resolvedMainImage || primaryResolvedUrl,
    imageUrl: resolvedImageUrl || primaryResolvedUrl,
    regularPrice: Number(docData.regularPrice) || 0,
    salePrice: Number(docData.salePrice) || 0,
    discountPercentage: Number(docData.discountPercentage) || 0,
    sizes:
      Array.isArray(docData.sizes) && docData.sizes.length > 0
        ? docData.sizes
        : ['M', 'L', 'XL', 'XXL'],
    colors: Array.isArray(docData.colors) ? docData.colors : [],
    colorImages:
      docData.colorImages && typeof docData.colorImages === 'object'
        ? Object.fromEntries(
            Object.entries(docData.colorImages)
              .map(([k, v]) => [String(k).trim(), resolveImageUrl(v)])
              .filter(([k, v]) => Boolean(k && v))
          )
        : undefined,
    stockQuantity: Number(docData.stockQuantity ?? 0),
    stock: Boolean(docData.stock && Number(docData.stockQuantity ?? 0) > 0),
    features: Array.isArray(docData.features) ? docData.features : [],
    deliveryInfo: {
      insideDhaka:
        docData.insideDhakaDelivery ?? DELIVERY_CHARGE.insideDhaka,
      outsideDhaka:
        docData.outsideDhakaDelivery ?? DELIVERY_CHARGE.outsideDhaka,
      timeDhaka: '২৪–৪৮ ঘণ্টা (ঢাকার ভিতরে)',
      timeOutside: '২–৪ কার্যদিবস (ঢাকার বাইরে)',
    },
    active: docData.active === true,
    position: Number(docData.position ?? 1),
    createdAt: formatTimestampToIso(docData.createdAt),
    updatedAt: formatTimestampToIso(docData.updatedAt),
  };
}

function sortCustomerProducts(items: ProductConfigItem[]): ProductConfigItem[] {
  return [...items].sort((a, b) => {
    const aHasCloudinary = String(a.thumbnail || '').includes('cloudinary.com')
      ? 0
      : 1;
    const bHasCloudinary = String(b.thumbnail || '').includes('cloudinary.com')
      ? 0
      : 1;
    if (aHasCloudinary !== bHasCloudinary) {
      return aHasCloudinary - bHasCloudinary;
    }
    return (a.position ?? 999) - (b.position ?? 999);
  });
}

const delayMs = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reliable one-time Customer Product fetch using `getDocs()` with automatic
 * exponential backoff retry (up to 3 retries: ~1s, 2s, 4s).
 * Strictly queries `where('active', '==', true)` and filters `active === true` (excluding sample/inactive items).
 */
export async function fetchActiveProductsWithRetry(
  maxRetries = 3
): Promise<ProductConfigItem[]> {
  console.info('[CUSTOMER FIRESTORE PROJECT]', FIREBASE_PROJECT_ID);
  console.info('[CUSTOMER FIRESTORE DATABASE]', FIREBASE_DATABASE_ID);
  console.info('[CUSTOMER PRODUCTS] Fetch started');
  console.info(
    '[CUSTOMER PRODUCTS QUERY]',
    "collection(db, 'products'), where('active', '==', true)"
  );

  const q = query(collection(db, 'products'), where('active', '==', true));
  const retryDelays = [1000, 2000, 4000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const snap = await getDocs(q);
      console.info(
        `[CUSTOMER PRODUCTS] Firestore returned: ${snap.size} products`
      );

      const returnedSummary: {
        productId: string;
        active: boolean;
        activeType: string;
        name: string;
      }[] = [];

      const activeItems: ProductConfigItem[] = [];
      snap.forEach((docSnap) => {
        const rawData = docSnap.data() as FirestoreProductDocument;
        returnedSummary.push({
          productId: docSnap.id || rawData.id,
          active: rawData.active === true,
          activeType: typeof rawData.active,
          name: rawData.name,
        });

        if (!isStrictlyCustomerVisibleProduct(rawData)) {
          return;
        }
        const mapped = mapFirestoreProductToConfig(rawData);
        if (mapped.active === true) {
          activeItems.push(mapped);
        }
      });

      console.info('[CUSTOMER PRODUCTS RESULT]', returnedSummary);

      const sorted = sortCustomerProducts(activeItems);
      console.info(`[CUSTOMER PRODUCTS] Active products: ${sorted.length}`);
      if (sorted.length > 0) {
        console.info('[CUSTOMER PRODUCTS] First product ID:', sorted[0].id);
        console.info('[CUSTOMER PRODUCTS] First product name:', sorted[0].name);
      }
      return sorted;
    } catch (err: unknown) {
      lastError = err;
      const errCode =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : 'unknown';
      const errMsg = err instanceof Error ? err.message : String(err);

      console.error(
        `[CUSTOMER PRODUCTS ERROR] Attempt ${attempt + 1} failed — code: ${errCode} | message: ${errMsg}`,
        err
      );
      if (attempt < maxRetries) {
        const waitTime = retryDelays[attempt] || 4000;
        await delayMs(waitTime);
      }
    }
  }

  const finalCode =
    typeof lastError === 'object' && lastError !== null && 'code' in lastError
      ? String((lastError as { code?: unknown }).code)
      : 'unknown';
  const finalMsg =
    lastError instanceof Error ? lastError.message : String(lastError);

  console.error(
    `[CUSTOMER PRODUCTS ERROR] All getDocs retry attempts failed — code: ${finalCode} | message: ${finalMsg}`
  );
  throw lastError instanceof Error
    ? lastError
    : new Error('পণ্য লোড হতে একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।');
}

/**
 * Subscribe to active products (`active == true`) for the public customer store.
 * Treat `onSnapshot` strictly as an optional realtime enhancement:
 * - Never clears already-loaded `getDocs` products on WebChannel/Listen error.
 */
export function subscribeToActiveProducts(
  onUpdate: (products: ProductConfigItem[]) => void
) {
  const q = query(collection(db, 'products'), where('active', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ProductConfigItem[] = [];
      snapshot.forEach((docSnap) => {
        const rawData = docSnap.data() as FirestoreProductDocument;
        if (!isStrictlyCustomerVisibleProduct(rawData)) {
          return;
        }
        const mapped = mapFirestoreProductToConfig(rawData);
        if (mapped.active === true) {
          items.push(mapped);
        }
      });

      const sorted = sortCustomerProducts(items);
      console.info(
        `[CUSTOMER PRODUCTS] Realtime onSnapshot update: ${sorted.length} active products`
      );
      if (sorted.length > 0) {
        onUpdate(sorted);
      }
    },
    (error: unknown) => {
      const errCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : 'unknown';
      const errMsg = error instanceof Error ? error.message : String(error);
      // Do NOT clear already-loaded products if WebChannel Listen transport fails
      console.warn(
        `[CUSTOMER PRODUCTS ERROR] Optional realtime listener warning (code: ${errCode} | message: ${errMsg}) — keeping existing getDocs products`
      );
    }
  );
}

/**
 * Subscribe to ALL products (active + inactive) for authenticated Admins.
 */
export function subscribeToAllProductsAdmin(
  onUpdate: (products: ProductConfigItem[]) => void
) {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      const items: ProductConfigItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(
          mapFirestoreProductToConfig(
            docSnap.data() as FirestoreProductDocument
          )
        );
      });
      items.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

/**
 * Subscribe to ALL orders for authenticated Admins.
 */
export function subscribeToAllOrdersAdmin(
  onUpdate: (orders: FirestoreOrderDocument[]) => void
) {
  return onSnapshot(
    collection(db, 'orders'),
    (snapshot) => {
      const orders: FirestoreOrderDocument[] = [];
      snapshot.forEach((docSnap) => {
        orders.push(docSnap.data() as FirestoreOrderDocument);
      });
      orders.sort((a, b) => {
        const timeA = formatTimestampToIso(a.createdAt);
        const timeB = formatTimestampToIso(b.createdAt);
        return timeB.localeCompare(timeA);
      });
      onUpdate(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

/**
 * Seed initial PRODUCTS into Firestore if the products collection is empty (Admin only).
 */
export async function seedDefaultProductsIfEmpty(): Promise<number> {
  const path = 'products';
  try {
    await ensureAdminAuthenticated();

    // Ensure product-004-sample-inactive is strictly marked active: false in Firestore if it exists
    const sampleInactiveRef = doc(db, path, 'product-004-sample-inactive');
    const sampleSnap = await getDoc(sampleInactiveRef);
    if (sampleSnap.exists() && sampleSnap.data()?.active === true) {
      const existingData = sampleSnap.data();
      await setDoc(sampleInactiveRef, {
        ...existingData,
        active: false,
        updatedAt: serverTimestamp(),
      });
    }

    const existingSnap = await getDocs(collection(db, path));
    if (!existingSnap.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    PRODUCTS.forEach((item, index) => {
      const cleanId = item.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
      const imageUrls = item.images
        .map((img) => (typeof img === 'string' ? img : img.url))
        .slice(0, 10);
      const regularPrice = Math.max(0, Number(item.regularPrice) || 0);
      const salePrice = Math.max(0, Number(item.salePrice) || 0);
      const discountAmount = Math.max(0, regularPrice - salePrice);
      const discountPercentage =
        regularPrice > 0
          ? Math.min(100, Math.round((discountAmount / regularPrice) * 100))
          : 0;
      const stockQuantity = Math.max(
        0,
        Number(item.stockQuantity ?? (item.stock ? 30 : 0))
      );

      const ref = doc(db, path, cleanId);
      batch.set(ref, {
        id: cleanId,
        name: item.name.slice(0, 200),
        subtitle: (item.subtitle || '').slice(0, 500),
        description: item.description.slice(0, 4000),
        category: (item.category || 'T-Shirt').slice(0, 100),
        regularPrice,
        salePrice,
        discountPercentage,
        images: imageUrls,
        thumbnail: (item.thumbnail || imageUrls[0] || '').slice(0, 2000),
        sizes: (item.sizes.length > 0 ? item.sizes : ['M', 'L', 'XL', 'XXL'])
          .map((s) => String(s).trim().slice(0, 30))
          .filter(Boolean)
          .slice(0, 10),
        colors: (item.colors || [])
          .map((c) => String(c).trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 10),
        stockQuantity,
        stock: stockQuantity > 0 && Boolean(item.stock),
        features: (item.features || [])
          .map((f) => String(f).trim().slice(0, 300))
          .filter(Boolean)
          .slice(0, 10),
        active: Boolean(item.active),
        position: item.position ?? index + 1,
        insideDhakaDelivery:
          item.deliveryInfo?.insideDhaka ?? DELIVERY_CHARGE.insideDhaka,
        outsideDhakaDelivery:
          item.deliveryInfo?.outsideDhaka ?? DELIVERY_CHARGE.outsideDhaka,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return PRODUCTS.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save (Create or Update) a Product in Firestore (Admin only).
 * Automatically waits for Firebase Auth readiness and checks if the product ID already exists
 * so `createdAt` is always preserved on updates and set to `serverTimestamp()` on creates.
 */
export async function saveProductToFirestore(
  product: ProductConfigItem,
  isNew: boolean
): Promise<void> {
  const cleanId =
    product.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120) ||
    `product-${Date.now()}`;
  const path = `products/${cleanId}`;

  const imageUrls = product.images
    .map((img) =>
      typeof img === 'string'
        ? img.trim().slice(0, 2000)
        : img.url.trim().slice(0, 2000)
    )
    .filter((u) => u.length > 0)
    .slice(0, 10);

  const safeImages =
    imageUrls.length > 0
      ? imageUrls
      : ['/src/assets/images/tshirt_front_showcase_1791298823867.jpg'];

  const cleanSizes = (product.sizes || [])
    .map((s) => String(s).trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 10);
  const safeSizes = cleanSizes.length > 0 ? cleanSizes : ['M'];

  const cleanColors = (product.colors || [])
    .map((c) => String(c).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 10);

  const cleanColorImages: Record<string, string> = {};
  if (product.colorImages && typeof product.colorImages === 'object') {
    Object.entries(product.colorImages).forEach(([colorKey, imgVal]) => {
      const trimmedColor = String(colorKey).trim().slice(0, 60);
      const trimmedUrl = String(imgVal || '').trim().slice(0, 2000);
      if (
        trimmedColor &&
        trimmedUrl &&
        cleanColors.some(
          (c) => c.toLowerCase() === trimmedColor.toLowerCase()
        ) &&
        Object.keys(cleanColorImages).length < 10
      ) {
        cleanColorImages[trimmedColor] = trimmedUrl;
      }
    });
  }

  const cleanFeatures = (product.features || [])
    .map((f) => String(f).trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 10);

  const regularPrice = Math.min(
    1000000,
    Math.max(0, Number(product.regularPrice) || 0)
  );
  const salePrice = Math.min(
    1000000,
    Math.max(0, Number(product.salePrice) || 0)
  );
  const discountAmount = Math.max(0, regularPrice - salePrice);
  const discountPercentage =
    regularPrice > 0
      ? Math.min(100, Math.round((discountAmount / regularPrice) * 100))
      : 0;
  const stockQuantity = Math.min(
    100000,
    Math.max(0, Math.floor(Number(product.stockQuantity ?? 0)))
  );
  const hasStock = stockQuantity > 0;
  const safeName = (product.name || '').trim().slice(0, 200) || 'Product';
  const safeDescription =
    (product.description || '').trim().slice(0, 4000) || safeName;
  const safeCategory =
    (product.category || 'T-Shirt').trim().slice(0, 100) || 'T-Shirt';

  try {
    await ensureAdminAuthenticated();

    const ref = doc(db, 'products', cleanId);
    const existingSnap = await getDoc(ref);
    const docAlreadyExists = existingSnap.exists();
    const existingCreatedAt =
      docAlreadyExists && existingSnap.data()?.createdAt
        ? existingSnap.data().createdAt
        : serverTimestamp();

    console.info('[DIAGNOSTIC 2/4 - Firestore Product Document Saved]', {
      productId: cleanId,
      firestoreImagesFieldValue: safeImages,
      firestoreThumbnailFieldValue: safeImages[0].slice(0, 2000),
    });

    await setDoc(ref, {
      id: cleanId,
      name: safeName,
      subtitle: (product.subtitle || '').trim().slice(0, 500),
      description: safeDescription,
      category: safeCategory,
      regularPrice,
      salePrice,
      discountPercentage,
      images: safeImages,
      thumbnail: safeImages[0].slice(0, 2000),
      sizes: safeSizes,
      colors: cleanColors,
      ...(Object.keys(cleanColorImages).length > 0
        ? { colorImages: cleanColorImages }
        : {}),
      stockQuantity,
      stock: hasStock,
      features: cleanFeatures,
      active: Boolean(product.active),
      position: Math.min(100000, Math.max(0, Number(product.position ?? 1))),
      insideDhakaDelivery: Math.min(
        5000,
        Math.max(
          0,
          Number(product.deliveryInfo?.insideDhaka ?? DELIVERY_CHARGE.insideDhaka)
        )
      ),
      outsideDhakaDelivery: Math.min(
        5000,
        Math.max(
          0,
          Number(
            product.deliveryInfo?.outsideDhaka ?? DELIVERY_CHARGE.outsideDhaka
          )
        )
      ),
      createdAt: docAlreadyExists ? existingCreatedAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

/**
 * Delete a Product from Firestore (Admin only).
 */
export async function deleteProductFromFirestore(
  productId: string
): Promise<void> {
  const path = `products/${productId}`;
  try {
    await ensureAdminAuthenticated();
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Submit a new customer order + payment record to Firestore.
 */
export async function createOrderInFirestore(orderInput: {
  orderId: string;
  customerName: string;
  mobileNumber: string;
  district: string;
  fullAddress: string;
  note?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  size: string;
  color: string;
  quantity: number;
  deliveryLocation: DeliveryLocationType;
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
}): Promise<void> {
  const cleanOrderId = orderInput.orderId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const cleanProductId = orderInput.productId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const paymentId = `PAY-${cleanOrderId}`;

  // First check if the product exists in Firestore so the relational rule passes
  const productRef = doc(db, 'products', cleanProductId);
  const productSnap = await getDoc(productRef);
  if (!productSnap.exists()) {
    // Product is only in static config (database not seeded yet by admin); skip DB write gracefully
    return;
  }

  try {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', cleanOrderId);
    const paymentRef = doc(db, 'payments', paymentId);

    batch.set(orderRef, {
      orderId: cleanOrderId,
      customerName: orderInput.customerName.trim().slice(0, 150),
      mobileNumber: orderInput.mobileNumber.trim().slice(0, 20),
      district: orderInput.district.trim().slice(0, 100),
      fullAddress: orderInput.fullAddress.trim().slice(0, 1000),
      note: (orderInput.note || '').trim().slice(0, 500),
      productId: cleanProductId,
      productName: orderInput.productName.trim().slice(0, 200),
      unitPrice: Number(orderInput.unitPrice),
      size: orderInput.size.trim().slice(0, 30),
      color: (orderInput.color || '').trim().slice(0, 60),
      quantity: Number(orderInput.quantity),
      deliveryLocation: orderInput.deliveryLocation,
      deliveryTypeLabel: orderInput.deliveryTypeLabel.trim().slice(0, 100),
      subtotal: Number(orderInput.subtotal),
      deliveryCharge: Number(orderInput.deliveryCharge),
      grandTotal: Number(orderInput.grandTotal),
      onlinePaid: Number(orderInput.onlinePaid),
      codAmount: Number(orderInput.codAmount),
      paymentMethod: orderInput.paymentMethod,
      paymentAccountNumber: orderInput.paymentAccountNumber.trim().slice(0, 30),
      senderMobile: orderInput.senderMobile.trim().slice(0, 20),
      transactionId: orderInput.transactionId.trim().slice(0, 64),
      paymentStatus: 'PAYMENT VERIFICATION PENDING',
      orderStatus: 'PENDING PAYMENT VERIFICATION',
      stockDeducted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(paymentRef, {
      paymentId,
      orderId: cleanOrderId,
      paymentMethod: orderInput.paymentMethod,
      receiverAccount: orderInput.paymentAccountNumber.trim().slice(0, 30),
      senderMobile: orderInput.senderMobile.trim().slice(0, 20),
      transactionId: orderInput.transactionId.trim().slice(0, 64),
      amount: Number(orderInput.onlinePaid),
      status: 'PAYMENT VERIFICATION PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${cleanOrderId}`);
  }
}

/**
 * Update Order & Payment status (Admin only) and automatically deduct stock
 * when an order is confirmed (`CONFIRMED` & `PAID`).
 */
export async function updateOrderStatusAndStockAdmin(
  order: FirestoreOrderDocument,
  newPaymentStatus: PaymentStatusType,
  newOrderStatus: OrderStatusType
): Promise<void> {
  const orderPath = `orders/${order.orderId}`;
  try {
    await ensureAdminAuthenticated();
    let shouldMarkStockDeducted = order.stockDeducted;

    // Automatically deduct product stock on confirmation if not already deducted
    if (
      newOrderStatus === 'CONFIRMED' &&
      newPaymentStatus === 'PAID' &&
      !order.stockDeducted
    ) {
      const prodRef = doc(db, 'products', order.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as FirestoreProductDocument;
        const currentQty = Number(prodData.stockQuantity ?? 0);
        const updatedQty = Math.max(0, currentQty - Number(order.quantity));
        await setDoc(prodRef, {
          ...prodData,
          stockQuantity: updatedQty,
          stock: updatedQty > 0,
          updatedAt: serverTimestamp(),
        });
        shouldMarkStockDeducted = true;
      }
    }

    await updateDoc(doc(db, 'orders', order.orderId), {
      paymentStatus: newPaymentStatus,
      orderStatus: newOrderStatus,
      stockDeducted: shouldMarkStockDeducted,
      note: order.note || '',
      updatedAt: serverTimestamp(),
    });

    const paymentId = `PAY-${order.orderId}`;
    const paymentRef = doc(db, 'payments', paymentId);
    const paymentSnap = await getDoc(paymentRef);
    if (paymentSnap.exists()) {
      await updateDoc(paymentRef, {
        status: newPaymentStatus,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orderPath);
  }
}
