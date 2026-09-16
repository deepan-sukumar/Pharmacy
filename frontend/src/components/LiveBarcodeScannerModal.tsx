import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  X,
  Zap,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  Calendar,
  Building2,
  DollarSign,
  Search,
  Sparkles,
  RefreshCw,
  Info,
  ScanLine,
  XCircle,
} from 'lucide-react';
import {
  startCameraStream,
  stopCameraStream,
  toggleTorch,
  startContinuousScanner,
  normalizeBarcode,
  ScannerStatus,
  ScannedMedicineData,
  ContinuousScannerSession,
} from '../services/barcodeScannerEngine';
import { api } from '../services/api';

export interface ScannedMedicinePayload {
  medicine: string;
  batch: string;
  expiry: string;
  quantity: number;
  supplier: string;
  unitPrice?: number;
  barcode?: string;
  productCode?: string;
}

interface LiveBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scanned: ScannedMedicinePayload) => void;
  title?: string;
  subtitle?: string;
}

export const LiveBarcodeScannerModal: React.FC<LiveBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Medicine Barcode / QR Scanner',
  subtitle = 'Point camera at package barcode, strip QR code, or lookup code in database',
}) => {
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerSessionRef = useRef<ContinuousScannerSession | null>(null);

  const [status, setStatus] = useState<ScannerStatus>('INITIALIZING');
  const [cameraLabel, setCameraLabel] = useState<string>('');
  const [resolution, setResolution] = useState<string>('');
  const [flashlight, setFlashlight] = useState<boolean>(false);
  const [isSlowFeed, setIsSlowFeed] = useState<boolean>(false);

  // Candidate frame feedback
  const [candidateNotice, setCandidateNotice] = useState<string | null>(null);

  // Scanned / Lookup state
  const [detectedResult, setDetectedResult] = useState<ScannedMedicineData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupMessage, setLookupMessage] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isFoundInDb, setIsFoundInDb] = useState<boolean | null>(null);

  // Pharmacist verification form fields
  const [verifyForm, setVerifyForm] = useState<{
    medicine: string;
    batch: string;
    expiry: string;
    quantity: number;
    supplier: string;
    unitPrice: number;
    barcode: string;
    productCode: string;
  }>({
    medicine: '',
    batch: '',
    expiry: '',
    quantity: 100,
    supplier: 'ABC Pharma',
    unitPrice: 45,
    barcode: '',
    productCode: '',
  });

  // Manual search input state
  const [customCode, setCustomCode] = useState<string>('');
  const [manualSearching, setManualSearching] = useState<boolean>(false);

  const sampleBarcodes = [
    {
      label: 'PCT101 · Paracetamol 500mg',
      code: '890103400101',
      fallbackData: {
        medicine: 'Paracetamol 500mg',
        batch: 'PCT101',
        expiry: 'Sep 2026',
        quantity: 150,
        supplier: 'ABC Pharma',
        unitPrice: 25,
        barcode: '890103400101',
      },
    },
    {
      label: 'VD102 · Vitamin D3 60K',
      code: '890103400102',
      fallbackData: {
        medicine: 'Vitamin D3 60K',
        batch: 'VD102',
        expiry: 'Sep 2026',
        quantity: 180,
        supplier: 'HealthCare Labs',
        unitPrice: 65,
        barcode: '890103400102',
      },
    },
    {
      label: 'CTZ302 · Cetirizine 10mg',
      code: '890103400104',
      fallbackData: {
        medicine: 'Cetirizine 10mg',
        batch: 'CTZ302',
        expiry: 'Jan 2027',
        quantity: 300,
        supplier: 'Nova Pharma',
        unitPrice: 35,
        barcode: '890103400104',
      },
    },
    {
      label: 'MET624 · Metformin 500mg',
      code: '890103400106',
      fallbackData: {
        medicine: 'Metformin 500mg',
        batch: 'MET624',
        expiry: 'Feb 2028',
        quantity: 200,
        supplier: 'ABC Pharma',
        unitPrice: 45,
        barcode: '890103400106',
      },
    },
  ];

  // Camera cleanup helper
  const cleanupScanner = useCallback(() => {
    if (scannerSessionRef.current) {
      try {
        scannerSessionRef.current.stop();
      } catch {}
      scannerSessionRef.current = null;
    }
    stopCameraStream(videoRef.current, streamRef.current);
    streamRef.current = null;
    setFlashlight(false);
  }, []);

  // Shared single medicine lookup function (camera detection, manual input, and presets)
  const executeMedicineLookup = useCallback(async (scanned: ScannedMedicineData) => {
    const rawSearch = scanned.barcode || scanned.rawText;
    const searchCode = normalizeBarcode(rawSearch);
    if (!searchCode) return;

    console.log(`[Lookup] Searching: ${searchCode}`);
    console.log(`[Lookup] Request started`);

    setIsLookingUp(true);
    setLookupError(null);
    setLookupMessage(`Looking up barcode [${searchCode}] in inventory database...`);

    // Ensure scroll to top of modal so result banner is immediately visible
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    try {
      const res = await api.lookupBarcode(searchCode);
      console.log(`[Lookup] Response: 200 OK`);
      setIsLookingUp(false);

      if (res && res.found && res.medicine) {
        console.log(`[Lookup] Result: found (${res.medicine.medicine || res.medicine.medicineName})`);
        setIsFoundInDb(true);
        const med = res.medicine;
        setLookupMessage(`Medicine Found: ${med.medicine || med.medicineName || searchCode}`);
        setVerifyForm({
          medicine: med.medicine || med.medicineName || scanned.medicine || `Product (${searchCode})`,
          // Only use batch & expiry if explicitly provided in scanned QR/GS1 payload or existing stock
          batch: scanned.batch || med.batch || med.batchNumber || '',
          expiry: scanned.expiry || med.expiry || med.expiryDate || '',
          quantity: scanned.quantity || med.quantity || 100,
          supplier: med.supplier || scanned.supplier || 'ABC Pharma',
          unitPrice: med.unitPrice || scanned.unitPrice || 45,
          barcode: searchCode,
          productCode: med.productCode || searchCode,
        });
      } else {
        console.log(`[Lookup] Result: not found in Firestore`);
        setIsFoundInDb(false);
        setLookupMessage(`Barcode Not Found: No medicine matches code [${searchCode}] in current inventory.`);
        setVerifyForm({
          medicine: scanned.medicine || '',
          batch: scanned.batch || '',
          expiry: scanned.expiry || '',
          quantity: scanned.quantity || 100,
          supplier: scanned.supplier || 'ABC Pharma',
          unitPrice: scanned.unitPrice || 45,
          barcode: searchCode,
          productCode: searchCode,
        });
      }
    } catch (err: any) {
      console.error(`[Lookup] Request failed:`, err);
      console.log(`[Lookup] Result: error (${err?.message || 'Network/Server Error'})`);
      setIsLookingUp(false);
      setIsFoundInDb(false);
      setLookupError(err?.message || 'Lookup request failed. Check server connection.');
      setLookupMessage(`Lookup Failed: Could not query database for code [${searchCode}].`);
      setVerifyForm({
        medicine: scanned.medicine || '',
        batch: scanned.batch || '',
        expiry: scanned.expiry || '',
        quantity: scanned.quantity || 100,
        supplier: 'ABC Pharma',
        unitPrice: 45,
        barcode: searchCode,
        productCode: searchCode,
      });
    }
  }, []);

  // Camera start & scanner launch handler
  const initCameraAndScanner = useCallback(async () => {
    if (!videoRef.current) return;

    cleanupScanner();
    setStatus('INITIALIZING');
    setIsSlowFeed(false);
    setCandidateNotice(null);

    try {
      const info = await startCameraStream(videoRef.current);
      streamRef.current = info.stream;
      setCameraLabel(info.trackLabel);
      setResolution(info.resolution);
      setStatus('SCANNING');

      // Diagnostic timer: check if video readyState advances
      setTimeout(() => {
        if (videoRef.current && videoRef.current.readyState < 2) {
          setIsSlowFeed(true);
        }
      }, 2500);

      // Launch continuous multi-engine frame decoder with candidate feedback
      scannerSessionRef.current = startContinuousScanner(
        videoRef.current,
        (scannedData) => {
          // Stop active camera stream when a validated stable barcode is detected
          cleanupScanner();
          setDetectedResult(scannedData);
          setCandidateNotice(null);
          executeMedicineLookup(scannedData);
        },
        (feedback) => {
          if (feedback.status === 'VALIDATING') {
            setCandidateNotice(`Candidate detected: ${feedback.code} (${feedback.format}) · Validating stability...`);
          } else if (feedback.status === 'INVALID') {
            setCandidateNotice(`Unreliable pattern rejected (${feedback.reason || 'invalid format'}). Keep barcode horizontal.`);
          }
        }
      );
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      const msg = err?.message || '';
      if (msg === 'PERMISSION_DENIED') {
        setStatus('PERMISSION_DENIED');
      } else if (msg === 'UNAVAILABLE') {
        setStatus('UNAVAILABLE');
      } else if (msg === 'IN_USE') {
        setStatus('IN_USE');
      } else if (msg === 'NOT_SUPPORTED') {
        setStatus('NOT_SUPPORTED');
      } else {
        setStatus('ERROR');
      }
    }
  }, [cleanupScanner, executeMedicineLookup]);

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setDetectedResult(null);
      setIsFoundInDb(null);
      setLookupMessage('');
      setLookupError(null);
      setCustomCode('');
      setCandidateNotice(null);
      const timer = setTimeout(() => {
        initCameraAndScanner();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      cleanupScanner();
      setDetectedResult(null);
      setIsFoundInDb(null);
      setLookupMessage('');
      setLookupError(null);
      setCandidateNotice(null);
    }
  }, [isOpen, initCameraAndScanner, cleanupScanner]);

  // Handle Flashlight toggle
  const handleToggleTorch = async () => {
    const next = !flashlight;
    setFlashlight(next);
    await toggleTorch(streamRef.current, next);
  };

  // Reset and rescan
  const handleRescan = () => {
    setDetectedResult(null);
    setIsFoundInDb(null);
    setLookupMessage('');
    setLookupError(null);
    setCandidateNotice(null);
    initCameraAndScanner();
  };

  // Confirm verification and submit to parent
  const handleConfirmVerification = () => {
    onScan({
      medicine: verifyForm.medicine.trim() || `Medicine (${verifyForm.barcode || 'Unknown'})`,
      batch: verifyForm.batch.trim().toUpperCase() || `BTH${Math.floor(100 + Math.random() * 900)}`,
      expiry: verifyForm.expiry.trim() || 'Dec 2027',
      quantity: Number(verifyForm.quantity) || 1,
      supplier: verifyForm.supplier.trim() || 'ABC Pharma',
      unitPrice: Number(verifyForm.unitPrice) || 45,
      barcode: verifyForm.barcode.trim(),
      productCode: verifyForm.productCode.trim(),
    });
    onClose();
  };

  // Handle manual code lookup (works seamlessly with or without active camera)
  const handleManualLookup = async () => {
    const code = normalizeBarcode(customCode);
    if (!code || manualSearching) return;

    setManualSearching(true);
    // Stop camera if running
    cleanupScanner();

    const scanned: ScannedMedicineData = {
      rawText: code,
      format: 'MANUAL_ENTRY',
      barcode: code,
    };
    setDetectedResult(scanned);

    await executeMedicineLookup(scanned);
    setManualSearching(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 12, 10, 0.82)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      <div
        ref={modalScrollRef}
        className="card animate-scale-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 580,
          maxHeight: '94vh',
          background: '#141815',
          color: '#FFFFFF',
          borderRadius: 22,
          border: '1px solid rgba(255, 255, 255, 0.14)',
          overflowY: 'auto',
          zIndex: 121,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(74, 222, 128, 0.1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#181E19',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              }}
            >
              <QrCode size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  {title}
                </h3>
                {status === 'SCANNING' && !detectedResult && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#4ADE80',
                      background: 'rgba(74, 222, 128, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#4ADE80',
                        display: 'inline-block',
                      }}
                    />
                    SCANNING ACTIVE
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11.5, color: '#9CAE98', marginTop: 2 }}>{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{
              padding: '6px 12px',
              color: '#FFFFFF',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <X size={15} /> Close
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 22 }}>
          {/* CAMERA FEED OR VERIFICATION VIEW */}
          {!detectedResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Video Preview Viewport */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 440,
                  height: 260,
                  background: '#070908',
                  borderRadius: 18,
                  border:
                    status === 'SCANNING'
                      ? '2px solid rgba(74, 222, 128, 0.5)'
                      : '2px solid rgba(255, 255, 255, 0.15)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.9)',
                }}
              >
                {/* VIDEO ELEMENT ALWAYS PRESENT IN DOM */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />

                {/* Laser animation and corner guides when scanning */}
                {status === 'SCANNING' && (
                  <>
                    <div className="scanner-laser-line" />

                    {/* Corner Target Markers */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 25,
                        left: 28,
                        width: 32,
                        height: 32,
                        borderTop: '3.5px solid #4ADE80',
                        borderLeft: '3.5px solid #4ADE80',
                        borderRadius: '6px 0 0 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 25,
                        right: 28,
                        width: 32,
                        height: 32,
                        borderTop: '3.5px solid #4ADE80',
                        borderRight: '3.5px solid #4ADE80',
                        borderRadius: '0 6px 0 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 25,
                        left: 28,
                        width: 32,
                        height: 32,
                        borderBottom: '3.5px solid #4ADE80',
                        borderLeft: '3.5px solid #4ADE80',
                        borderRadius: '0 0 0 6px',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 25,
                        right: 28,
                        width: 32,
                        height: 32,
                        borderBottom: '3.5px solid #4ADE80',
                        borderRight: '3.5px solid #4ADE80',
                        borderRadius: '0 0 6px 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />

                    {/* Horizontal Alignment Target Guideline */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '15%',
                        right: '15%',
                        height: 1,
                        background: 'rgba(74, 222, 128, 0.25)',
                        borderTop: '1px dashed rgba(74, 222, 128, 0.6)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Top Guide Text */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 12px',
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#E5E5E0',
                        letterSpacing: '0.04em',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ScanLine size={12} color="#4ADE80" />
                      KEEP BARCODE HORIZONTAL INSIDE FRAME
                    </div>
                  </>
                )}

                {/* State overlays */}
                {status === 'INITIALIZING' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10, 14, 11, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      textAlign: 'center',
                    }}
                  >
                    <RotateCw size={32} color="#4ADE80" className="animate-spin" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Initializing camera...</p>
                    <p style={{ fontSize: 11, color: '#A3B19B', marginTop: 4 }}>
                      Configuring video stream & real-time barcode detector
                    </p>
                  </div>
                )}

                {status === 'PERMISSION_DENIED' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(25, 10, 10, 0.92)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    <AlertTriangle size={34} color="#EF4444" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#FCA5A5' }}>
                      Camera permission denied
                    </p>
                    <p style={{ fontSize: 11.5, color: '#E5E5E0', marginTop: 4, maxWidth: 300 }}>
                      Please click the camera lock icon in your browser address bar and choose "Allow".
                    </p>
                    <button
                      onClick={initCameraAndScanner}
                      className="btn btn-secondary"
                      style={{ marginTop: 14, fontSize: 12, padding: '6px 14px' }}
                    >
                      <RefreshCw size={13} /> Retry Camera
                    </button>
                  </div>
                )}

                {status === 'UNAVAILABLE' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(20, 18, 12, 0.92)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    <Camera size={34} color="#FBBF24" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#FDE68A' }}>Camera unavailable</p>
                    <p style={{ fontSize: 11.5, color: '#E5E5E0', marginTop: 4, maxWidth: 320 }}>
                      No video input device detected on this system. You can use Quick Presets or manual lookup
                      below.
                    </p>
                    <button
                      onClick={initCameraAndScanner}
                      className="btn btn-secondary"
                      style={{ marginTop: 14, fontSize: 12, padding: '6px 14px' }}
                    >
                      <RefreshCw size={13} /> Retry Detection
                    </button>
                  </div>
                )}

                {status === 'IN_USE' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(25, 10, 10, 0.92)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    <AlertTriangle size={34} color="#EF4444" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#FCA5A5' }}>Camera already in use</p>
                    <p style={{ fontSize: 11.5, color: '#E5E5E0', marginTop: 4, maxWidth: 300 }}>
                      Another browser tab or application is locking the camera stream.
                    </p>
                    <button
                      onClick={initCameraAndScanner}
                      className="btn btn-secondary"
                      style={{ marginTop: 14, fontSize: 12, padding: '6px 14px' }}
                    >
                      <RefreshCw size={13} /> Reconnect
                    </button>
                  </div>
                )}

                {status === 'NOT_SUPPORTED' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(20, 20, 20, 0.92)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    <AlertTriangle size={34} color="#FBBF24" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: '#FDE68A' }}>
                      Browser/device does not support camera
                    </p>
                    <p style={{ fontSize: 11.5, color: '#E5E5E0', marginTop: 4, maxWidth: 300 }}>
                      Ensure you are accessing via HTTPS or a supported modern browser.
                    </p>
                  </div>
                )}

                {flashlight && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255, 255, 255, 0.22)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Status Banner / Helpful scan guidance */}
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  color: candidateNotice ? '#FCD34D' : '#9CAE98',
                  background: candidateNotice ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: candidateNotice ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s',
                  maxWidth: 440,
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info size={13} color={candidateNotice ? '#F59E0B' : '#4ADE80'} style={{ flexShrink: 0 }} />
                <span>
                  {candidateNotice
                    ? candidateNotice
                    : status === 'SCANNING'
                    ? 'Place full barcode inside frame · Hold steady & ensure good lighting'
                    : 'Initializing live camera feed...'}
                </span>
              </div>

              {/* Diagnostic slow feed notification */}
              {isSlowFeed && status === 'SCANNING' && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: '#FBBF24',
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                  }}
                >
                  Waiting for camera frames... Check that your camera shutter is open and not blocked.
                </div>
              )}

              {/* Camera Action Buttons & Diagnostics */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 440,
                  marginTop: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={initCameraAndScanner}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: '#E5E5E0',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} /> Retry Camera
                  </button>

                  <button
                    onClick={handleToggleTorch}
                    style={{
                      background: flashlight ? '#FBBF24' : 'rgba(255, 255, 255, 0.08)',
                      color: flashlight ? '#111111' : '#E5E5E0',
                      border: flashlight ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Zap size={13} /> Torch {flashlight ? 'ON' : 'OFF'}
                  </button>
                </div>

                {cameraLabel && (
                  <span style={{ fontSize: 11, color: '#7E8F7A', fontStyle: 'italic' }}>
                    {resolution ? `${resolution} · ` : ''}
                    {cameraLabel.length > 20 ? `${cameraLabel.slice(0, 18)}...` : cameraLabel}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* DETECTED CODE & PHARMACIST VERIFICATION FORM */
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Detection Banner */}
              <div
                style={{
                  background: isLookingUp
                    ? 'rgba(59, 130, 246, 0.12)'
                    : isFoundInDb
                    ? 'rgba(16, 185, 129, 0.12)'
                    : lookupError
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                  border: isLookingUp
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : isFoundInDb
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : lookupError
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {isLookingUp ? (
                  <RotateCw size={22} color="#60A5FA" className="animate-spin" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : isFoundInDb ? (
                  <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : lookupError ? (
                  <XCircle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <AlertTriangle size={22} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: isLookingUp
                          ? '#93C5FD'
                          : isFoundInDb
                          ? '#6EE7B7'
                          : lookupError
                          ? '#FCA5A5'
                          : '#FCD34D',
                      }}
                    >
                      {isLookingUp
                        ? 'LOOKING UP MEDICINE...'
                        : isFoundInDb
                        ? 'MEDICINE FOUND'
                        : lookupError
                        ? 'LOOKUP FAILED'
                        : 'BARCODE NOT FOUND IN INVENTORY'}
                    </h4>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#A3B19B',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      Format: {detectedResult.format}
                    </span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12.5, color: '#FFFFFF', fontWeight: 600 }}>
                    Detected code: <span style={{ color: '#4ADE80', fontFamily: 'monospace' }}>{detectedResult.barcode || detectedResult.rawText}</span>
                  </div>

                  <p style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>
                    {isLookingUp ? `Looking up barcode [${detectedResult.barcode || detectedResult.rawText}]...` : lookupMessage}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CAE98', marginTop: 4 }}>
                    Please verify the medicine details before applying to the batch form.
                  </p>
                </div>
              </div>

              {/* Editable Verification Form */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 14,
                  padding: 18,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Package size={13} color="#4ADE80" /> Medicine Name *
                  </label>
                  <input
                    className="input"
                    value={verifyForm.medicine}
                    onChange={e => setVerifyForm({ ...verifyForm, medicine: e.target.value })}
                    placeholder="e.g. Paracetamol 500mg"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Layers size={13} color="#4ADE80" /> Batch Number *
                  </label>
                  <input
                    className="input"
                    value={verifyForm.batch}
                    onChange={e => setVerifyForm({ ...verifyForm, batch: e.target.value.toUpperCase() })}
                    placeholder="e.g. PCT101"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={13} color="#4ADE80" /> Expiry Date *
                  </label>
                  <input
                    className="input"
                    value={verifyForm.expiry}
                    onChange={e => setVerifyForm({ ...verifyForm, expiry: e.target.value })}
                    placeholder="e.g. Nov 2027"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Package size={13} color="#4ADE80" /> Quantity (Units) *
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={verifyForm.quantity}
                    onChange={e => setVerifyForm({ ...verifyForm, quantity: Number(e.target.value) || 0 })}
                    placeholder="100"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <DollarSign size={13} color="#4ADE80" /> Unit Price (₹)
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={verifyForm.unitPrice}
                    onChange={e => setVerifyForm({ ...verifyForm, unitPrice: Number(e.target.value) || 0 })}
                    placeholder="45"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#A3B19B', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Building2 size={13} color="#4ADE80" /> Supplier / Distributor
                  </label>
                  <input
                    className="input"
                    value={verifyForm.supplier}
                    onChange={e => setVerifyForm({ ...verifyForm, supplier: e.target.value })}
                    placeholder="e.g. ABC Pharma / MediSource"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  />
                </div>
              </div>

              {/* Verification Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                <button
                  onClick={handleRescan}
                  className="btn btn-secondary"
                  style={{ fontSize: 12.5, padding: '8px 16px', color: '#E5E5E0', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <RefreshCw size={14} /> Scan Another Barcode
                </button>

                <button
                  onClick={handleConfirmVerification}
                  className="btn btn-teal"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <CheckCircle2 size={15} /> Confirm & Apply to Batch Form
                </button>
              </div>
            </div>
          )}

          {/* QUICK PACKAGE PRESETS — TEST LOOKUP */}
          <div style={{ width: '100%', marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={13} color="#A3B19B" />
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#A3B19B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Quick Package Presets — Test Lookup:
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 6 }}>
              {sampleBarcodes.map(b => (
                <button
                  key={b.label}
                  onClick={() => {
                    cleanupScanner();
                    const scanned: ScannedMedicineData = {
                      rawText: b.code,
                      format: 'EAN_13',
                      barcode: b.code,
                      medicine: b.fallbackData.medicine,
                      batch: b.fallbackData.batch,
                      expiry: b.fallbackData.expiry,
                      quantity: b.fallbackData.quantity,
                      supplier: b.fallbackData.supplier,
                      unitPrice: b.fallbackData.unitPrice,
                    };
                    setDetectedResult(scanned);
                    executeMedicineLookup(scanned);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#E5E5E0',
                    padding: '7px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 700, marginLeft: 6 }}>
                    Select →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* MANUAL LOOKUP BARCODE / BATCH INPUT */}
          <div style={{ width: '100%', marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  placeholder="Enter Barcode / GTIN / Batch (e.g. 890103400101 or PCT101)..."
                  value={customCode}
                  onChange={e => setCustomCode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleManualLookup();
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    color: 'white',
                    padding: '9px 12px 9px 34px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
                <Search
                  size={15}
                  color="#A3B19B"
                  style={{ position: 'absolute', left: 11, top: 11 }}
                />
              </div>
              <button
                onClick={handleManualLookup}
                disabled={manualSearching || isLookingUp || !customCode.trim()}
                className="btn btn-teal"
                style={{
                  padding: '8px 18px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {manualSearching || isLookingUp ? (
                  <>
                    <RotateCw size={14} className="animate-spin" /> Looking Up...
                  </>
                ) : (
                  <>
                    <Search size={14} /> Lookup & Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: '#111312',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11.5, color: '#7E8F7A' }}>
            Supports QR, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, GS1 Databar
          </span>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ color: '#E5E5E0', borderColor: 'rgba(255, 255, 255, 0.2)', fontSize: 12 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
