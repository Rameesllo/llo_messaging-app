import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { RotateCcw, Check, X, RotateCw, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

const ImageEditor = ({ imageUrl, onSave, onCancel }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // If it's an external URL (not data:), use our proxy to avoid CORS issues
    if (imageUrl.startsWith('http')) {
      setImgSrc(`http://localhost:5000/api/ai/proxy?url=${encodeURIComponent(imageUrl)}`);
    } else {
      setImgSrc(imageUrl);
    }
  }, [imageUrl]);

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        undefined,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
    setLoading(false);
  };

  const getCroppedImg = async (image, pixelCrop, rotation = 0) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const rotRad = (rotation * Math.PI) / 180;
    const { naturalWidth: imgW, naturalHeight: imgH } = image;
    
    const bWidth = Math.abs(Math.cos(rotRad) * imgW) + Math.abs(Math.sin(rotRad) * imgH);
    const bHeight = Math.abs(Math.sin(rotRad) * imgW) + Math.abs(Math.cos(rotRad) * imgH);

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.drawImage(image, -imgW / 2, -imgH / 2);

    const croppedCanvas = document.createElement('canvas');
    const safeW = Math.max(1, Math.floor(pixelCrop.width));
    const safeH = Math.max(1, Math.floor(pixelCrop.height));
    const safeX = Math.floor(pixelCrop.x);
    const safeY = Math.floor(pixelCrop.y);

    croppedCanvas.width = safeW;
    croppedCanvas.height = safeH;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(
      canvas,
      safeX,
      safeY,
      safeW,
      safeH,
      0,
      0,
      safeW,
      safeH
    );

    return croppedCanvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (processing || !completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop, rotation);
      onSave(croppedImage);
    } catch (e) {
      console.error('Save failed:', e);
      alert('Could not process image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    if (imgRef.current) {
        onImageLoad({ currentTarget: imgRef.current });
    }
  };

  return (
    <div className="ios-editor-overlay">
      <div className="ios-editor-header">
        <button onClick={onCancel} className="ios-action-text ignore-active">Cancel</button>
        <div className="ios-header-title">Edit</div>
        <button onClick={handleReset} className="ios-btn-reset">
           <RefreshCw size={18} />
        </button>
      </div>

      <div className="ios-cropper-container">
        {loading && (
          <div className="ios-loader-overlay">
            <div className="ios-spinner"></div>
          </div>
        )}
        <div className="ios-crop-wrapper" style={{ transform: `scale(${zoom})` }}>
          {imgSrc && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              className="ios-react-crop"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imgSrc}
                style={{ 
                    maxHeight: '60vh', 
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}
                onLoad={onImageLoad}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
        </div>
      </div>

      <div className="ios-editor-footer">
        <div className="ios-tool-bar">
          <button onClick={() => setRotation((prev) => (prev - 90) % 360)} className="ios-tool-btn">
            <RotateCcw size={26} />
          </button>
          
          <div className="ios-zoom-control">
             <div className="flex items-center gap-4 text-white/50 w-full px-4">
                <ZoomOut size={16} />
                <input
                    type="range"
                    value={zoom}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#FFD60A]"
                />
                <ZoomIn size={16} />
             </div>
          </div>

          <button onClick={() => setRotation((prev) => (prev + 90) % 360)} className="ios-tool-btn">
            <RotateCw size={26} />
          </button>
        </div>

        <div className="ios-main-actions">
           <button onClick={handleSave} disabled={processing || loading} className="ios-done-btn">
             {processing ? "Processing..." : "Done"}
           </button>
        </div>
      </div>

      <style>{`
        .ios-editor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          z-index: 3000;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: white;
        }
        .ios-editor-header {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          z-index: 100;
        }
        .ios-action-text {
          background: none;
          border: none;
          color: #fff;
          font-size: 17px;
          cursor: pointer;
          font-weight: 500;
        }
        .ios-header-title {
          font-size: 17px;
          font-weight: 600;
        }
        .ios-btn-reset {
          background: none;
          border: none;
          color: #FFD60A;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .ios-cropper-container {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #000;
        }
        .ios-crop-wrapper {
            transition: transform 0.2s ease-out;
            max-width: 90%;
            display: flex;
            justify-content: center;
        }
        .ios-editor-footer {
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          padding-bottom: env(safe-area-inset-bottom, 20px);
          z-index: 100;
        }
        .ios-tool-bar {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 0.5px solid rgba(255,255,255,0.1);
        }
        .ios-tool-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
        }
        .ios-zoom-control {
          flex: 1;
          display: flex;
          justify-content: center;
        }
        .ios-main-actions {
          padding: 15px 20px;
          display: flex;
          justify-content: flex-end;
        }
        .ios-done-btn {
          background: none;
          border: none;
          color: #FFD60A;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 12px;
        }
        .ios-done-btn:disabled {
          opacity: 0.5;
        }

        /* iOS Loader */
        .ios-loader-overlay {
          position: absolute;
          inset: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .ios-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #FFD60A;
          border-radius: 50%;
          animation: ios-spin 0.8s linear infinite;
        }
        @keyframes ios-spin {
          to { transform: rotate(360deg); }
        }

        /* React Crop Customization - iOS Style */
        .ReactCrop__crop-selection {
          border: 2px solid #FFD60A !important;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6) !important;
        }

        /* Corner Handles like iOS Gallery */
        .ReactCrop__handle {
            width: 20px !important;
            height: 20px !important;
            background: transparent !important;
            border: none !important;
        }
        .ReactCrop__handle:after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border: 4px solid #FFD60A;
            box-sizing: border-box;
        }

        /* NW Corner */
        .ReactCrop__handle-nw:after { border-right: 0; border-bottom: 0; top: -2px; left: -2px; }
        /* NE Corner */
        .ReactCrop__handle-ne:after { border-left: 0; border-bottom: 0; top: -2px; right: -2px; }
        /* SW Corner */
        .ReactCrop__handle-sw:after { border-right: 0; border-top: 0; bottom: -2px; left: -2px; }
        /* SE Corner */
        .ReactCrop__handle-se:after { border-left: 0; border-top: 0; bottom: -2px; right: -2px; }

        /* Hide side handles to keep it clean iOS style if preferred, or just keep corners */
        .ReactCrop__handle-n, .ReactCrop__handle-s, .ReactCrop__handle-e, .ReactCrop__handle-w {
            display: none !important;
        }

        .ReactCrop__rule-of-thirds-vt:after, .ReactCrop__rule-of-thirds-vt:before,
        .ReactCrop__rule-of-thirds-hz:after, .ReactCrop__rule-of-thirds-hz:before {
            background-color: rgba(255, 214, 10, 0.3) !important;
        }
      `}</style>
    </div>
  );
};

export default ImageEditor;
