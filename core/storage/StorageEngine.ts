import { uploadStorageFile, buildStoragePath } from "./upload";
import { downloadStorageFile, downloadStorageText } from "./download";
import { deleteStorageFile, deleteStorageFiles } from "./delete";
import { moveStorageFile } from "./move";
import { copyStorageFile } from "./copy";
import { getStoragePreviewUrl } from "./filePreview";
import { createSignedUrl, createSignedUrls } from "./signedUrls";
import { getImageThumbnailUrl } from "./thumbnails";
import { validateStorageFile } from "./fileValidator";
import { optimizeImage } from "./imageOptimizer";
import { calculateBucketUsage } from "./quota";
import { scanFileBeforeUpload } from "./virusScanner";

export const StorageEngine = {
  upload: uploadStorageFile,
  buildPath: buildStoragePath,
  download: downloadStorageFile,
  downloadText: downloadStorageText,
  delete: deleteStorageFile,
  deleteMany: deleteStorageFiles,
  move: moveStorageFile,
  copy: copyStorageFile,
  previewUrl: getStoragePreviewUrl,
  signedUrl: createSignedUrl,
  signedUrls: createSignedUrls,
  thumbnailUrl: getImageThumbnailUrl,
  validate: validateStorageFile,
  optimizeImage,
  quota: calculateBucketUsage,
  scan: scanFileBeforeUpload,
};

export default StorageEngine;

