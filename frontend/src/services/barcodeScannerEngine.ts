import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
} from '@zxing/library';

export type ScannerStatus =
  | 'INITIALIZING'
  | 'READY'
  | 'SCANNING'
  | 'PERMISSION_DENIED'
  | 'UNAVAILABLE'
  | 'IN_USE'
  | 'NOT_SUPPORTED'
  | 'ERROR';

export interface ScannedMedicineData {
  rawText: string;
  format: string;
  medicine?: string;
  batch?: string;
  expiry?: string;
  quantity?: number;
  supplier?: string;
  unitPrice?: number;
  barcode?: string;
}

export interface CameraInfo {
  stream: MediaStream;
  trackLabel: string;
  resolution: string;
  isBackFacing: boolean;
}

// Supported barcode formats
const SUPPORTED_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.ITF,
];

// Configure hints
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

let zxingReader: MultiFormatReader | null = null;

function getZxingReader(): MultiFormatReader {
  if (!zxingReader) {
    zxingReader = new MultiFormatReader();
    zxingReader.setHints(hints);
  }
  return zxingReader;
}

/**
 * Initializes camera stream with requested constraints and resilient fallback.
 * Guarantees videoRef assignment and play().
 */
export async function startCameraStream(videoElement: HTMLVideoElement): Promise<CameraInfo> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('NOT_SUPPORTED');
  }

  // Stop any existing tracks on the video element
  if (videoElement.srcObject instanceof MediaStream) {
    videoElement.srcObject.getTracks().forEach(t => t.stop());
    videoElement.srcObject = null;
  }

  let stream: MediaStream | null = null;

  // Primary: environment facing HD camera
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch (primaryErr: unknown) {
    console.warn('Primary camera constraints rejected, falling back to standard video:', primaryErr);
    // Fallback: simple video: true
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    } catch (fallbackErr: unknown) {
      const err = fallbackErr as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('PERMISSION_DENIED');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('UNAVAILABLE');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('IN_USE');
      } else {
        throw new Error('ERROR');
      }
    }
  }

  if (!stream) {
    throw new Error('UNAVAILABLE');
  }

  // CRITICAL STEP: Assign stream to video and await play
  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('autoplay', 'true');
  videoElement.muted = true;

  try {
    await videoElement.play();
  } catch (playErr) {
    console.warn('video.play() auto-play notice:', playErr);
  }

  const track = stream.getVideoTracks()[0];
  const settings = track ? track.getSettings() : {};
  const label = track?.label || 'Camera Feed';
  const width = settings.width || videoElement.videoWidth || 1280;
  const height = settings.height || videoElement.videoHeight || 720;
  const isBackFacing = settings.facingMode === 'environment' || /back|rear|environment/i.test(label);

  return {
    stream,
    trackLabel: label,
    resolution: `${width}x${height}`,
    isBackFacing,
  };
}

/**
 * Cleanly stops all tracks and clears srcObject
 */
export function stopCameraStream(
  videoElement?: HTMLVideoElement | null,
  stream?: MediaStream | null
): void {
  if (stream) {
    try {
      stream.getTracks().forEach(t => t.stop());
    } catch (e) {
      console.warn('Error stopping stream tracks:', e);
    }
  }
  if (videoElement) {
    if (videoElement.srcObject instanceof MediaStream) {
      try {
        videoElement.srcObject.getTracks().forEach(t => t.stop());
      } catch (e) {
        console.warn('Error stopping video srcObject tracks:', e);
      }
    }
    videoElement.srcObject = null;
  }
}

/**
 * Toggle flashlight/torch if supported by hardware track
 */
export async function toggleTorch(stream: MediaStream | null, enable: boolean): Promise<boolean> {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
    if (capabilities.torch) {
      await (track as any).applyConstraints({
        advanced: [{ torch: enable }],
      });
      return true;
    }
  } catch (e) {
    console.warn('Torch constraint toggle not supported:', e);
  }
  return false;
}

/**
 * Parses raw barcode text (JSON QR, GS1-128, or raw identifier)
 */
export function parseBarcodeText(rawText: string, format = 'BARCODE'): ScannedMedicineData {
  const trimmed = rawText.trim();

  // 1. Check if it's a JSON payload (frequently used in Pharma QR codes)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        rawText: trimmed,
        format: format || 'QR_CODE',
        medicine: parsed.medicine || parsed.name || parsed.productName,
        batch: parsed.batch || parsed.batchNo || parsed.lot,
        expiry: parsed.expiry || parsed.expDate,
        quantity: Number(parsed.quantity || parsed.qty) || undefined,
        supplier: parsed.supplier || parsed.distributor,
        unitPrice: Number(parsed.unitPrice || parsed.price || parsed.mrp) || undefined,
        barcode: parsed.barcode || parsed.gtin || trimmed,
      };
    } catch {
      // not JSON, fallback to regex / standard format
    }
  }

  // 2. Check for GS1-128 AI (Application Identifiers) like (01)GTIN(17)YYMMDD(10)BATCH
  const hasGs1Parentheses = /\((01|10|17|21)\)/.test(trimmed);
  const startsWithGs1Gtin = /^01\d{14}/.test(trimmed);

  if (hasGs1Parentheses || startsWithGs1Gtin) {
    const gs1Gtin = trimmed.match(/\(01\)(\d{14}|\d{13}|\d{12})/i) || trimmed.match(/^01(\d{14})/);
    const gs1Expiry = trimmed.match(/\(17\)(\d{6})/i) || (startsWithGs1Gtin ? trimmed.match(/(?:^01\d{14})17(\d{6})/) : null);
    const gs1Batch = trimmed.match(/\(10\)([A-Z0-9_-]+)/i) || (startsWithGs1Gtin ? trimmed.match(/(?:^01\d{14}(?:17\d{6})?)10([A-Z0-9_-]+)/) : null);

    if (gs1Gtin || gs1Batch || gs1Expiry) {
      let expFormatted: string | undefined;
      if (gs1Expiry && gs1Expiry[1]) {
        const expRaw = gs1Expiry[1];
        const yy = expRaw.slice(0, 2);
        const mm = expRaw.slice(2, 4);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[parseInt(mm, 10) - 1] || 'Dec';
        expFormatted = `${monthName} 20${yy}`;
      }

      return {
        rawText: trimmed,
        format: 'GS1_128',
        barcode: gs1Gtin ? gs1Gtin[1] : trimmed,
        batch: gs1Batch ? gs1Batch[1].toUpperCase() : undefined,
        expiry: expFormatted,
      };
    }
  }

  // 3. Standard 1D/2D barcode or batch code
  return {
    rawText: trimmed,
    format,
    barcode: trimmed,
    batch: trimmed.length <= 10 && /^[A-Z0-9-]+$/i.test(trimmed) ? trimmed.toUpperCase() : undefined,
  };
}

/**
 * Scans a single frame from video element using Native BarcodeDetector or ZXing
 */
export async function scanFrame(
  videoElement: HTMLVideoElement,
  barcodeDetectorInstance?: any
): Promise<ScannedMedicineData | null> {
  if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
    return null;
  }

  // Engine 1: Native BarcodeDetector (high-performance hardware-accelerated)
  if (barcodeDetectorInstance) {
    try {
      const barcodes = await barcodeDetectorInstance.detect(videoElement);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        const item = barcodes[0];
        return parseBarcodeText(item.rawValue, item.format || 'BARCODE');
      }
    } catch {
      // Fallback to ZXing
    }
  }

  // Engine 2: ZXing MultiFormatReader direct pixel decoding
  try {
    const reader = getZxingReader();
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const luminanceSource = new RGBLuminanceSource(
        imageData.data,
        imageData.width,
        imageData.height
      );
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const result = reader.decode(binaryBitmap);
      if (result && result.getText()) {
        const formatName = result.getBarcodeFormat() !== undefined ? BarcodeFormat[result.getBarcodeFormat()] : 'BARCODE';
        return parseBarcodeText(result.getText(), formatName);
      }
    }
  } catch (zxingErr: unknown) {
    // NotFoundException is normal when no barcode is in current frame
  }

  return null;
}
