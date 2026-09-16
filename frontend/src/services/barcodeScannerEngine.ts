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

// Strict pharmaceutical & retail barcode formats.
// CRITICAL: CODABAR is explicitly EXCLUDED to eliminate false-positive noise (e.g. 'D9D').
export const ALLOWED_BARCODE_FORMATS = [
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

// Configure ZXing decoding hints with TRY_HARDER and strictly filtered formats
const zxingHints = new Map<DecodeHintType, any>();
zxingHints.set(DecodeHintType.POSSIBLE_FORMATS, ALLOWED_BARCODE_FORMATS);
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
 * Standard Modulo-10 Checksum calculation for EAN-13, EAN-8, and UPC-A.
 */
export function validateModulo10Checksum(digits: string, oddWeight: number, evenWeight: number): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len - 1; i++) {
    const weight = i % 2 === 0 ? oddWeight : evenWeight;
    sum += parseInt(digits[i], 10) * weight;
  }
  const expectedCheck = (10 - (sum % 10)) % 10;
  return expectedCheck === parseInt(digits[len - 1], 10);
}

/**
 * Validates candidate barcode against strict format & length rules.
 * Rejects CODABAR and false-positive fragments.
 */
export function validateBarcodeCandidate(rawCode: string, formatName: string): { valid: boolean; reason?: string } {
  const clean = normalizeBarcode(rawCode);
  if (!clean) return { valid: false, reason: 'Empty code' };

  const fmt = (formatName || '').toUpperCase();

  // 1. Explicitly reject CODABAR
  if (fmt.includes('CODABAR') || fmt.includes('CODA_BAR')) {
    return { valid: false, reason: 'CODABAR format disallowed (unreliable for pharma inventory)' };
  }

  // 2. Reject short noise fragments (< 3 characters for 1D barcodes)
  if (clean.length < 3 && !fmt.includes('QR')) {
    return { valid: false, reason: 'Too short to be a valid barcode' };
  }

  // 3. EAN-13 Validation
  if (fmt.includes('EAN_13') || fmt.includes('EAN13')) {
    if (!/^\d{13}$/.test(clean)) {
      return { valid: false, reason: `EAN-13 must be exactly 13 digits (got ${clean.length})` };
    }
    // Modulo 10 with weights 1, 3
    const isValidChecksum = validateModulo10Checksum(clean, 1, 3);
    if (!isValidChecksum) {
      return { valid: false, reason: 'EAN-13 checksum validation failed' };
    }
  }

  // 4. EAN-8 Validation
  if (fmt.includes('EAN_8') || fmt.includes('EAN8')) {
    if (!/^\d{8}$/.test(clean)) {
      return { valid: false, reason: `EAN-8 must be exactly 8 digits (got ${clean.length})` };
    }
    const isValidChecksum = validateModulo10Checksum(clean, 3, 1);
    if (!isValidChecksum) {
      return { valid: false, reason: 'EAN-8 checksum validation failed' };
    }
  }

  // 5. UPC-A Validation
  if (fmt.includes('UPC_A') || fmt.includes('UPCA')) {
    if (!/^\d{12}$/.test(clean)) {
      return { valid: false, reason: `UPC-A must be exactly 12 digits (got ${clean.length})` };
    }
    const isValidChecksum = validateModulo10Checksum(clean, 3, 1);
    if (!isValidChecksum) {
      return { valid: false, reason: 'UPC-A checksum validation failed' };
    }
  }

  // 6. UPC-E Validation
  if (fmt.includes('UPC_E') || fmt.includes('UPCE')) {
    if (!/^\d{6,8}$/.test(clean)) {
      return { valid: false, reason: 'UPC-E must be 6 to 8 digits' };
    }
  }

  // 7. Code 128 / Code 39 Validation
  if (fmt.includes('CODE_128') || fmt.includes('CODE128') || fmt.includes('CODE_39') || fmt.includes('CODE39')) {
    if (clean.length < 3) {
      return { valid: false, reason: 'Code 128/39 must have at least 3 characters' };
    }
    // Disallow pure noise patterns
    if (/^[A-D]\d[A-D]$/i.test(clean)) {
      return { valid: false, reason: 'False positive delimiter pattern rejected' };
    }
  }

  return { valid: true };
}

/**
 * Initializes camera stream with requested constraints, continuous autofocus, and resilient fallback.
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
  if (track) {
    try {
      const capabilities = (track.getCapabilities?.() || {}) as any;
      if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
        await (track as any).applyConstraints({
          advanced: [{ focusMode: 'continuous' }],
        });
        console.log('[Scanner] Continuous autofocus enabled');
      }
    } catch (focusErr) {
      console.warn('[Scanner] Autofocus notice:', focusErr);
    }
  }

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
 * Starts continuous frame scanning with:
 * 1. Allowed format restrictions (CODABAR excluded)
 * 2. Multi-pass frame analysis (Center Crop + Full Frame)
 * 3. Format & Checksum candidate validation
 * 4. Multi-frame stability debounce (requires 2 consistent detections within 500ms)
 */
export function startContinuousScanner(
  videoElement: HTMLVideoElement,
  onDetected: (data: ScannedMedicineData) => void,
  onCandidateFeedback?: (feedback: { code: string; format: string; status: 'VALIDATING' | 'INVALID'; reason?: string }) => void
): ContinuousScannerSession {
  let isStopped = false;
  let isLocked = false;
  let animationFrameId: number | null = null;
  let scanIntervalId: any = null;

  console.log(`[Scanner] Decoder initialized`);
  console.log(`[Scanner] Formats enabled: QR_CODE, EAN_13, EAN_8, UPC_A, UPC_E, CODE_128, CODE_39, DATA_MATRIX, ITF (CODABAR DISABLED)`);

  const zxingReader = new MultiFormatReader();
  zxingReader.setHints(zxingHints);

  // Candidate stability tracking (sliding window debounce)
  let candidateCode: string = '';
  let candidateFormat: string = '';
  let candidateCount: number = 0;
  let candidateFirstSeen: number = 0;

  // Reusable offscreen canvas elements
  const fullCanvas = document.createElement('canvas');
  const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

  const handleFrameCandidate = (rawText: string, formatName: string) => {
    if (isStopped || isLocked) return;
    const clean = normalizeBarcode(rawText);
    if (!clean) return;

    console.log(`[Scanner] Candidate detected: ${clean} (Format: ${formatName})`);

    // Step 1: Format & Checksum Validation
    const validation = validateBarcodeCandidate(clean, formatName);
    if (!validation.valid) {
      console.log(`[Scanner] Validation: FAILED (${validation.reason})`);
      onCandidateFeedback?.({ code: clean, format: formatName, status: 'INVALID', reason: validation.reason });
      return;
    }

    console.log(`[Scanner] Validation: PASSED`);

    const now = performance.now();

    // Step 2: Multi-frame stability check (Require 2 consistent detections within 500ms)
    // QR codes with rich JSON/GS1 payloads can be accepted on single strong frame
    const isQrOrGs1 = formatName.includes('QR') || formatName.includes('MATRIX') || clean.startsWith('{') || clean.includes('(01)');

    if (candidateCode === clean && (now - candidateFirstSeen < 600)) {
      candidateCount++;
    } else {
      candidateCode = clean;
      candidateFormat = formatName;
      candidateCount = 1;
      candidateFirstSeen = now;
      onCandidateFeedback?.({ code: clean, format: formatName, status: 'VALIDATING' });
    }

    // Accept immediately for complex 2D QR/GS1, or upon 2 consecutive stable frames for 1D retail barcodes
    if (candidateCount >= 2 || isQrOrGs1) {
      isLocked = true;
      isStopped = true;

      console.log(`[Scanner] Accepted barcode: ${clean} (Format: ${formatName})`);

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
    }
  };

  // Safe Native BarcodeDetector initialization (CODABAR excluded)
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
            formats = formats.filter(f => supported.includes(f) && !f.includes('codabar'));
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
          handleFrameCandidate(res.getText(), fmtName);
          return true;
        }
      } catch {}

      // Pass 2: HybridBinarizer (Best for 2D matrix / QR codes)
      try {
        const hybridBitmap = new BinaryBitmap(new HybridBinarizer(source));
        const res = zxingReader.decodeWithState(hybridBitmap);
        if (res && res.getText()) {
          const fmtName = res.getBarcodeFormat() !== undefined ? BarcodeFormat[res.getBarcodeFormat()] : 'BARCODE';
          handleFrameCandidate(res.getText(), fmtName);
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
          handleFrameCandidate(res.getText(), fmtName);
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
    // Throttle to every ~75ms (~13 FPS)
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
            handleFrameCandidate(item.rawValue, item.format || 'BARCODE');
            isScanningFrame = false;
            return;
          }
        } catch {}
      }

      // 2. Central Viewfinder Crop Pass (75% width, 55% height centered)
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
