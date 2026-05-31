import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import QRCode from 'qrcode';
import { QrCode, Camera, X, Clipboard, Check } from 'lucide-react';

export default function QrScanner({ onClose, onScanSuccess }) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState('');
  const qrCanvasRef = useRef(null);

  const localGameUrl = window.location.href;

  useEffect(() => {
    // Generate sharing QR code for current game link
    QRCode.toDataURL(localGameUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#060f1e',
        light: '#ffffff'
      }
    })
      .then(url => {
        setQrUrl(url);
      })
      .catch(err => {
        console.error("QR Generation error: ", err);
      });

    // Initialize HTML5 QR Code scanner
    const scannerId = 'reader';
    let html5QrcodeScanner = new Html5QrcodeScanner(
      scannerId,
      { fps: 10, qrbox: { width: 220, height: 220 } },
      /* verbose= */ false
    );

    const onScanSuccessLocal = (decodedText) => {
      console.log(`Scan result: ${decodedText}`);
      html5QrcodeScanner.clear().then(() => {
        onScanSuccess(decodedText);
      }).catch(err => {
        console.error("Failed to clear scanner: ", err);
        onScanSuccess(decodedText);
      });
    };

    const onScanFailure = (error) => {
      // Too verbose if we log every frame, but we can set subtle errors
    };

    html5QrcodeScanner.render(onScanSuccessLocal, onScanFailure);

    return () => {
      html5QrcodeScanner.clear().catch(err => {
        // Safe to ignore if already cleared
      });
    };
  }, [onScanSuccess]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(localGameUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(5, 8, 17, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="glass-panel blue-neon-border p-4 w-100 position-relative text-center text-white"
        style={{ maxWidth: '480px', borderRadius: '24px' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="btn btn-link text-white position-absolute top-3 end-3 p-1"
          style={{ textDecoration: 'none' }}
        >
          <X size={24} />
        </button>

        <h3 className="sports-header blue-neon-text mb-3" style={{ fontSize: '1.8rem' }}>
          Real-time Matchmaking
        </h3>

        {/* Tab Selection */}
        <div className="nav nav-tabs justify-content-center border-secondary mb-3" id="qrTab" role="tablist">
          <button 
            className="nav-link active text-uppercase bg-transparent border-0 border-bottom border-secondary text-white px-3 pb-2 small fw-bold" 
            id="scan-tab" data-bs-toggle="tab" data-bs-target="#scan-content" type="button" role="tab" style={{ letterSpacing: '1px' }}
          >
            <Camera size={16} className="me-1 align-middle" /> Scan Opponent
          </button>
          <button 
            className="nav-link text-white bg-transparent border-0 border-bottom border-secondary px-3 pb-2 small fw-bold" 
            id="share-tab" data-bs-toggle="tab" data-bs-target="#share-content" type="button" role="tab" style={{ letterSpacing: '1px' }}
          >
            <QrCode size={16} className="me-1 align-middle" /> Share QR
          </button>
        </div>

        <div className="tab-content" id="qrTabContent">
          {/* SCANNER VIEW */}
          <div className="tab-pane fade show active" id="scan-content" role="tabpanel">
            <p className="text-white-50 small mb-3">
              Scan another player's game QR code to join their room instantly:
            </p>
            
            {/* HTML5 QR SCANNER ELEMENT */}
            <div 
              id="reader" 
              className="bg-dark rounded-3 overflow-hidden border border-secondary mx-auto" 
              style={{ width: '100%', maxWidth: '300px', minHeight: '220px' }}
            />
            
            {scanError && <div className="text-danger small mt-2">{scanError}</div>}

            {/* Direct Connect code fallback */}
            <div className="mt-3">
              <span className="small text-white-50">Or enter Connection Code / URL:</span>
              <form onSubmit={handleManualSubmit} className="d-flex gap-2 mt-2">
                <input 
                  type="text" 
                  className="form-control bg-dark border-secondary text-white text-center rounded-3"
                  placeholder="https://... or Game Code" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary-gaming py-1 px-3 fs-6 rounded-3">Join</button>
              </form>
            </div>
          </div>

          {/* SHARE VIEW */}
          <div className="tab-pane fade" id="share-content" role="tabpanel">
            <p className="text-white-50 small mb-3">
              Show this QR code to your friend to invite them to your lobby:
            </p>
            
            {qrUrl ? (
              <div className="bg-white p-2 rounded-4 d-inline-block shadow mb-3">
                <img src={qrUrl} alt="Join Game QR" style={{ width: '180px', height: '180px' }} />
              </div>
            ) : (
              <div className="d-flex align-items-center justify-content-center" style={{ height: '180px' }}>
                <div className="spinner-border text-info" role="status" />
              </div>
            )}

            <div className="d-flex flex-column align-items-center gap-2">
              <span className="small text-white-50">Lobby Link:</span>
              <div className="d-flex align-items-center justify-content-between bg-dark border border-secondary px-3 py-2 rounded-3 w-100" style={{ maxWidth: '320px' }}>
                <span className="text-truncate text-white-50 me-2" style={{ fontSize: '0.75rem' }}>
                  {localGameUrl}
                </span>
                <button 
                  onClick={copyToClipboard}
                  className="btn btn-sm btn-outline-light border-secondary p-1 rounded"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Clipboard size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white-50 small mt-4 mb-0" style={{ fontSize: '0.7rem' }}>
          *Strictly 1v1 matchup. Ensure you are both on the same server environment.
        </p>
      </div>
    </div>
  );
}
