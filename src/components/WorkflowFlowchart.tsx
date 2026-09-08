import React, { useState } from 'react';
import {
  Truck, PackageCheck, QrCode, ShieldCheck, Boxes, CreditCard,
  MinusCircle, ClipboardCheck, AlertTriangle, BellRing,
  Languages, ShieldAlert, Ban, Search, Send, FileCheck
} from 'lucide-react';

export default function WorkflowFlowchart() {
  const [activeFlow, setActiveFlow] = useState<'core' | 'alerts' | 'recall'>('core');

  return (
    <div className="card" style={{ padding: '22px 24px', overflow: 'hidden' }}>
      {/* Flowchart Header & Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="section-eyebrow" style={{ marginBottom: 0 }}>
              STANDARD OPERATING PROCEDURE
            </span>
            <span className="chip badge-teal" style={{ fontSize: 10.5, padding: '2px 7px' }}>
              Interactive Visual Guide
            </span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', marginTop: 3 }}>
            Pharmacy Operational Workflows & Compliance Pipelines
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            Trace end-to-end verification, dispensing deductions, SMS escalation, and recall containment.
          </p>
        </div>

        {/* Workflow Mode Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-alt)',
            padding: 4,
            borderRadius: 10,
            gap: 4,
            border: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveFlow('core')}
            className={`btn ${activeFlow === 'core' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7 }}
          >
            1. Core Dispensing & Audit
          </button>
          <button
            onClick={() => setActiveFlow('alerts')}
            className={`btn ${activeFlow === 'alerts' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7 }}
          >
            2. Alert & SMS Escalation
          </button>
          <button
            onClick={() => setActiveFlow('recall')}
            className={`btn ${activeFlow === 'recall' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7 }}
          >
            3. Batch Recall & Patient Safety
          </button>
        </div>
      </div>

      {/* ────────── FLOW 1: CORE PHARMACY WORKFLOW ────────── */}
      {activeFlow === 'core' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
              End-to-End Stock Ingestion → Dispensing → Audit Trace
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}>
              100% FEFO Compliance Guaranteed
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {[
              {
                step: '01',
                title: 'Supplier Delivery',
                desc: 'Stock received from verified distributor (ABC Pharma, MediSource).',
                icon: Truck,
                tone: 'blue',
                color: '#2563EB',
                bg: 'var(--info-light)',
                border: 'var(--info-border)',
              },
              {
                step: '02',
                title: 'Data Capture',
                desc: 'Barcode/QR Scan, Invoice OCR uploader, or direct manual entry.',
                icon: QrCode,
                tone: 'blue',
                color: '#2563EB',
                bg: 'var(--info-light)',
                border: 'var(--info-border)',
              },
              {
                step: '03',
                title: 'Pharmacist Check',
                desc: 'Pharmacist verifies Batch, Expiry date, and Unit purchase cost.',
                icon: ShieldCheck,
                tone: 'teal',
                color: 'var(--primary)',
                bg: 'var(--primary-light)',
                border: 'var(--primary-border)',
              },
              {
                step: '04',
                title: 'Live Inventory Storage',
                desc: 'Quantity logged into stock database with FEFO priority sorting.',
                icon: Boxes,
                tone: 'teal',
                color: 'var(--primary)',
                bg: 'var(--primary-light)',
                border: 'var(--primary-border)',
              },
              {
                step: '05',
                title: 'Prescription Dispense',
                desc: 'Select Customer, target Medicine, Batch, and Dispense Quantity.',
                icon: CreditCard,
                tone: 'emerald',
                color: 'var(--success)',
                bg: 'var(--success-light)',
                border: 'var(--success-border)',
              },
              {
                step: '06',
                title: 'Auto Stock Deduction',
                desc: 'Quantity subtracted instantly from batch; triggers low-stock alert if <80.',
                icon: MinusCircle,
                tone: 'emerald',
                color: 'var(--success)',
                bg: 'var(--success-light)',
                border: 'var(--success-border)',
              },
              {
                step: '07',
                title: 'Dispensing Audit Trail',
                desc: 'Immutable record stored with timestamp, Rx ID, customer & pharmacist.',
                icon: ClipboardCheck,
                tone: 'amber',
                color: 'var(--warning)',
                bg: 'var(--warning-light)',
                border: 'var(--warning-border)',
              },
              {
                step: '08',
                title: 'Safety Monitoring',
                desc: 'Automated continuous scan for near-expiry, low stock & recall flags.',
                icon: AlertTriangle,
                tone: 'amber',
                color: '#EA580C',
                bg: 'var(--orange-light)',
                border: 'var(--orange-border)',
              },
            ].map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.step}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--surface)',
                    border: `1.5px solid ${node.border}`,
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: node.color,
                          backgroundColor: node.bg,
                          padding: '2px 8px',
                          borderRadius: 99,
                        }}
                      >
                        STEP {node.step}
                      </span>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: node.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={16} color={node.color} />
                      </div>
                    </div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                      {node.title}
                    </h4>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      {node.desc}
                    </p>
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ height: 2, flex: 1, backgroundColor: node.border }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: node.color }}>READY</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────── FLOW 2: ALERT & MULTILINGUAL SMS ESCALATION ────────── */}
      {activeFlow === 'alerts' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
              Continuous Automated Monitoring & Patient SMS Escalation
            </span>
            <span style={{ fontSize: 11.5, color: '#2563EB', fontWeight: 600 }}>
              Supports English, Hindi, Kannada, Tamil
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Stage A */}
            <div style={{ padding: 18, borderRadius: 12, border: '1.5px solid var(--warning-border)', backgroundColor: 'var(--warning-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing size={18} color="var(--warning)" />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>1. Internal Alert Trigger</h4>
                  <p style={{ fontSize: 11.5, color: 'var(--warning)' }}>Detected from live batch expiry / stock levels</p>
                </div>
              </div>
              <ul style={{ fontSize: 12, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                <li><b>Low Stock (&lt;80 units):</b> Flags purchasing reorder reminder.</li>
                <li><b>Near Expiry (&lt;90 days):</b> Prioritizes batch for first dispensing.</li>
                <li><b>Immediate SMS:</b> Pharmacist-in-Charge and Stock Manager notified.</li>
              </ul>
            </div>

            {/* Stage B */}
            <div style={{ padding: 18, borderRadius: 12, border: '1.5px solid var(--info-border)', backgroundColor: 'var(--info-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Languages size={18} color="#2563EB" />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>2. Patient Expiry Notification</h4>
                  <p style={{ fontSize: 11.5, color: '#2563EB' }}>Cross-checks customer medicine course</p>
                </div>
              </div>
              <ul style={{ fontSize: 12, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 16 }}>
                <li><b>Customer Lookup:</b> Matches phone & preferred language.</li>
                <li><b>Language Localization:</b> Automated translation to Hindi/Kannada.</li>
                <li><b>SMS & WhatsApp:</b> Direct dosage reminder and validity advisory.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ────────── FLOW 3: BATCH RECALL & AUDIT TRACE ────────── */}
      {activeFlow === 'recall' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
              Rapid Containment & Patient Recall Protocol
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 700 }}>
              Zero-Risk Patient Safety Quarantine
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              {
                step: 'R-01',
                title: 'Recall Notice Received',
                desc: 'Supplier or regulatory notice issued for specific batch (e.g. AMX204).',
                icon: ShieldAlert,
                color: 'var(--danger)',
                bg: 'var(--danger-light)',
                border: 'var(--danger-border)',
              },
              {
                step: 'R-02',
                title: 'Instant Batch Lock',
                desc: 'Batch status flipped to "Recalled"; UI blocks any further dispensing.',
                icon: Ban,
                color: 'var(--danger)',
                bg: 'var(--danger-light)',
                border: 'var(--danger-border)',
              },
              {
                step: 'R-03',
                title: 'Dispensing Audit Scan',
                desc: 'Audit trail queries all customers who were dispensed this batch in past 60 days.',
                icon: Search,
                color: '#EA580C',
                bg: 'var(--orange-light)',
                border: 'var(--orange-border)',
              },
              {
                step: 'R-04',
                title: 'Emergency Broadcast',
                desc: 'Automated urgent recall advisory dispatched via SMS to all affected patients.',
                icon: Send,
                color: 'var(--warning)',
                bg: 'var(--warning-light)',
                border: 'var(--warning-border)',
              },
              {
                step: 'R-05',
                title: 'Supplier Return Slip',
                desc: 'Formal return documentation generated for quarantine credit & replacement.',
                icon: FileCheck,
                color: 'var(--success)',
                bg: 'var(--success-light)',
                border: 'var(--success-border)',
              },
            ].map(node => {
              const Icon = node.icon;
              return (
                <div
                  key={node.step}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    backgroundColor: 'var(--surface)',
                    border: `1.5px solid ${node.border}`,
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: node.color,
                          backgroundColor: node.bg,
                          padding: '2px 8px',
                          borderRadius: 99,
                        }}
                      >
                        {node.step}
                      </span>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          backgroundColor: node.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={16} color={node.color} />
                      </div>
                    </div>
                    <h4 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                      {node.title}
                    </h4>
                    <p style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      {node.desc}
                    </p>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ height: 2, flex: 1, backgroundColor: node.border }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: node.color }}>PROTECTED</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
