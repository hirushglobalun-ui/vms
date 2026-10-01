import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './config';
import { DocumentType } from '../types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes (Section 41 & storage.rules)

/**
 * Uploads a vehicle document file (PDF or Image) to Firebase Storage
 * Path pattern: vehicle-documents/{vehicleId}/{docType}/{timestamp}_{filename}
 */
export async function uploadVehicleDocument(
  vehicleId: string,
  docType: DocumentType,
  file: File
): Promise<{ fileUrl: string; fileName: string }> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('Invalid file format. Only PDF, JPG, and PNG documents are supported.');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the 15MB limit. Please upload a compressed document.');
  }

  // Clean filename to prevent path traversal or special character issues
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `vehicle-documents/${vehicleId}/${docType.toLowerCase()}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: {
      vehicleId,
      docType,
      originalName: file.name,
    },
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    fileUrl: downloadUrl,
    fileName: file.name,
  };
}
