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
} from 'lucide-react';
import {
  startCameraStream,
  stopCameraStream,
  toggleTorch,
  scanFrame,
  ScannerStatus,
  ScannedMedicineData,
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const [status, setStatus] = useState<ScannerStatus>('INITIALIZING');
  const [cameraLabel, setCameraLabel] = useState<string>('');
  const [resolution, setResolution] = useState<string>('');
  const [flashlight, setFlashlight] = useState<boolean>(false);
  const [isSlowFeed, setIsSlowFeed] = useState<boolean>(false);

  // Scanned verification state
  const [detectedResult, setDetectedResult] = useState<ScannedMedicineData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupMessage, setLookupMessage] = useState<string>('');
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
  }>({
    medicine: '',
    batch: '',
    expiry: '',
    quantity: 100,
    supplier: 'ABC Pharma',
    unitPrice: 45,
    barcode: '',
  });

  // Manual fallback search input
  const [customCode, setCustomCode] = useState<string>('');
  const [manualSearching, setManualSearching] = useState<boolean>(false);

  const sampleBarcodes = [
    {
      label: 'PCT101 · Paracetamol 500mg',
      data: {
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
      data: {
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
      data: {
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
      label: 'MET624 · Metformin 500mg (New Batch)',
      data: {
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

  // Initialize native BarcodeDetector if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = [
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
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats });
      } catch (e) {
        console.warn('Native BarcodeDetector init fallback:', e);
      }
    }
  }, []);

  // Cleanup helper
  const cleanupCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    stopCameraStream(videoRef.current, streamRef.current);
    streamRef.current = null;
    setFlashlight(false);
  }, []);

  // Camera start handler
  const initCamera = useCallback(async () => {
    if (!videoRef.current) return;

    cleanupCamera();
    setStatus('INITIALIZING');
    setIsSlowFeed(false);

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
  }, [cleanupCamera]);

  // Lookup barcode code in database
  const handleLookup = useCallback(async (scanned: ScannedMedicineData) => {
    const searchCode = scanned.barcode || scanned.rawText;
    setIsLookingUp(true);
    setLookupMessage('Searching inventory & drug database for product...');

    try {
      const res = await api.lookupBarcode(searchCode);
      setIsLookingUp(false);

      if (res.found && res.medicine) {
        setIsFoundInDb(true);
        setLookupMessage('Product matched in pharmacy inventory database.');
        setVerifyForm({
          medicine: res.medicine.medicine || scanned.medicine || `Product (${searchCode})`,
          batch: res.medicine.batch || scanned.batch || searchCode.toUpperCase(),
          expiry: res.medicine.expiry || scanned.expiry || 'Dec 2027',
          quantity: res.medicine.quantity || scanned.quantity || 100,
          supplier: res.medicine.supplier || scanned.supplier || 'ABC Pharma',
          unitPrice: res.medicine.unitPrice || scanned.unitPrice || 45,
          barcode: searchCode,
        });
      } else {
        setIsFoundInDb(false);
        setLookupMessage('Barcode detected, but no matching medicine was found in current inventory.');
        setVerifyForm({
          medicine: scanned.medicine || `Medicine (${searchCode})`,
          batch: scanned.batch || searchCode.toUpperCase(),
          expiry: scanned.expiry || 'Dec 2027',
          quantity: scanned.quantity || 100,
          supplier: scanned.supplier || 'ABC Pharma',
          unitPrice: scanned.unitPrice || 45,
          barcode: searchCode,
        });
      }
    } catch {
      setIsLookingUp(false);
      setIsFoundInDb(false);
      setLookupMessage('Barcode detected, but no matching medicine was found.');
      setVerifyForm({
        medicine: scanned.medicine || `Product (${searchCode})`,
        batch: scanned.batch || searchCode.toUpperCase(),
        expiry: scanned.expiry || 'Dec 2027',
        quantity: scanned.quantity || 100,
        supplier: 'ABC Pharma',
        unitPrice: 45,
        barcode: searchCode,
      });
    }
  }, []);

  // Frame scanning loop
  useEffect(() => {
    if (!isOpen || status !== 'SCANNING' || detectedResult) {
      return;
    }

    let isScanning = true;
    let lastScanTime = 0;

    const loop = async (timestamp: number) => {
      if (!isScanning) return;

      // Throttle scanning to ~6-7 frames per second (150ms interval) to save CPU & battery
      if (timestamp - lastScanTime > 150) {
        lastScanTime = timestamp;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const res = await scanFrame(videoRef.current, barcodeDetectorRef.current);
          if (res && res.rawText) {
            isScanning = false;
            setDetectedResult(res);
            handleLookup(res);
            return;
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(loop);
    };

    scanLoopRef.current = requestAnimationFrame(loop);

    return () => {
      isScanning = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isOpen, status, detectedResult, handleLookup]);

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setDetectedResult(null);
      setIsFoundInDb(null);
      setLookupMessage('');
      setCustomCode('');
      // Launch camera
      const timer = setTimeout(() => {
        initCamera();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      cleanupCamera();
      setDetectedResult(null);
      setIsFoundInDb(null);
    }
  }, [isOpen, initCamera, cleanupCamera]);

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
    initCamera();
  };

  // Confirm verification and submit to parent
  const handleConfirmVerification = () => {
    onScan({
      medicine: verifyForm.medicine.trim(),
      batch: verifyForm.batch.trim().toUpperCase(),
      expiry: verifyForm.expiry.trim(),
      quantity: Number(verifyForm.quantity) || 1,
      supplier: verifyForm.supplier.trim() || 'ABC Pharma',
      unitPrice: Number(verifyForm.unitPrice) || 45,
      barcode: verifyForm.barcode.trim(),
    });
    onClose();
  };

  // Handle manual code lookup
  const handleManualLookup = async () => {
    if (!customCode.trim()) return;
    setManualSearching(true);
    const scanned: ScannedMedicineData = {
      rawText: customCode.trim(),
      format: 'MANUAL_ENTRY',
      barcode: customCode.trim(),
    };
    setDetectedResult(scanned);
    await handleLookup(scanned);
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
                    LIVE
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
                    display: status === 'SCANNING' ? 'block' : 'block',
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
                        top: 20,
                        left: 24,
                        width: 28,
                        height: 28,
                        borderTop: '3.5px solid #4ADE80',
                        borderLeft: '3.5px solid #4ADE80',
                        borderRadius: '6px 0 0 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 20,
                        right: 24,
                        width: 28,
                        height: 28,
                        borderTop: '3.5px solid #4ADE80',
                        borderRight: '3.5px solid #4ADE80',
                        borderRadius: '0 6px 0 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 20,
                        left: 24,
                        width: 28,
                        height: 28,
                        borderBottom: '3.5px solid #4ADE80',
                        borderLeft: '3.5px solid #4ADE80',
                        borderRadius: '0 0 0 6px',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 20,
                        right: 24,
                        width: 28,
                        height: 28,
                        borderBottom: '3.5px solid #4ADE80',
                        borderRight: '3.5px solid #4ADE80',
                        borderRadius: '0 0 6px 0',
                        filter: 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.8))',
                      }}
                    />

                    {/* Top Guide Text */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 12px',
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#E5E5E0',
                        letterSpacing: '0.04em',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      ALIGN BARCODE / QR INSIDE FRAME
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
                      Requesting browser video permission & configuring HD lens
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
                      onClick={initCamera}
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
                      onClick={initCamera}
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
                      onClick={initCamera}
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
                  marginTop: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={initCamera}
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
                  background: isFoundInDb
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                  border: isFoundInDb
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {isFoundInDb ? (
                  <CheckCircle2 size={22} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <AlertTriangle size={22} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: isFoundInDb ? '#6EE7B7' : '#FCD34D',
                      }}
                    >
                      Detected Code: [{detectedResult.barcode || detectedResult.rawText}]
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
                  <p style={{ fontSize: 12, color: '#E5E5E0', marginTop: 4 }}>
                    {isLookingUp ? 'Querying Firestore inventory...' : lookupMessage}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CAE98', marginTop: 2 }}>
                    Please verify the medicine, batch number, expiry date, and quantity before applying.
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

          {/* QUICK PACKAGE PRESETS (FALLBACK OPTIONS) */}
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
                Quick Package Presets (Click to decode test barcode):
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 6 }}>
              {sampleBarcodes.map(b => (
                <button
                  key={b.label}
                  onClick={() => {
                    const scanned: ScannedMedicineData = {
                      rawText: b.data.barcode,
                      format: 'EAN_13',
                      medicine: b.data.medicine,
                      batch: b.data.batch,
                      expiry: b.data.expiry,
                      quantity: b.data.quantity,
                      supplier: b.data.supplier,
                      unitPrice: b.data.unitPrice,
                      barcode: b.data.barcode,
                    };
                    setDetectedResult(scanned);
                    handleLookup(scanned);
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
                disabled={manualSearching || !customCode.trim()}
                className="btn btn-teal"
                style={{ padding: '8px 16px', fontSize: 12.5, whiteSpace: 'nowrap' }}
              >
                {manualSearching ? 'Searching...' : 'Lookup & Scan'}
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
