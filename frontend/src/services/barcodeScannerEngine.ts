import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
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
  productCode?: string;
}

export interface CameraInfo {
  stream: MediaStream;
  trackLabel: string;
  resolution: string;
  isBackFacing: boolean;
}

// Supported barcode formats for retail & pharmacy packaging.
// Note: CODABAR is removed to prevent false detections from random bar patterns.
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

// Configure decoding hints
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
hints.set(DecodeHintType.TRY_HARDER, true);

/**
 * Normalizes scanned or entered barcode values.
 * - Trims whitespace
 * - Removes line breaks
 * - Preserves leading zeros (e.g. '0890103400101' stays '0890103400101')
 * - Preserves letters and hyphens (e.g. 'AMX-26017', 'PCT101')
 * - Always handles barcode strictly as STRING
 */
export function normalizeBarcode(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/[\r\n\t]+/g, '')
    .trim();
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

  // Assign stream to video and await play
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

  console.log(`[Scanner] Camera ready`);
  console.log(`[Scanner] Video: ${width}x${height}`);

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
  const trimmed = normalizeBarcode(rawText);

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
        barcode: normalizeBarcode(parsed.barcode || parsed.gtin || trimmed),
        productCode: parsed.productCode,
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
        barcode: normalizeBarcode(gs1Gtin ? gs1Gtin[1] : trimmed),
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
    productCode: trimmed.length <= 10 && /^[A-Z0-9-]+$/i.test(trimmed) ? trimmed.toUpperCase() : undefined,
  };
}

export interface ContinuousScannerSession {
  reader: BrowserMultiFormatReader;
  stop: () => void;
}

/**
 * Starts continuous frame scanning using ZXing BrowserMultiFormatReader.
 * Restores previous stable decoder behavior with CODABAR excluded.
 */
export function startContinuousScanner(
  videoElement: HTMLVideoElement,
  onDetected: (data: ScannedMedicineData) => void
): ContinuousScannerSession {
  let isStopped = false;
  let isLocked = false;
  const reader = new BrowserMultiFormatReader(hints, 80);

  console.log(`[Scanner] Decoder initialized`);
  console.log(`[Scanner] Scan loop started`);

  const handleDetection = (rawText: string, formatName: string) => {
    if (isStopped || isLocked) return;
    const clean = normalizeBarcode(rawText);
    if (!clean) return;

    isLocked = true;
    isStopped = true;

    console.log(`[Scanner] Detected: ${clean}`);
    console.log(`[Scanner] Format: ${formatName}`);

    try {
      reader.reset();
    } catch {}

    const parsed = parseBarcodeText(clean, formatName);
    onDetected(parsed);
  };

  // ZXing Browser Continuous Decoder
  try {
    reader.decodeFromVideoElementContinuously(videoElement, (result, error) => {
      if (isStopped || isLocked) return;
      if (result) {
        const text = result.getText();
        if (text) {
          const fmt = result.getBarcodeFormat() !== undefined
            ? BarcodeFormat[result.getBarcodeFormat()]
            : 'BARCODE';
          handleDetection(text, fmt);
        }
      }
    });
  } catch (readerErr) {
    console.warn('ZXing decodeFromVideoElementContinuously init notice:', readerErr);
  }

  return {
    reader,
    stop: () => {
      isStopped = true;
      isLocked = true;
      try {
        reader.reset();
      } catch {}
    },
  };
}
