import React, { useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  XCircle,
  Clock,
  RefreshCw,
  Star,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  isAuthorizedAdminUser,
} from '../lib/firebase';
import {
  ProductConfigItem,
  STORE_CONFIG,
  getProductDiscountInfo,
  normalizeProductImages,
} from '../config/storeConfig';
import {
  deleteProductFromFirestore,
  FirestoreOrderDocument,
  saveProductToFirestore,
  seedDefaultProductsIfEmpty,
  subscribeToAllOrdersAdmin,
  subscribeToAllProductsAdmin,
  updateOrderStatusAndStockAdmin,
} from '../services/firestoreService';
import {
  CloudinaryConfigSettings,
  getEnvCloudinaryConfig,
  loadAdminCloudinaryConfig,
  saveAdminCloudinaryConfigToFirestore,
  uploadProductImageToCloudinary,
  validateProductImageFile,
} from '../services/storageService';

type AdminTab = 'dashboard' | 'products' | 'add_edit_product' | 'orders';

interface AdminPanelProps {
  onExitAdmin: () => void;
}

interface UploadingImageItem {
  tempId: string;
  fileName: string;
  previewUrl: string;
  progress: number;
  state?: string;
  error?: string;
}

const EMPTY_PRODUCT_FORM: ProductConfigItem = {
  id: '',
  name: '',
  subtitle: '',
  description: '',
  category: 'T-Shirt',
  regularPrice: 990,
  salePrice: 750,
  discountPercentage: 24,
  images: [],
  thumbnail: '',
  sizes: ['M', 'L', 'XL', 'XXL'],
  colors: ['Black', 'Navy Blue'],
  stock: true,
  stockQuantity: 30,
  features: [
    '১০০% অরিজিনাল রিং-স্পান কম্বড কটন ফেব্রিক',
    '১৮০–১৯০ GSM পারফেক্ট থিকনেস',
    'রঙ ও সাইজের ১০০% গ্যারান্টি',
  ],
  deliveryInfo: {
    insideDhaka: 60,
    outsideDhaka: 120,
  },
  active: true,
  position: 1,
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExitAdmin }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation & Data States
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<ProductConfigItem[]>([]);
  const [orders, setOrders] = useState<FirestoreOrderDocument[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Product Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add / Edit Product Form States
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [formProduct, setFormProduct] =
    useState<ProductConfigItem>(EMPTY_PRODUCT_FORM);
  const [sizesInput, setSizesInput] = useState('M, L, XL, XXL');
  const [colorsInput, setColorsInput] = useState('Black, Navy Blue');
  const [featuresInput, setFeaturesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Direct Android / Mobile Cloudinary Free Image Hosting Upload States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingImageItem[]>(
    []
  );
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [cloudinaryConfig, setCloudinaryConfig] =
    useState<CloudinaryConfigSettings>(() => getEnvCloudinaryConfig());
  const [showCloudinarySetupModal, setShowCloudinarySetupModal] =
    useState(false);
  const [isSavingCloudinaryConfig, setIsSavingCloudinaryConfig] =
    useState(false);

  const isCloudinaryConfigured =
    cloudinaryConfig.cloudName.trim().length > 0 &&
    cloudinaryConfig.uploadPreset.trim().length > 0;

  useEffect(() => {
    if (isAuthorizedAdmin) {
      loadAdminCloudinaryConfig().then((cfg) => {
        setCloudinaryConfig(cfg);
        if (!cfg.cloudName || !cfg.uploadPreset) {
          setShowCloudinarySetupModal(true);
        }
      });
    }
  }, [isAuthorizedAdmin]);

  const handleSaveCloudinarySettings = async () => {
    if (
      !cloudinaryConfig.cloudName.trim() ||
      !cloudinaryConfig.uploadPreset.trim()
    ) {
      showToast(
        'error',
        'অনুগ্রহ করে Cloudinary Cloud Name এবং Unsigned Upload Preset উভয়ই লিখুন।'
      );
      return;
    }

    setIsSavingCloudinaryConfig(true);
    try {
      await saveAdminCloudinaryConfigToFirestore(cloudinaryConfig);
      setShowCloudinarySetupModal(false);
      setUploadErrors([]);
      showToast(
        'success',
        'Cloudinary ফ্রি ইমেজ হোস্টিং কনফিগারেশন সফলভাবে সেভ হয়েছে! এখন ছবি আপলোড করতে পারবেন।'
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Cloudinary সেটিংস সেভ করতে সমস্যা হয়েছে।'
      );
    } finally {
      setIsSavingCloudinaryConfig(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // 1. Verify Authentication & Admin Role (Wait for Firebase Auth readiness & ID token)
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);

      if (!user) {
        setIsAuthorizedAdmin(false);
        setAuthLoading(false);
        return;
      }

      try {
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
        // Ensure a valid, fresh ID token is attached before making any Firestore calls
        await user.getIdToken();

        const isPermanentAuthorizedAdmin = isAuthorizedAdminUser(user);

        if (isPermanentAuthorizedAdmin) {
          // Verify server-side authorization via Firestore rules on /admins/{uid}
          const adminRef = doc(db, 'admins', user.uid);
          const snap = await getDoc(adminRef);
          if (!snap.exists()) {
            await setDoc(adminRef, {
              uid: user.uid,
              email: (user.email || BOOTSTRAPPED_ADMIN_EMAIL).trim().toLowerCase(),
              displayName: (user.displayName || 'SOHAN SHOP Admin').slice(0, 150),
              role: 'super_admin',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          if (isMounted) {
            setIsAuthorizedAdmin(true);
          }
          await seedDefaultProductsIfEmpty();
        } else {
          if (isMounted) {
            setIsAuthorizedAdmin(false);
          }
        }
      } catch (err) {
        console.error('Admin verification error:', err);
        if (isMounted) {
          setIsAuthorizedAdmin(false);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Attach Real-Time Listeners for Admin Products & Orders
  useEffect(() => {
    if (!isAuthorizedAdmin) return;

    const unsubProducts = subscribeToAllProductsAdmin((items) => {
      setProducts(items);
    });
    const unsubOrders = subscribeToAllOrdersAdmin((ordList) => {
      setOrders(ordList);
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [isAuthorizedAdmin]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In সম্পন্ন করা যায়নি। পপআপ ব্লক থাকলে আনব্লক করুন।'
      );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthorizedAdmin(false);
  };

  // ============================================================================
  // DIRECT CLOUDINARY FREE IMAGE UPLOAD (ANDROID & DESKTOP)
  // ============================================================================
  const handleDirectStorageFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFiles: File[] = Array.from(fileList);
    // Reset input value so selecting the same file again works
    e.target.value = '';

    setUploadErrors([]);

    if (!isCloudinaryConfigured) {
      setShowCloudinarySetupModal(true);
      setUploadErrors([
        'ছবি আপলোড করার আগে নিচে আপনার Cloudinary Cloud Name এবং Unsigned Upload Preset দিয়ে "Save Cloudinary Config" বাটনে ক্লিক করুন।',
      ]);
      return;
    }

    const currentImgCount = formProduct.images.length;
    if (currentImgCount + selectedFiles.length > 10) {
      setUploadErrors([
        `একটি প্রোডাক্টে সর্বোচ্চ ১০টি ছবি রাখা যাবে। বর্তমানে ${currentImgCount}টি ছবি আছে।`,
      ]);
      return;
    }

    const validFiles: { file: File; tempId: string; previewUrl: string }[] = [];
    const immediateErrors: string[] = [];

    selectedFiles.forEach((file) => {
      const validationErr = validateProductImageFile(file);
      if (validationErr) {
        immediateErrors.push(validationErr);
      } else {
        const tempId = `upload-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const previewUrl = URL.createObjectURL(file);
        validFiles.push({ file, tempId, previewUrl });
      }
    });

    if (immediateErrors.length > 0) {
      setUploadErrors(immediateErrors);
    }

    if (validFiles.length === 0) return;

    const targetProductId =
      formProduct.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') ||
      `product-00${products.length + 1}`;

    // Add to active upload progress list
    setUploadingFiles((prev) => [
      ...prev,
      ...validFiles.map((vf) => ({
        tempId: vf.tempId,
        fileName: vf.file.name,
        previewUrl: vf.previewUrl,
        progress: 0,
      })),
    ]);

    const uploadedDownloadUrls: string[] = [];

    await Promise.all(
      validFiles.map(async ({ file, tempId, previewUrl }) => {
        try {
          const { downloadUrl } = await uploadProductImageToCloudinary(
            targetProductId,
            file,
            cloudinaryConfig,
            (percent, state) => {
              setUploadingFiles((prev) =>
                prev.map((item) =>
                  item.tempId === tempId
                    ? { ...item, progress: percent, state }
                    : item
                )
              );
            }
          );

          uploadedDownloadUrls.push(downloadUrl);

          // Remove from uploading queue and revoke local blob preview
          URL.revokeObjectURL(previewUrl);
          setUploadingFiles((prev) =>
            prev.filter((item) => item.tempId !== tempId)
          );
        } catch (err: unknown) {
          URL.revokeObjectURL(previewUrl);
          const errMsg =
            err instanceof Error
              ? err.message
              : `"${file.name}" আপলোড করতে সমস্যা হয়েছে।`;

          setUploadingFiles((prev) =>
            prev.filter((item) => item.tempId !== tempId)
          );
          setUploadErrors((prev) => [...prev, errMsg]);
          setShowCloudinarySetupModal(true);
        }
      })
    );

    if (uploadedDownloadUrls.length > 0) {
      let updatedFormProduct: ProductConfigItem | null = null;
      setFormProduct((prev) => {
        const currentImgs = prev.images
          .map((i) => (typeof i === 'string' ? i.trim() : i.url.trim()))
          .filter(Boolean);
        const combined = Array.from(
          new Set([...currentImgs, ...uploadedDownloadUrls])
        ).slice(0, 10);
        const next: ProductConfigItem = {
          ...prev,
          images: combined,
          thumbnail: combined[0] || '',
        };
        updatedFormProduct = next;
        return next;
      });

      // If editing an existing product in Firestore, immediately persist the new Cloudinary secure URLs
      if (isEditingExisting && formProduct.id.trim() && updatedFormProduct) {
        try {
          await saveProductToFirestore(updatedFormProduct, false);
          showToast(
            'success',
            `${uploadedDownloadUrls.length}টি ছবি Cloudinary-তে আপলোড এবং Firestore প্রোডাক্টে স্বয়ংক্রিয়ভাবে সেভ হয়েছে!`
          );
        } catch {
          showToast(
            'success',
            `${uploadedDownloadUrls.length}টি ছবি Cloudinary-তে আপলোড হয়েছে! নিচে "প্রোডাক্ট আপডেট সেভ করুন" চাপুন।`
          );
        }
      } else {
        showToast(
          'success',
          `${uploadedDownloadUrls.length}টি ছবি Cloudinary-তে সফলভাবে আপলোড হয়েছে!`
        );
      }
    }
  };

  const openAddNewProduct = () => {
    const nextNum = products.length + 1;
    const defaultId = `product-00${nextNum}`;
    const initialFeatures = [
      '১০০% অরিজিনাল রিং-স্পান কম্বড কটন ফেব্রিক',
      '১৮০–১৯০ GSM পারফেক্ট থিকনেস',
      'রঙ ও সাইজের ১০০% গ্যারান্টি',
      'পণ্য হাতে পেয়ে দেখে টাকা পরিশোধ করার সুবিধা (Cash on Delivery)',
    ];
    setIsEditingExisting(false);
    setUploadErrors([]);
    setUploadingFiles([]);
    setFormProduct({
      ...EMPTY_PRODUCT_FORM,
      id: defaultId,
      position: nextNum,
      images: [],
      thumbnail: '',
      features: initialFeatures,
    });
    setSizesInput('M, L, XL, XXL');
    setColorsInput('Black, Navy Blue');
    setFeaturesInput(initialFeatures.join('\n'));
    setActiveTab('add_edit_product');
  };

  const openEditProduct = (prod: ProductConfigItem) => {
    const imgStrings = prod.images.map((img) =>
      typeof img === 'string' ? img : img.url
    );
    setIsEditingExisting(true);
    setUploadErrors([]);
    setUploadingFiles([]);
    setFormProduct({
      ...prod,
      images: imgStrings,
      thumbnail: imgStrings[0] || prod.thumbnail || '',
      stockQuantity: prod.stockQuantity ?? (prod.stock ? 25 : 0),
    });
    setSizesInput(prod.sizes.join(', '));
    setColorsInput(prod.colors.join(', '));
    setFeaturesInput(prod.features.join('\n'));
    setActiveTab('add_edit_product');
  };

  const handleDuplicateProduct = async (prod: ProductConfigItem) => {
    const newId = `${prod.id}-copy-${Math.floor(100 + Math.random() * 900)}`;
    const duplicated: ProductConfigItem = {
      ...prod,
      id: newId,
      name: `${prod.name} (Copy)`,
      position: products.length + 1,
    };
    try {
      await saveProductToFirestore(duplicated, true);
      showToast('success', `"${prod.name}" ডুপ্লিকেট করা হয়েছে!`);
    } catch {
      showToast('error', 'প্রোডাক্ট ডুপ্লিকেট করতে সমস্যা হয়েছে।');
    }
  };

  const handleToggleProductActive = async (prod: ProductConfigItem) => {
    try {
      await saveProductToFirestore({ ...prod, active: !prod.active }, false);
      showToast(
        'success',
        `"${prod.name}" এখন ${!prod.active ? 'Active (চালু)' : 'Inactive (বন্ধ)'} করা হয়েছে।`
      );
    } catch {
      showToast('error', 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  const handleMovePosition = async (
    prod: ProductConfigItem,
    direction: 'up' | 'down'
  ) => {
    const currentPos = prod.position ?? 1;
    const newPos =
      direction === 'up' ? Math.max(1, currentPos - 1) : currentPos + 1;
    try {
      await saveProductToFirestore({ ...prod, position: newPos }, false);
      showToast('success', 'প্রোডাক্টের পজিশন আপডেট হয়েছে।');
    } catch {
      showToast('error', 'পজিশন পরিবর্তন করা যায়নি।');
    }
  };

  const handleConfirmDeleteProduct = async (productId: string) => {
    try {
      await deleteProductFromFirestore(productId);
      setDeleteConfirmId(null);
      showToast('success', 'প্রোডাক্টটি স্থায়ীভাবে ডিলিট করা হয়েছে।');
    } catch {
      showToast('error', 'প্রোডাক্ট ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const removeImageFromForm = (indexToRemove: number) => {
    const currentImgs = formProduct.images.map((i) =>
      typeof i === 'string' ? i : i.url
    );
    const updated = currentImgs.filter((_, idx) => idx !== indexToRemove);

    setFormProduct({
      ...formProduct,
      images: updated,
      thumbnail: updated[0] || '',
    });
  };

  const setAsMainFeaturedImage = (index: number) => {
    if (index === 0) return;
    const currentImgs = [
      ...formProduct.images.map((i) => (typeof i === 'string' ? i : i.url)),
    ];
    const [chosen] = currentImgs.splice(index, 1);
    currentImgs.unshift(chosen);
    setFormProduct({
      ...formProduct,
      images: currentImgs,
      thumbnail: currentImgs[0] || '',
    });
    showToast('success', 'ছবিটি Main / Featured Image হিসেবে সেট করা হয়েছে।');
  };

  const moveImageInForm = (index: number, direction: 'left' | 'right') => {
    const currentImgs = [
      ...formProduct.images.map((i) => (typeof i === 'string' ? i : i.url)),
    ];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentImgs.length) return;
    const temp = currentImgs[index];
    currentImgs[index] = currentImgs[targetIdx];
    currentImgs[targetIdx] = temp;
    setFormProduct({
      ...formProduct,
      images: currentImgs,
      thumbnail: currentImgs[0] || '',
    });
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingFiles.length > 0) {
      showToast(
        'error',
        'ছবি আপলোড সম্পন্ন হওয়া পর্যন্ত অনুগ্রহ করে অপেক্ষা করুন।'
      );
      return;
    }

    const cleanId = formProduct.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
    if (!cleanId) {
      showToast('error', 'সঠিক Product ID দিন (যেমন: product-005)।');
      return;
    }
    if (!formProduct.name.trim() || formProduct.name.trim().length < 2) {
      showToast('error', 'প্রোডাক্টের নাম লিখুন।');
      return;
    }

    const currentImgs = formProduct.images.map((i) =>
      typeof i === 'string' ? i.trim() : i.url.trim()
    ).filter(Boolean);

    if (currentImgs.length === 0) {
      showToast(
        'error',
        'অন্তত ১টি প্রোডাক্টের ছবি আপলোড করুন ([Upload Images] বাটনে ট্যাপ করুন)।'
      );
      return;
    }

    const parsedSizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedColors = colorsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const parsedFeatures = featuresInput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    if (parsedSizes.length === 0) {
      showToast('error', 'অন্তত ১টি সাইজ দিন (যেমন: M, L, XL)।');
      return;
    }

    setIsSaving(true);
    try {
      const stockQty = Math.max(
        0,
        Math.floor(Number(formProduct.stockQuantity ?? 0))
      );
      const productToSave: ProductConfigItem = {
        ...formProduct,
        id: cleanId,
        images: currentImgs,
        thumbnail: currentImgs[0],
        sizes: parsedSizes,
        colors: parsedColors,
        features: parsedFeatures,
        stockQuantity: stockQty,
        stock: stockQty > 0,
      };
      await saveProductToFirestore(productToSave, !isEditingExisting);
      showToast(
        'success',
        isEditingExisting
          ? 'প্রোডাক্টের তথ্য ও ছবি সফলভাবে আপডেট হয়েছে!'
          : 'নতুন প্রোডাক্ট ও ছবি সফলভাবে যুক্ত হয়েছে!'
      );
      setActiveTab('products');
    } catch (err) {
      console.error('Save product error:', err);
      showToast(
        'error',
        err instanceof Error && err.message.includes('Admin access')
          ? 'আপনার এই Google Account-এর Admin access নেই!'
          : 'প্রোডাক্ট সেভ করতে সমস্যা হয়েছে।'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered products for Product Management list
  const categories = Array.from(
    new Set(products.map((p) => p.category || 'T-Shirt'))
  );
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? p.active
        : !p.active;
    const matchesCat =
      categoryFilter === 'all'
        ? true
        : (p.category || 'T-Shirt') === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  // Dashboard Metrics
  const totalProductsCount = products.length;
  const activeProductsCount = products.filter((p) => p.active).length;
  const inactiveProductsCount = products.filter((p) => !p.active).length;
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(
    (o) => o.orderStatus === 'PENDING PAYMENT VERIFICATION'
  ).length;
  const confirmedOrdersCount = orders.filter(
    (o) => o.orderStatus === 'CONFIRMED'
  ).length;

  // ============================================================================
  // 1. LOADING STATE
  // ============================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-300">
            অ্যাডমিন সিকিউরিটি যাচাই করা হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ADMIN LOGIN / UNAUTHORIZED SCREEN
  // ============================================================================
  if (!currentUser || !isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-[#DC2626] tracking-wider uppercase">
                Restricted Area
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                {STORE_CONFIG.storeName} — Admin Login
              </h1>
            </div>
            <ShieldCheck className="w-8 h-8 text-[#DC2626] shrink-0" />
          </div>

          {!currentUser ? (
            <div className="mt-6 space-y-5">
              <p className="text-sm text-slate-300 leading-relaxed">
                শুধুমাত্র অনুমোদিত স্টোর অ্যাডমিন এই প্যানেলে প্রবেশ করতে পারবেন। আপনার অ্যাডমিন Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
              </p>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-12 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Sign in with Google (Admin)</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 space-y-2.5">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm sm:text-base">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>আপনার এই Google Account-এর Admin access নেই!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  সাইন-ইন করা অ্যাকাউন্ট: <strong className="text-white">{currentUser.email}</strong>। শুধুমাত্র অনুমোদিত স্থায়ী অ্যাডমিন এই প্যানেলে প্রবেশ করতে পারবেন।
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onExitAdmin}
                  className="w-full h-12 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>কাস্টমার স্টোরে ফিরে যান (Return to Store)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>অন্য Google অ্যাকাউন্ট দিয়ে সাইন-ইন করুন</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>কাস্টমার স্টোরে ফিরে যান</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Firestore & Storage Protected
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. AUTHENTICATED ADMIN PANEL INTERFACE (MOBILE-FIRST & DESKTOP)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
              {STORE_CONFIG.storeName} ADMIN
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={openAddNewProduct}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'add_edit_product'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#DC2626] text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders ({orders.length})</span>
            </button>
          </nav>

          {/* Right Actions: View Store + Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Customer Store</span>
              <span className="sm:hidden">Store</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="অ্যাডমিন লগআউট করুন"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Touch-Friendly Navigation Bar */}
        <div className="md:hidden grid grid-cols-4 gap-1 px-2 py-2 bg-slate-900 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 rounded-lg text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#DC2626] text-white'
                : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-2 rounded-lg text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#DC2626] text-white'
                : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={openAddNewProduct}
            className={`py-2 rounded-lg text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'add_edit_product'
                ? 'bg-[#DC2626] text-white'
                : 'text-slate-400'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add New</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 rounded-lg text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#DC2626] text-white'
                : 'text-slate-400'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders ({orders.length})</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div
            className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-xs underline ml-4 cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ====================================================================
            TAB 1: ADMIN DASHBOARD
            ==================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  অ্যাডমিন ড্যাশবোর্ড (Admin Dashboard)
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  লগইনকৃত অ্যাডমিন: {currentUser.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={openAddNewProduct}
                  className="h-11 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন প্রোডাক্ট যোগ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>প্রোডাক্ট লিস্ট দেখুন</span>
                </button>
              </div>
            </div>

            {/* 6 Key Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Total Products (মোট প্রোডাক্ট)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                  {totalProductsCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-emerald-700">
                  Active Products (চালু প্রোডাক্ট)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {activeProductsCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Inactive Products (বন্ধ প্রোডাক্ট)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-600 tabular-nums">
                  {inactiveProductsCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-500">
                  Total Orders (মোট অর্ডার)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                  {totalOrdersCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-amber-700">
                  Pending Orders (ভেরিফিকেশন বাকি)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600 tabular-nums">
                  {pendingOrdersCount}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200">
                <span className="text-xs font-semibold text-emerald-700">
                  Confirmed Orders (কনফার্মড অর্ডার)
                </span>
                <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-700 tabular-nums">
                  {confirmedOrdersCount}
                </div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  সাম্প্রতিক অর্ডারসমূহ (Recent Orders)
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
                >
                  সব অর্ডার দেখুন →
                </button>
              </div>

              {orders.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  এখনো কোনো অর্ডার জমা পড়েনি।
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">গ্রাহক ও ফোন</th>
                        <th className="py-3 px-3">প্রোডাক্ট</th>
                        <th className="py-3 px-3">পেমেন্ট ও TrxID</th>
                        <th className="py-3 px-3">স্ট্যাটাস</th>
                        <th className="py-3 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 tabular-nums">
                      {orders.slice(0, 6).map((ord) => (
                        <tr key={ord.orderId} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {ord.orderId}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">
                              {ord.customerName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {ord.mobileNumber} · {ord.district}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">
                              {ord.productName}
                            </div>
                            <div className="text-xs text-slate-500">
                              Size: {ord.size}
                              {ord.color ? ` · ${ord.color}` : ''} ×{' '}
                              {ord.quantity}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">
                              {ord.paymentMethod}: ৳{ord.onlinePaid} (COD: ৳
                              {ord.codAmount})
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              From: {ord.senderMobile} · TrxID:{' '}
                              {ord.transactionId}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-bold text-xs ${
                                ord.paymentStatus === 'PAID'
                                  ? 'text-emerald-700'
                                  : ord.paymentStatus === 'REJECTED'
                                  ? 'text-red-600'
                                  : 'text-amber-700'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveTab('orders')}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                            >
                              ম্যানেজ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: PRODUCT MANAGEMENT PAGE
            ==================================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  প্রোডাক্ট ম্যানেজমেন্ট (Product Management)
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  প্রোডাক্ট যোগ, এডিট, ডিলিট, পজিশন পরিবর্তন এবং Active/Inactive করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={openAddNewProduct}
                className="h-12 px-5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="প্রোডাক্টের নাম বা ID দিয়ে খুঁজুন..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as 'all' | 'active' | 'inactive'
                  )
                }
                className="h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="all">সব স্ট্যাটাস (All Status)</option>
                <option value="active">Active (শুধুমাত্র চালু প্রোডাক্ট)</option>
                <option value="inactive">Inactive (বন্ধ প্রোডাক্ট)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:border-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="all">সব ক্যাটাগরি (All Categories)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsive Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredProducts.map((prod) => {
                const imgs = normalizeProductImages(prod);
                const thumb = prod.thumbnail || imgs[0]?.url;
                const { discountPercentage } = getProductDiscountInfo(prod);
                const stockQty =
                  prod.stockQuantity ?? (prod.stock ? 25 : 0);

                return (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-2xl border-2 p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                      prod.active
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50/70 opacity-85'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={thumb}
                        alt={prod.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-slate-700">
                            {prod.id}
                          </span>
                          <span>·</span>
                          <span>{prod.category || 'T-Shirt'}</span>
                          <span>·</span>
                          <span>Pos: #{prod.position ?? 1}</span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate">
                          {prod.name}
                        </h3>

                        <div className="mt-1.5 flex flex-wrap items-baseline gap-2 tabular-nums">
                          <span className="text-lg font-extrabold text-[#DC2626]">
                            ৳{prod.salePrice}
                          </span>
                          <del className="text-xs text-slate-400">
                            ৳{prod.regularPrice}
                          </del>
                          <span className="text-xs font-semibold text-emerald-700">
                            ({discountPercentage}% Off)
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>
                            স্টক:{' '}
                            <strong
                              className={
                                stockQty > 0
                                  ? 'text-emerald-700'
                                  : 'text-red-600'
                              }
                            >
                              {stockQty > 0
                                ? `${stockQty} Pcs`
                                : 'Out of Stock (0)'}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>সাইজ: {prod.sizes.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Touch-Friendly Action Controls */}
                    <div className="pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      {/* Left: Active Toggle + Position Reorder */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleProductActive(prod)}
                          className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            prod.active
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {prod.active ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMovePosition(prod, 'up')}
                          title="উপরে নিন"
                          className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePosition(prod, 'down')}
                          title="নিচে নিন"
                          className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right: Edit, Duplicate, Delete */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditProduct(prod)}
                          className="h-10 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(prod)}
                          title="ডুপ্লিকেট করুন"
                          className="h-10 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </button>

                        {deleteConfirmId === prod.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmDeleteProduct(prod.id)
                              }
                              className="h-10 px-3 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-10 px-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(prod.id)}
                            title="ডিলিট করুন"
                            className="w-10 h-10 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: ADD / EDIT PRODUCT PAGE (DIRECT ANDROID STORAGE IMAGE UPLOAD)
            ==================================================================== */}
        {activeTab === 'add_edit_product' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8">
              <div className="flex items-center justify-between pb-5 border-b border-slate-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {isEditingExisting
                      ? `প্রোডাক্ট এডিট করুন (${formProduct.id})`
                      : 'নতুন প্রোডাক্ট যোগ করুন (Add New Product)'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    মোবাইল গ্যালারি থেকে সরাসরি ছবি আপলোড করে সেভ করলে কাস্টমার পেজে সাথে সাথে আপডেট হয়ে যাবে।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ← তালিকায় ফিরুন
                </button>
              </div>

              <form
                onSubmit={handleSaveProductForm}
                className="mt-6 space-y-6"
              >
                {/* Row 1: Product ID, Category, Position */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Product ID *
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={isEditingExisting}
                      value={formProduct.id}
                      onChange={(e) =>
                        setFormProduct({ ...formProduct, id: e.target.value })
                      }
                      placeholder="product-005"
                      className={`w-full h-12 px-3.5 rounded-xl border text-sm font-mono ${
                        isEditingExisting
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Product Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProduct.category || ''}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          category: e.target.value,
                        })
                      }
                      placeholder="T-Shirt / Polo / Combo"
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Display Position (ক্রম)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formProduct.position ?? 1}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          position: Number(e.target.value),
                        })
                      }
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm tabular-nums"
                    />
                  </div>
                </div>

                {/* Row 2: Product Name & Subtitle */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Product Name (প্রোডাক্টের নাম) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProduct.name}
                      onChange={(e) =>
                        setFormProduct({ ...formProduct, name: e.target.value })
                      }
                      placeholder="যেমন: Premium Stylish T-Shirt"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm sm:text-base font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Short Subtitle (সংক্ষিপ্ত সাবটাইটেল)
                    </label>
                    <input
                      type="text"
                      value={formProduct.subtitle || ''}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          subtitle: e.target.value,
                        })
                      }
                      placeholder="১০০% এক্সপোর্ট কোয়ালিটি কম্বড কটন..."
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Product Description (বিস্তারিত বিবরণ) *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formProduct.description}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          description: e.target.value,
                        })
                      }
                      placeholder="প্রোডাক্টের ফেব্রিক, আরাম ও কোয়ালিটি সম্পর্কে বিস্তারিত লিখুন..."
                      className="w-full p-3.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                {/* Row 3: Pricing & Stock Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Regular Price (৳) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formProduct.regularPrice}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          regularPrice: Number(e.target.value),
                        })
                      }
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-bold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Sale / Offer Price (৳) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formProduct.salePrice}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          salePrice: Number(e.target.value),
                        })
                      }
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-extrabold text-[#DC2626] tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Stock Quantity (স্টক সংখ্যা) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formProduct.stockQuantity ?? 0}
                      onChange={(e) => {
                        const qty = Math.max(0, Number(e.target.value));
                        setFormProduct({
                          ...formProduct,
                          stockQuantity: qty,
                          stock: qty > 0,
                        });
                      }}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-bold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Product Status
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormProduct({
                          ...formProduct,
                          active: !formProduct.active,
                        })
                      }
                      className={`w-full h-12 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                        formProduct.active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {formProduct.active
                        ? '✓ Active (কাস্টমার দেখবে)'
                        : '✕ Inactive (লুকানো)'}
                    </button>
                  </div>
                </div>

                {/* ============================================================
                    Row 4: PRODUCT IMAGES — DIRECT CLOUDINARY FREE IMAGE UPLOAD
                    ============================================================ */}
                <div className="pt-5 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-base font-extrabold text-slate-900">
                        Product Images (Cloudinary Free Hosting) *
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        আপনার Android ফোনের গ্যালারি থেকে সরাসরি এক বা একাধিক ছবি (JPG, JPEG, PNG, WEBP — সর্বোচ্চ 5 MB) আপলোড করুন।
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowCloudinarySetupModal(!showCloudinarySetupModal)
                      }
                      className={`self-start sm:self-auto text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isCloudinaryConfigured
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {isCloudinaryConfigured
                          ? `Cloudinary Connected (${cloudinaryConfig.cloudName})`
                          : 'Cloudinary Setup (Required)'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Collapsible / Automatic Cloudinary Free Configuration Panel */}
                  {(showCloudinarySetupModal || !isCloudinaryConfigured) && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-4 border border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>
                              Cloudinary Free Image Hosting Setup (No API Secret Required)
                            </span>
                          </h4>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Firebase Spark (Free) প্ল্যানে ছবি আপলোড করার জন্য আপনার ফ্রি <strong>Cloudinary Cloud Name</strong> এবং <strong>Unsigned Upload Preset</strong> নিচে দিন। এটি একবার সেভ করলে Firestore-এ আপনার অ্যাডমিন প্রোফাইলে স্থায়ীভাবে সেভ থাকবে (অথবা <code>.env</code> ফাইলে <code>VITE_CLOUDINARY_CLOUD_NAME</code> ও <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> হিসেবে রাখতে পারেন)।
                          </p>
                        </div>
                        {isCloudinaryConfigured && (
                          <button
                            type="button"
                            onClick={() => setShowCloudinarySetupModal(false)}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer shrink-0"
                          >
                            বন্ধ করুন
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            1. Cloudinary Cloud Name *
                          </label>
                          <input
                            type="text"
                            value={cloudinaryConfig.cloudName}
                            onChange={(e) =>
                              setCloudinaryConfig({
                                ...cloudinaryConfig,
                                cloudName: e.target.value,
                              })
                            }
                            placeholder="যেমন: dxyz123abc"
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            2. Unsigned Upload Preset Name *
                          </label>
                          <input
                            type="text"
                            value={cloudinaryConfig.uploadPreset}
                            onChange={(e) =>
                              setCloudinaryConfig({
                                ...cloudinaryConfig,
                                uploadPreset: e.target.value,
                              })
                            }
                            placeholder="যেমন: sohan_shop_unsigned"
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:border-emerald-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className="text-[11px] text-amber-300 leading-relaxed">
                          ⚠️ <strong>নিরাপত্তা নোট:</strong> কখনোই এখানে বা কোডে <code>API Secret</code> দেবেন না। শুধুমাত্র <strong>Signing Mode: Unsigned</strong> করা Upload Preset ব্যবহার করুন।
                        </p>

                        <button
                          type="button"
                          onClick={handleSaveCloudinarySettings}
                          disabled={isSavingCloudinaryConfig}
                          className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shrink-0 cursor-pointer disabled:opacity-60"
                        >
                          {isSavingCloudinaryConfig
                            ? 'সেভ হচ্ছে...'
                            : 'Save Cloudinary Config'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden Native File Picker for Android / Mobile / Desktop */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleDirectStorageFilesSelected}
                    className="hidden"
                  />

                  {/* Primary [Upload Images] Button Card */}
                  <div className="p-5 sm:p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-[#DC2626] flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFiles.length > 0}
                        className="h-12 px-6 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Images</span>
                      </button>

                      <p className="text-xs text-slate-500 pt-1">
                        ফোনের গ্যালারি বা ফাইল পিকার খুলতে <strong>Upload Images</strong> বাটনে ট্যাপ করুন
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Cloudinary Folder: sohan_shop/products/
                        {formProduct.id.trim().replace(/[^a-zA-Z0-9_-]/g, '-') ||
                          'product-id'}{' '}
                        · Max 5 MB/image (JPG, JPEG, PNG, WEBP)
                      </p>
                    </div>
                  </div>

                  {/* Active Upload Progress Bars */}
                  {uploadingFiles.length > 0 && (
                    <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-[#DC2626] animate-spin" />
                        <span>
                          Cloudinary-তে ছবি আপলোড হচ্ছে ({uploadingFiles.length}টি)...
                        </span>
                      </div>

                      <div className="space-y-2">
                        {uploadingFiles.map((item) => (
                          <div
                            key={item.tempId}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3"
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.fileName}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                                <span className="truncate">{item.fileName}</span>
                                <span className="tabular-nums text-[#DC2626] font-bold">
                                  {item.progress}%
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-[#DC2626] transition-all duration-200"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Validation or Storage Errors */}
                  {uploadErrors.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>ইমেজ আপলোড ত্রুটি:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadErrors([])}
                          className="text-xs font-bold text-red-700 underline cursor-pointer"
                        >
                          মুছুন
                        </button>
                      </div>
                      <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                        {uploadErrors.map((errText, idx) => (
                          <li key={idx}>{errText}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Uploaded Product Images Preview Grid with Main Selection, Reordering & Delete */}
                  {formProduct.images.length === 0 ? (
                    <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-1">
                      <ImageIcon className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-600">
                        এখনো কোনো ছবি যুক্ত করা হয়নি।
                      </p>
                      <p className="text-xs text-slate-500">
                        উপরের <strong>Upload Images</strong> বাটনে ট্যাপ করে আপনার ফোনের গ্যালারি থেকে প্রোডাক্টের ছবি সিলেক্ট করুন।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          মোট যুক্ত করা ছবি:{' '}
                          <strong>{formProduct.images.length}টি</strong> (প্রথম ছবিটি Main/Featured Image)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        {formProduct.images.map((imgItem, idx) => {
                          const url =
                            typeof imgItem === 'string' ? imgItem : imgItem.url;
                          const isMain = idx === 0;

                          return (
                            <div
                              key={url + idx}
                              className={`relative rounded-xl border-2 p-2.5 bg-slate-50 flex flex-col justify-between gap-2 transition-all ${
                                isMain
                                  ? 'border-[#DC2626] bg-red-50/20'
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-white border border-slate-200">
                                <img
                                  src={url}
                                  alt={`Product Preview ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {isMain ? (
                                  <span className="absolute top-1.5 left-1.5 bg-[#DC2626] text-white text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                    <Star className="w-2.5 h-2.5 fill-white" />
                                    <span>Main Image</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setAsMainFeaturedImage(idx)}
                                    className="absolute bottom-1.5 left-1.5 right-1.5 py-1 px-2 rounded bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Star className="w-2.5 h-2.5" />
                                    <span>Set as Main</span>
                                  </button>
                                )}
                              </div>

                              {/* Reorder Left/Right & Delete Controls */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveImageInForm(idx, 'left')}
                                    title="বামে সরান"
                                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
                                  >
                                    ←
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      idx === formProduct.images.length - 1
                                    }
                                    onClick={() =>
                                      moveImageInForm(idx, 'right')
                                    }
                                    title="ডানে সরান"
                                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-40 cursor-pointer"
                                  >
                                    →
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeImageFromForm(idx)}
                                  title="ছবি ডিলিট করুন"
                                  className="h-8 px-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>মুছুন</span>
                                </button>
                              </div>

                              {/* Optional Color Variant Assignment per Image */}
                              {colorsInput.trim().length > 0 && (
                                <select
                                  value={
                                    Object.entries(
                                      formProduct.colorImages || {}
                                    ).find(([, mappedUrl]) => mappedUrl === url)?.[0] || ''
                                  }
                                  onChange={(e) => {
                                    const chosenColor = e.target.value;
                                    const nextMap = {
                                      ...(formProduct.colorImages || {}),
                                    };
                                    // Remove any previous color mapped to this exact image URL
                                    Object.keys(nextMap).forEach((k) => {
                                      if (nextMap[k] === url) {
                                        delete nextMap[k];
                                      }
                                    });
                                    if (chosenColor) {
                                      nextMap[chosenColor] = url;
                                    }
                                    setFormProduct({
                                      ...formProduct,
                                      colorImages: nextMap,
                                    });
                                  }}
                                  className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer"
                                >
                                  <option value="">
                                    কালার সিলেক্ট করুন (ঐচ্ছিক)
                                  </option>
                                  {colorsInput
                                    .split(',')
                                    .map((c) => c.trim())
                                    .filter(Boolean)
                                    .map((c) => (
                                      <option key={c} value={c}>
                                        Color: {c}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 5: Sizes, Colors & Features */}
                <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Available Sizes (কমা দিয়ে লিখুন) *
                    </label>
                    <input
                      type="text"
                      required
                      value={sizesInput}
                      onChange={(e) => setSizesInput(e.target.value)}
                      placeholder="M, L, XL, XXL"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Available Colors (কমা দিয়ে লিখুন)
                    </label>
                    <input
                      type="text"
                      value={colorsInput}
                      onChange={(e) => setColorsInput(e.target.value)}
                      placeholder="Black, Navy Blue, Maroon"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Product Features (প্রতি লাইনে ১টি করে বৈশিষ্ট্য লিখুন)
                  </label>
                  <textarea
                    rows={4}
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder="১০০% অরিজিনাল রিং-স্পান কম্বড কটন ফেব্রিক&#10;১৮০–১৯০ GSM পারফেক্ট থিকনেস"
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="w-full sm:w-auto h-12 px-6 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || uploadingFiles.length > 0}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm sm:text-base shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSaving
                      ? 'সেভ হচ্ছে...'
                      : uploadingFiles.length > 0
                      ? 'ছবি আপলোড হচ্ছে...'
                      : isEditingExisting
                      ? 'প্রোডাক্ট আপডেট সেভ করুন'
                      : 'প্রোডাক্ট পাবলিশ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: ORDER & PAYMENT VERIFICATION MANAGEMENT
            ==================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                অর্ডার ও পেমেন্ট ভেরিফিকেশন (Order Management)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                গ্রাহকের পাঠানো bKash / Nagad Personal Send Money ডেলিভারি চার্জ যাচাই করে অর্ডার কনফার্ম করুন। অর্ডার CONFIRMED করলে অটোমেটিক প্রোডাক্টের স্টক কমে যাবে।
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
                এখনো কোনো অর্ডার পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                      <div>
                        <span className="font-mono font-extrabold text-base sm:text-lg text-slate-900">
                          {ord.orderId}
                        </span>
                        <span className="text-xs text-slate-500 ml-3">
                          {ord.deliveryTypeLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                            ord.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.paymentStatus === 'REJECTED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ord.paymentStatus === 'PAID' && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {ord.paymentStatus === 'REJECTED' && (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {ord.paymentStatus ===
                            'PAYMENT VERIFICATION PENDING' && (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>Payment: {ord.paymentStatus}</span>
                        </span>

                        <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-extrabold">
                          Order: {ord.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          গ্রাহকের তথ্য
                        </p>
                        <p className="font-bold text-slate-900">
                          {ord.customerName}
                        </p>
                        <p className="text-slate-700 tabular-nums">
                          ফোন: <strong>{ord.mobileNumber}</strong>
                        </p>
                        <p className="text-slate-600 text-xs">
                          জেলা: {ord.district} · ঠিকানা: {ord.fullAddress}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          প্রোডাক্ট বিবরণ
                        </p>
                        <p className="font-bold text-slate-900">
                          {ord.productName}{' '}
                          <span className="text-xs font-mono text-slate-500">
                            ({ord.productId})
                          </span>
                        </p>
                        <p className="text-slate-700">
                          সাইজ: <strong>{ord.size}</strong>
                          {ord.color ? ` · কালার: ${ord.color}` : ''} · পরিমাণ:{' '}
                          <strong>{ord.quantity}টি</strong>
                        </p>
                        <p className="text-xs text-slate-500">
                          স্টক ডিডাকশন:{' '}
                          {ord.stockDeducted
                            ? '✓ স্টক কমানো হয়েছে'
                            : '⏳ এখনো কমানো হয়নি'}
                        </p>
                      </div>

                      <div className="space-y-1.5 tabular-nums">
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          পেমেন্ট যাচাই (Send Money)
                        </p>
                        <p className="font-bold text-slate-900">
                          মাধ্যম: {ord.paymentMethod} ({ord.paymentAccountNumber})
                        </p>
                        <p className="text-slate-800">
                          প্রেরক নম্বর:{' '}
                          <strong className="font-mono">
                            {ord.senderMobile}
                          </strong>
                        </p>
                        <p className="text-slate-800">
                          TrxID:{' '}
                          <strong className="font-mono text-[#DC2626]">
                            {ord.transactionId}
                          </strong>
                        </p>
                        <p className="text-xs font-bold text-emerald-700">
                          অগ্রিম ডেলিভারি চার্জ: ৳{ord.onlinePaid} · COD বাকি: ৳
                          {ord.codAmount}
                        </p>
                      </div>
                    </div>

                    {/* Admin Verification Action Buttons */}
                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        পেমেন্ট মিলিয়ে স্ট্যাটাস পরিবর্তন করুন:
                      </span>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateOrderStatusAndStockAdmin(
                              ord,
                              'PAID',
                              'CONFIRMED'
                            );
                            showToast(
                              'success',
                              `অর্ডার ${ord.orderId} PAID ও CONFIRMED করা হয়েছে এবং স্টক আপডেট হয়েছে।`
                            );
                          }}
                          className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          ✓ Verify PAID & Confirm Order
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await updateOrderStatusAndStockAdmin(
                              ord,
                              'PAYMENT VERIFICATION PENDING',
                              'PENDING PAYMENT VERIFICATION'
                            );
                            showToast(
                              'success',
                              `অর্ডার ${ord.orderId} পেন্ডিং স্ট্যাটাসে রাখা হয়েছে।`
                            );
                          }}
                          className="h-10 px-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold cursor-pointer"
                        >
                          ⏳ Mark Pending
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            await updateOrderStatusAndStockAdmin(
                              ord,
                              'REJECTED',
                              'PAYMENT REJECTED'
                            );
                            showToast(
                              'error',
                              `অর্ডার ${ord.orderId} REJECTED হিসেবে চিহ্নিত করা হয়েছে।`
                            );
                          }}
                          className="h-10 px-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold cursor-pointer"
                        >
                          ✕ Reject Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
