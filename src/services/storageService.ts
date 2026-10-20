import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  ensureAdminAuthenticated,
  handleFirestoreError,
  isAuthorizedAdminUser,
  OperationType,
} from '../lib/firebase';
import { STORE_CONFIG } from '../config/storeConfig';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export interface CloudinaryConfigSettings {
  cloudName: string;
  uploadPreset: string;
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

export function validateProductImageFile(file: File): string | null {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime) && !validExt) {
    return `"${file.name}" ফাইলটি গ্রহণযোগ্য নয় (MIME: ${file.type || 'unknown'})। শুধুমাত্র JPG, JPEG, PNG এবং WEBP ফরম্যাটের ছবি আপলোড করা যাবে।`;
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return `"${file.name}" ফাইলটির সাইজ (${sizeMb} MB) ৫ MB এর বেশি। সর্বোচ্চ ৫ MB সাইজের ছবি আপলোড করুন।`;
  }
  return null;
}

/**
 * Returns default Cloudinary config from env / STORE_CONFIG.
 */
export function getEnvCloudinaryConfig(): CloudinaryConfigSettings {
  return {
    cloudName: (STORE_CONFIG.cloudinary?.cloudName || '').trim(),
    uploadPreset: (STORE_CONFIG.cloudinary?.uploadPreset || '').trim(),
  };
}

/**
 * Loads the authorized Admin's saved Cloudinary settings from `/admins/{uid}` in Firestore,
 * falling back to `.env` (`VITE_CLOUDINARY_CLOUD_NAME` & `VITE_CLOUDINARY_UPLOAD_PRESET`).
 */
export async function loadAdminCloudinaryConfig(): Promise<CloudinaryConfigSettings> {
  const envCfg = getEnvCloudinaryConfig();
  try {
    const currentUser = await ensureAdminAuthenticated();
    const adminRef = doc(db, 'admins', currentUser.uid);
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      const data = snap.data();
      const savedCloudName =
        typeof data.cloudinaryCloudName === 'string'
          ? data.cloudinaryCloudName.trim()
          : '';
      const savedPreset =
        typeof data.cloudinaryUploadPreset === 'string'
          ? data.cloudinaryUploadPreset.trim()
          : '';
      return {
        cloudName: savedCloudName || envCfg.cloudName,
        uploadPreset: savedPreset || envCfg.uploadPreset,
      };
    }
  } catch (err) {
    console.warn('Could not read Cloudinary config from admin doc:', err);
  }
  return envCfg;
}

/**
 * Saves the public Cloudinary `cloudName` and unsigned `uploadPreset` to `/admins/{uid}` in Firestore
 * so the permanent Admin never has to re-enter them across devices.
 * (No API secret is ever stored or accepted).
 */
export async function saveAdminCloudinaryConfigToFirestore(
  config: CloudinaryConfigSettings
): Promise<void> {
  const currentUser = await ensureAdminAuthenticated();

  const cleanCloudName = config.cloudName.trim().slice(0, 120);
  const cleanPreset = config.uploadPreset.trim().slice(0, 120);

  if (!cleanCloudName || !cleanPreset) {
    throw new Error(
      'অনুগ্রহ করে সঠিক Cloudinary Cloud Name এবং Unsigned Upload Preset দিন।'
    );
  }

  const path = `admins/${currentUser.uid}`;
  try {
    const adminRef = doc(db, 'admins', currentUser.uid);
    const snap = await getDoc(adminRef);
    const existingCreatedAt = snap.exists() && snap.data()?.createdAt
      ? snap.data().createdAt
      : serverTimestamp();

    await setDoc(adminRef, {
      uid: currentUser.uid,
      email: (currentUser.email || BOOTSTRAPPED_ADMIN_EMAIL).trim().toLowerCase(),
      displayName: (currentUser.displayName || 'SOHAN SHOP Admin').slice(0, 150),
      role: 'super_admin',
      cloudinaryCloudName: cleanCloudName,
      cloudinaryUploadPreset: cleanPreset,
      createdAt: existingCreatedAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Uploads a single image file directly to Cloudinary Free Image Hosting using an
 * Unsigned Upload Preset (`POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload`).
 *
 * - Strictly requires the currently authenticated user to be the permanent Admin (`mdsohanurrahman5029@gmail.com`).
 * - Never uses or exposes any Cloudinary API Secret.
 * - Reports real-time upload progress (0% -> 100%) via XMLHttpRequest `upload.onprogress`.
 * - Returns the permanent HTTPS `secure_url` from Cloudinary.
 */
export async function uploadProductImageToCloudinary(
  productId: string,
  file: File,
  cloudinaryConfig: CloudinaryConfigSettings,
  onProgress: (percent: number, state: string) => void
): Promise<{ downloadUrl: string; publicId: string }> {
  // 1. Wait for Firebase Auth readiness & verify Admin Authentication Before Upload
  const currentUser = await ensureAdminAuthenticated();

  if (!isAuthorizedAdminUser(currentUser)) {
    throw new Error('আপনার এই Google Account-এর Admin access নেই!');
  }

  // 2. Validate File Format (JPG, JPEG, PNG, WEBP) and Size (Max 5 MB)
  const validationErr = validateProductImageFile(file);
  if (validationErr) {
    throw new Error(validationErr);
  }

  // 3. Validate Cloudinary Cloud Name & Unsigned Upload Preset
  const cloudName = cloudinaryConfig.cloudName.trim();
  const uploadPreset = cloudinaryConfig.uploadPreset.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary কনফিগারেশন পাওয়া যায়নি। অনুগ্রহ করে নিচের "Cloudinary Setup" বক্সে আপনার Cloudinary Cloud Name এবং Unsigned Upload Preset দিয়ে সেভ করুন।'
    );
  }

  const cleanProductId =
    productId.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'unassigned-product';
  const folderPath = `sohan_shop/products/${cleanProductId}`;
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    cloudName
  )}/image/upload`;

  console.info('[SOHAN SHOP Cloudinary Upload] Starting image upload:', {
    cloudName,
    uploadPreset,
    authenticatedUserEmail: currentUser.email,
    productId: cleanProductId,
    folderPath,
    fileName: file.name,
    fileSizeBytes: file.size,
    fileSizeMB: Number((file.size / (1024 * 1024)).toFixed(3)),
    fileMimeType: file.type || 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folderPath);

    xhr.open('POST', endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        console.info('[SOHAN SHOP Cloudinary Upload] Progress:', {
          fileName: file.name,
          loadedBytes: event.loaded,
          totalBytes: event.total,
          progressPercentage: `${percent}%`,
        });
        onProgress(percent, 'running');
      }
    };

    xhr.onload = () => {
      let responseJson: Record<string, unknown> = {};
      try {
        responseJson = JSON.parse(xhr.responseText || '{}');
      } catch {
        // ignore parse error
      }

      if (xhr.status >= 200 && xhr.status < 300 && responseJson.secure_url) {
        const secureUrl = String(responseJson.secure_url);
        const publicId = String(responseJson.public_id || '');
        onProgress(100, 'success');
        console.info('[DIAGNOSTIC 1/4 - Cloudinary Upload Response]', {
          fileName: file.name,
          cloudinaryReturnedSecureUrl: secureUrl,
          publicId,
          format: responseJson.format,
        });
        resolve({
          downloadUrl: secureUrl,
          publicId,
        });
      } else {
        const apiErrorMsg =
          (responseJson.error as { message?: string })?.message ||
          xhr.statusText ||
          'Unknown Cloudinary error';

        console.error('[SOHAN SHOP Cloudinary Upload] Upload failed:', {
          httpStatus: xhr.status,
          cloudName,
          uploadPreset,
          apiErrorMsg,
          rawResponse: responseJson,
        });

        const lowerErr = apiErrorMsg.toLowerCase();
        if (
          lowerErr.includes('upload preset not found') ||
          lowerErr.includes('preset')
        ) {
          reject(
            new Error(
              `Cloudinary ত্রুটি (${apiErrorMsg}): Upload Preset "${uploadPreset}" খুঁজে পাওয়া যায়নি অথবা এটি "Unsigned" মোডে নেই। অনুগ্রহ করে Cloudinary Dashboard → Settings → Upload → Upload Presets-এ গিয়ে Signing Mode: "Unsigned" নিশ্চিত করুন।`
            )
          );
        } else if (
          lowerErr.includes('must supply api_key') ||
          lowerErr.includes('signed')
        ) {
          reject(
            new Error(
              `Cloudinary ত্রুটি (${apiErrorMsg}): আপনার Upload Preset "${uploadPreset}" বর্তমানে "Signed" মোডে আছে। অনুগ্রহ করে সেটিকে "Unsigned" মোডে পরিবর্তন করুন (ফ্রন্টএন্ডে কোনো API Secret ছাড়াই নিরাপদে আপলোড করার জন্য)।`
            )
          );
        } else if (
          xhr.status === 401 ||
          xhr.status === 404 ||
          lowerErr.includes('cloud_name')
        ) {
          reject(
            new Error(
              `Cloudinary ত্রুটি (${apiErrorMsg}): আপনার Cloudinary Cloud Name ("${cloudName}") সঠিক নয়। অনুগ্রহ করে সঠিক Cloud Name দিন।`
            )
          );
        } else {
          reject(
            new Error(
              `Cloudinary ইমেজ আপলোড ব্যর্থ হয়েছে (HTTP ${xhr.status}: ${apiErrorMsg})। অনুগ্রহ করে আপনার Cloud Name এবং Unsigned Upload Preset যাচাই করুন।`
            )
          );
        }
      }
    };

    xhr.onerror = () => {
      console.error('[SOHAN SHOP Cloudinary Upload] Network error during upload');
      reject(
        new Error(
          'নেটওয়ার্ক ত্রুটির কারণে Cloudinary-তে ছবি আপলোড করা যায়নি। আপনার ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।'
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error('ছবি আপলোড বাতিল করা হয়েছে।'));
    };

    xhr.send(formData);
  });
}
