import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
  InvertedLuminanceSource,
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

// Full suite of pharmaceutical & retail barcode formats
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
  BarcodeFormat.CODABAR,
];

// Configure ZXing decoding hints with TRY_HARDER
const zxingHints = new Map<DecodeHintType, any>();
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
zxingHints.set(DecodeHintType.TRY_HARDER, true);

/**
 * Normalizes scanned or entered barcode values.
 * - Trims whitespace
 * - Removes line breaks
 * - Preserves leading zeros (e.g. '0890103400101' stays '0890103400101')
 * - Preserves letters and hyphens (e.g. 'AMX-26017', 'PCT101')
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
    batch: trimmed.length <= 10 && /^[A-Z0-9-]+$/i.test(trimmed) ? trimmed.toUpperCase() : undefined,
  };
}

export interface ContinuousScannerSession {
  stop: () => void;
}

/**
 * Starts continuous frame scanning on the active live video element.
 * Multi-Engine Architecture:
 * 1. Native BarcodeDetector with verified supported format list (hardware accelerated on Android/Chrome)
 * 2. High-Performance Multi-Pass ZXing MultiFormatReader:
 *    - Central Viewfinder Crop (high density 1D line sampling for retail/EAN barcodes)
 *    - Full Frame (for large 2D QR codes)
 *    - Dual Binarization: GlobalHistogramBinarizer (1D retail) + HybridBinarizer (2D QR) + Inverted Binarizer
 */
export function startContinuousScanner(
  videoElement: HTMLVideoElement,
  onDetected: (data: ScannedMedicineData) => void
): ContinuousScannerSession {
  let isStopped = false;
  let isLocked = false;
  let animationFrameId: number | null = null;
  let scanIntervalId: any = null;

  console.log(`[Scanner] Decoder initialized`);

  const zxingReader = new MultiFormatReader();
  zxingReader.setHints(zxingHints);

  // Reusable offscreen canvas elements
  const fullCanvas = document.createElement('canvas');
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

  const handleDetection = (rawText: string, formatName: string) => {
    if (isStopped || isLocked) return;
    const clean = normalizeBarcode(rawText);
    if (!clean) return;

    isLocked = true;
    isStopped = true;

    console.log(`[Scanner] Detected: ${clean}`);
    console.log(`[Scanner] Format: ${formatName}`);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (scanIntervalId) {
      clearInterval(scanIntervalId);
      scanIntervalId = null;
    }

    try {
      zxingReader.reset();
    } catch {}

    const parsed = parseBarcodeText(clean, formatName);
    onDetected(parsed);
  };

  // Safe Native BarcodeDetector initialization
  let nativeDetector: any = null;
  (async () => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        let formats: string[] = [
          'qr_code',
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'data_matrix',
          'itf',
        ];

        if (typeof (window as any).BarcodeDetector.getSupportedFormats === 'function') {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats();
          if (Array.isArray(supported) && supported.length > 0) {
            formats = formats.filter(f => supported.includes(f));
          }
        }

        if (formats.length > 0) {
          nativeDetector = new (window as any).BarcodeDetector({ formats });
        }
      } catch (nativeErr) {
        console.warn('Native BarcodeDetector initialization skipped:', nativeErr);
      }
    }
  })();

  // Multi-pass frame decode attempt on a given canvas
  const tryDecodeCanvas = (canvas: HTMLCanvasElement): boolean => {
    if (!canvas.width || !canvas.height) return false;

    try {
      const source = new HTMLCanvasElementLuminanceSource(canvas);

      // Pass 1: GlobalHistogramBinarizer (Best for 1D retail barcodes like EAN-13, EAN-8, UPC, Code 128)
      try {
        const globalBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(source));
        const res = zxingReader.decodeWithState(globalBitmap);
        if (res && res.getText()) {
          const fmtName = res.getBarcodeFormat() !== undefined ? BarcodeFormat[res.getBarcodeFormat()] : 'BARCODE';
          handleDetection(res.getText(), fmtName);
          return true;
        }
      } catch {}

      // Pass 2: HybridBinarizer (Best for 2D matrix / QR codes)
      try {
        const hybridBitmap = new BinaryBitmap(new HybridBinarizer(source));
        const res = zxingReader.decodeWithState(hybridBitmap);
        if (res && res.getText()) {
          const fmtName = res.getBarcodeFormat() !== undefined ? BarcodeFormat[res.getBarcodeFormat()] : 'BARCODE';
          handleDetection(res.getText(), fmtName);
          return true;
        }
      } catch {}

      // Pass 3: Inverted luminance (for dark/reflective packaging)
      try {
        const invertedSource = new InvertedLuminanceSource(source);
        const invBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(invertedSource));
        const res = zxingReader.decodeWithState(invBitmap);
        if (res && res.getText()) {
          const fmtName = res.getBarcodeFormat() !== undefined ? BarcodeFormat[res.getBarcodeFormat()] : 'BARCODE';
          handleDetection(res.getText(), fmtName);
          return true;
        }
      } catch {}
    } catch {
      // no barcode in frame
    }
    return false;
  };

  let isScanningFrame = false;
  let lastScanTime = 0;

  const processFrame = async () => {
    if (isStopped || isLocked || isScanningFrame) return;

    // Verify video element is ready with dimensions
    if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return;
    }

    const now = performance.now();
    // Throttle to every ~75ms (~13 FPS) for optimal CPU performance & responsiveness
    if (now - lastScanTime < 75) return;
    lastScanTime = now;

    isScanningFrame = true;

    try {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;

      // 1. Try Native BarcodeDetector directly on video if available
      if (nativeDetector) {
        try {
          const barcodes = await nativeDetector.detect(videoElement);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const item = barcodes[0];
            handleDetection(item.rawValue, item.format || 'BARCODE');
            isScanningFrame = false;
            return;
          }
        } catch {}
      }

      // 2. Central Viewfinder Crop Pass (75% width, 55% height centered)
      // This magnifies 1D barcode lines in the alignment frame for instant recognition
      const cropW = Math.round(vw * 0.75);
      const cropH = Math.round(vh * 0.55);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      if (cropCtx) {
        if (cropCanvas.width !== cropW || cropCanvas.height !== cropH) {
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
        }
        cropCtx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        if (tryDecodeCanvas(cropCanvas)) {
          isScanningFrame = false;
          return;
        }
      }

      // 3. Full Frame Pass (scaled to 720p or original)
      if (fullCtx) {
        const targetW = vw > 1280 ? 1280 : vw;
        const targetH = Math.round((vh / vw) * targetW);

        if (fullCanvas.width !== targetW || fullCanvas.height !== targetH) {
          fullCanvas.width = targetW;
          fullCanvas.height = targetH;
        }
        fullCtx.drawImage(videoElement, 0, 0, targetW, targetH);
        if (tryDecodeCanvas(fullCanvas)) {
          isScanningFrame = false;
          return;
        }
      }
    } catch (err) {
      // non-fatal frame decode cycle catch
    } finally {
      isScanningFrame = false;
    }
  };

  // Continuous loop using requestAnimationFrame + interval fallback
  const scanLoop = () => {
    if (isStopped || isLocked) return;
    processFrame();
    animationFrameId = requestAnimationFrame(scanLoop);
  };

  console.log(`[Scanner] Scan loop started`);
  animationFrameId = requestAnimationFrame(scanLoop);
  scanIntervalId = setInterval(processFrame, 90);

  return {
    stop: () => {
      isStopped = true;
      isLocked = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (scanIntervalId) {
        clearInterval(scanIntervalId);
        scanIntervalId = null;
      }
      try {
        zxingReader.reset();
      } catch {}
    },
  };
}
