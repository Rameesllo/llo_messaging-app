import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, FlipHorizontal } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
//  FILTER DEFINITIONS
//  Each filter has:
//    id        – unique string
//    name      – display label
//    category  – 'beauty' | 'fun' | 'transform'
//    emoji     – icon shown in the picker strip
//    cssFilter – CSS filter string applied to the <video>
//    svgId     – optional SVG filter id (defined in <defs> below)
//    svgId     – optional SVG filter id (defined in <defs> below)
//    overlay   – function(ctx, w, h, positions) to paint canvas stickers on top
// ─────────────────────────────────────────────────────────────────────────────
const FILTERS = [
  // ── BEAUTY ──────────────────────────────────────────────────────────────
  {
    id: 'normal', name: 'Normal', category: 'beauty', emoji: '✨',
    cssFilter: 'none',
  },
  {
    id: 'flowercrown', name: 'Flower Crown', category: 'beauty', emoji: '🌸',
    cssFilter: 'brightness(1.08) contrast(0.94) saturate(1.15)',
    overlay: (ctx, w, h) => {
      const positions = arguments[3]; // Face positions from tracker
      if (!positions || positions.length < 70) {
          // Fallback if no face detected
          return;
      }

      // ── Crown geometry ───────────────────────────────────────
      // Use head top points (roughly between eyebrows and top of head)
      // clmtrackr points: 33 (left eyebrow), 27 (right eyebrow)
      const leftEb = positions[33];
      const rightEb = positions[27];
      const midEbX = (leftEb[0] + rightEb[0]) / 2;
      const midEbY = (leftEb[1] + rightEb[1]) / 2;

      // Calculate width based on eyebrow distance
      const ebDist = Math.sqrt(Math.pow(rightEb[0] - leftEb[0], 2) + Math.pow(rightEb[1] - leftEb[1], 2));
      const crownW = ebDist * 2.2;
      const crownTop = midEbY - ebDist * 0.8;
      const startX = midEbX - crownW / 2;
      const endX = midEbX + crownW / 2;
      const arcDip = ebDist * 0.15;

      // Helper: point on the vine curve at parameter t ∈ [0,1]
      const vinePoint = (t) => {
        const x = startX + t * crownW;
        const y = crownTop + Math.sin(t * Math.PI) * arcDip;
        return { x, y };
      };

      // ── Draw the vine (thin dark-green curved stroke) ─────────
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, crownTop);
      ctx.quadraticCurveTo(midEbX, crownTop + arcDip, endX, crownTop);
      ctx.strokeStyle = '#2d6a2d';
      ctx.lineWidth   = Math.max(1.5, ebDist * 0.05);
      ctx.stroke();
      ctx.restore();

      // ── Helper: draw one small leaf ───────────────────────────
      const drawLeaf = (lx, ly, angle, size) => {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-size * 0.5, -size * 0.6, -size * 0.5, -size * 1.4, 0, -size * 1.6);
        ctx.bezierCurveTo( size * 0.5, -size * 1.4,  size * 0.5, -size * 0.6, 0, 0);
        ctx.fillStyle = '#3a7d44';
        ctx.fill();
        ctx.restore();
      };

      // ── Helper: draw one flower ───────────────────────────────
      const drawFlower = (fx, fy, size, petalColor, centerColor) => {
        const petals = 5;
        for (let p = 0; p < petals; p++) {
          const angle = (p / petals) * Math.PI * 2;
          const px = fx + Math.cos(angle) * size * 0.7;
          const py = fy + Math.sin(angle) * size * 0.7;
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(px, py, size * 0.52, size * 0.36, angle, 0, Math.PI * 2);
          ctx.fillStyle = petalColor;
          ctx.shadowColor = 'rgba(0,0,0,0.12)';
          ctx.shadowBlur  = 2;
          ctx.fill();
          ctx.restore();
        }
        // Centre dot
        ctx.beginPath();
        ctx.arc(fx, fy, size * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = centerColor;
        ctx.fill();
      };

      // ── Place flowers + leaves along the vine ─────────────────
      const flowerTs = [0, 0.13, 0.27, 0.40, 0.50, 0.60, 0.73, 0.87, 1.0];
      const flowerDefs = [
        ['#f4a7b9', '#fde68a', 1.0],
        ['#ffffff', '#fbbf24', 0.75],
        ['#f9a8d4', '#fde68a', 0.85],
        ['#ffffff', '#f59e0b', 0.80],
        ['#f4a7b9', '#fde68a', 1.05],
        ['#ffffff', '#f59e0b', 0.80],
        ['#f9a8d4', '#fde68a', 0.85],
        ['#ffffff', '#fbbf24', 0.75],
        ['#f4a7b9', '#fde68a', 1.0],
      ];

      const baseSize = ebDist * 0.15;

      flowerTs.forEach((t, i) => {
        const { x, y } = vinePoint(t);
        const [petal, center, scale] = flowerDefs[i % flowerDefs.length];
        const sz = baseSize * scale;

        const leafSz = sz * 0.55;
        drawLeaf(x - sz * 0.8, y, -0.6 + t * 0.3, leafSz);
        drawLeaf(x + sz * 0.8, y,  0.6 - t * 0.3, leafSz);

        drawFlower(x, y, sz, petal, center);
      });
    },
  },
  {
    id: 'softglam', name: 'Soft Glam', category: 'beauty', emoji: '💄',
    cssFilter: 'brightness(1.1) saturate(1.5) sepia(0.15) contrast(1.08)',
  },
  {
    id: 'smoothskin', name: 'Smooth Skin', category: 'beauty', emoji: '🌸',
    cssFilter: 'brightness(1.08) contrast(0.93) saturate(1.15)',
  },
  {
    id: 'cutie', name: 'Cute Face', category: 'beauty', emoji: '🥰',
    cssFilter: 'brightness(1.12) saturate(1.4) hue-rotate(-10deg) contrast(1.06)',
  },
  {
    id: 'natural', name: 'Natural Beauty', category: 'beauty', emoji: '🌿',
    cssFilter: 'brightness(1.04) saturate(1.12) contrast(1.03)',
  },
  {
    id: 'makeup', name: 'Makeup Look', category: 'beauty', emoji: '💋',
    cssFilter: 'saturate(1.7) contrast(1.18) brightness(1.06)',
  },
  {
    id: 'pretty', name: 'Pretty Face', category: 'beauty', emoji: '🌷',
    cssFilter: 'brightness(1.12) saturate(1.35) sepia(0.12)',
  },
  {
    id: 'retouch', name: 'Face Retouch', category: 'beauty', emoji: '🪄',
    cssFilter: 'brightness(1.09) contrast(0.92) saturate(1.1)',
  },

  // ── FUN / LENSES ────────────────────────────────────────────────────────
  {
    id: 'hearts', name: 'Hearts', category: 'fun', emoji: '❤️',
    cssFilter: 'saturate(1.3) brightness(1.05)',
    overlay: (ctx, w, h) => {
      const hearts = ['❤️','💕','💗','💖','💝','💓'];
      ctx.font = `${Math.round(w * 0.07)}px serif`;
      ctx.textBaseline = 'middle';
      const seed = Date.now() / 1200;
      for (let i = 0; i < 9; i++) {
        const x = (Math.sin(seed + i * 1.3) * 0.5 + 0.5) * w;
        const y = ((Math.cos(seed * 0.7 + i) * 0.5 + 0.5) * 0.85 + 0.05) * h;
        ctx.fillText(hearts[i % hearts.length], x, y);
      }
    },
  },
  {
    id: 'stars', name: 'Stars', category: 'fun', emoji: '⭐',
    cssFilter: 'brightness(1.08) saturate(1.2)',
    overlay: (ctx, w, h) => {
      const stars = ['⭐','🌟','✨','💫'];
      ctx.font = `${Math.round(w * 0.065)}px serif`;
      ctx.textBaseline = 'middle';
      const seed = Date.now() / 1500;
      for (let i = 0; i < 10; i++) {
        const x = (Math.sin(seed * 1.1 + i * 1.7) * 0.5 + 0.5) * w;
        const y = ((Math.cos(seed * 0.8 + i * 1.1) * 0.5 + 0.5) * 0.9 + 0.05) * h;
        ctx.fillText(stars[i % stars.length], x, y);
      }
    },
  },
  {
    id: 'crying', name: 'Crying Lens', category: 'fun', emoji: '😭',
    cssFilter: 'hue-rotate(200deg) brightness(1.1) saturate(0.85)',
    overlay: (ctx, w, h) => {
      // Teardrops cascading down
      ctx.font = `${Math.round(w * 0.05)}px serif`;
      const tearsX = [0.35, 0.45, 0.55, 0.65];
      const seed = Date.now() / 600;
      tearsX.forEach((tx, i) => {
        const progress = (seed * 0.3 + i * 0.25) % 1;
        const ty = 0.45 + progress * 0.45;
        ctx.globalAlpha = Math.min(1, (1 - progress) * 2);
        ctx.fillText('💧', tx * w, ty * h);
      });
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'anime', name: 'Anime Style', category: 'fun', emoji: '🌸',
    cssFilter: 'contrast(1.3) saturate(1.8) brightness(1.05)',
    svgId: 'anime-filter',
  },
  {
    id: 'cartoon', name: 'Cartoon 3D', category: 'fun', emoji: '🎨',
    cssFilter: 'contrast(1.4) saturate(2) brightness(1.02)',
    svgId: 'posterize-filter',
  },
  {
    id: 'bigeyes', name: 'Big Eyes', category: 'fun', emoji: '👁️',
    cssFilter: 'brightness(1.05) saturate(1.1)',
    overlay: (ctx, w, h) => {
      const positions = arguments[3];
      if (!positions || positions.length < 70) return;

      const leftEye = positions[27];
      const rightEye = positions[32];
      const eyeDist = Math.sqrt(Math.pow(rightEye[0] - leftEye[0], 2) + Math.pow(rightEye[1] - leftEye[1], 2));
      const eyeR = eyeDist * 0.25;

      [leftEye, rightEye].forEach(eye => {
        const x = eye[0];
        const y = eye[1];
        const grd = ctx.createRadialGradient(x, y, 0, x, y, eyeR * 1.6);
        grd.addColorStop(0, 'rgba(120, 200, 255, 0.25)');
        grd.addColorStop(1, 'rgba(120, 200, 255, 0)');
        ctx.beginPath();
        ctx.arc(x, y, eyeR * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });
    },
  },
  {
    id: 'babyface', name: 'Baby Face', category: 'fun', emoji: '👶',
    cssFilter: 'brightness(1.12) saturate(1.35) contrast(0.9)',
    overlay: (ctx, w, h) => {
      const positions = arguments[3];
      if (!positions || positions.length < 70) return;

      const leftCheek = positions[2];
      const rightCheek = positions[12];
      const noseTip = positions[62];
      const faceWidth = Math.sqrt(Math.pow(rightCheek[0] - leftCheek[0], 2) + Math.pow(rightCheek[1] - leftCheek[1], 2));
      
      [0, 1].forEach((i) => {
        const x = i === 0 ? (leftCheek[0] + noseTip[0]) / 2 : (rightCheek[0] + noseTip[0]) / 2;
        const y = (leftCheek[1] + rightCheek[1]) / 2;
        const r = faceWidth * 0.15;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,130,130,0.4)');
        grd.addColorStop(1, 'rgba(255,130,130,0)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });
    },
  },
  {
    id: 'aianime', name: 'AI Anime', category: 'fun', emoji: '🤖',
    cssFilter: 'saturate(2.2) contrast(1.5) brightness(1.1) hue-rotate(10deg)',
  },
  {
    id: 'aicartoon', name: 'AI Cartoon', category: 'fun', emoji: '🎭',
    cssFilter: 'contrast(1.6) saturate(2.5)',
    svgId: 'sketch-filter',
  },

  // ── TRANSFORM ───────────────────────────────────────────────────────────
  {
    id: 'dogface', name: 'Dog Lens', category: 'transform', emoji: '🐶',
    cssFilter: 'saturate(1.05) brightness(1.02)',
    overlay: (ctx, w, h) => {

      const positions = arguments[3];
      if (!positions || positions.length < 70) return;

      const leftEb = positions[33];
      const rightEb = positions[27];
      const noseTip = positions[62];
      const topHeadX = (leftEb[0] + rightEb[0]) / 2;
      const topHeadY = (leftEb[1] + rightEb[1]) / 2;
      const faceWidth = Math.sqrt(Math.pow(rightEb[0] - leftEb[0], 2) + Math.pow(rightEb[1] - leftEb[1], 2));

      // ── Helper: draw one floppy dog ear ──────────────────────
      const drawEar = (cx, cy, earW, earH, flipX) => {
        ctx.save();
        ctx.translate(cx, cy);
        if (flipX) ctx.scale(-1, 1);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-earW * 0.15, -earH * 0.3, -earW * 0.6, -earH * 0.9, -earW * 0.25, -earH);
        ctx.bezierCurveTo( earW * 0.25, -earH * 1.05, earW * 0.75, -earH * 0.7, earW * 0.5, -earH * 0.2);
        ctx.bezierCurveTo( earW * 0.45, -earH * 0.05, earW * 0.1, earH * 0.05, 0, 0);
        ctx.fillStyle = '#7B4B2A';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -earH * 0.08);
        ctx.bezierCurveTo(-earW * 0.08, -earH * 0.35, -earW * 0.38, -earH * 0.82, -earW * 0.14, -earH * 0.88);
        ctx.bezierCurveTo( earW * 0.12, -earH * 0.92,  earW * 0.48, -earH * 0.65,  earW * 0.32, -earH * 0.18);
        ctx.bezierCurveTo( earW * 0.28, -earH * 0.06,  earW * 0.06, -earH * 0.02,  0, -earH * 0.08);
        ctx.fillStyle = '#f4a0a0';
        ctx.fill();
        ctx.restore();
      };

      const earW = faceWidth * 1.5;
      const earH = faceWidth * 1.8;
      
      // Position ears relative to eyebrows
      drawEar(leftEb[0] - faceWidth * 0.4, leftEb[1] - faceWidth * 0.5, earW, earH, false);
      drawEar(rightEb[0] + faceWidth * 0.4, rightEb[1] - faceWidth * 0.5, earW, earH, true);

      // ── Dog nose ─────────────────────────────────────────────
      const noseX = noseTip[0];
      const noseY = noseTip[1];
      const noseW = faceWidth * 0.4;
      const noseH = faceWidth * 0.2;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(noseX, noseY, noseW, noseH, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a00';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(noseX - noseW * 0.3, noseY - noseH * 0.3, noseW * 0.28, noseH * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.restore();

      // ── Hanging tongue ────────────────────────────────────────
      // Check if mouth is open
      const mouthTop = positions[60][1];
      const mouthBottom = positions[57][1];
      const mouthOpen = (mouthBottom - mouthTop) > (faceWidth * 0.2);

      if (mouthOpen) {
        const tX  = noseX;
        const tY  = positions[57][1] - faceWidth * 0.1;
        const tW  = faceWidth * 0.5;
        const tH  = faceWidth * 0.8;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tX - tW, tY);
        ctx.bezierCurveTo(tX - tW * 1.05, tY + tH * 0.4, tX - tW * 0.9,  tY + tH * 0.85, tX, tY + tH);
        ctx.bezierCurveTo(tX + tW * 0.9,  tY + tH * 0.85, tX + tW * 1.05, tY + tH * 0.4, tX + tW, tY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(tX, tY, tX, tY + tH);
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(0.5, '#dc2626');
        grad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(tX, tY);
        ctx.bezierCurveTo(tX, tY + tH * 0.5, tX, tY + tH * 0.8, tX, tY + tH);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = Math.max(1, faceWidth * 0.05);
        ctx.stroke();
        ctx.restore();
      }
    },
  },
  {
    id: 'genderswap', name: 'Gender Swap', category: 'transform', emoji: '⚥',
    cssFilter: 'hue-rotate(320deg) saturate(1.4) brightness(1.06)',
    overlay: (ctx, w, h) => {
      ctx.font = `${Math.round(w * 0.07)}px serif`;
      ctx.fillText('♀️', w * 0.82, h * 0.1);
    },
  },
  {
    id: 'oldage', name: 'Old Age', category: 'transform', emoji: '👴',
    cssFilter: 'grayscale(0.5) contrast(1.15) brightness(0.9) sepia(0.3)',
    overlay: (ctx, w, h) => {
      ctx.font = `${Math.round(w * 0.07)}px serif`;
      ctx.fillText('👴', w * 0.78, h * 0.08);
    },
  },
  {
    id: 'facestretch', name: 'Face Stretch', category: 'transform', emoji: '🫠',
    cssFilter: 'brightness(1.02)',
    overlay: (ctx, w, h) => {
      ctx.font = `${Math.round(w * 0.07)}px serif`;
      ctx.fillText('🫠', w * 0.04, h * 0.08);
    },
  },
  {
    id: 'alien', name: 'Alien Face', category: 'transform', emoji: '👽',
    cssFilter: 'hue-rotate(120deg) saturate(1.6) brightness(1.1) contrast(1.2)',
    overlay: (ctx, w, h) => {
      ctx.font = `${Math.round(w * 0.1)}px serif`;
      ctx.fillText('👽', w * 0.76, h * 0.08);
    },
  },
  {
    id: 'bigmouth', name: 'Big Mouth', category: 'transform', emoji: '😁',
    cssFilter: 'saturate(1.2) brightness(1.05)',
    overlay: (ctx, w, h) => {
      const positions = arguments[3];
      if (!positions || positions.length < 70) return;

      const mouthCenter = positions[57];
      const leftCheek = positions[2];
      const rightCheek = positions[12];
      const faceWidth = Math.sqrt(Math.pow(rightCheek[0] - leftCheek[0], 2) + Math.pow(rightCheek[1] - leftCheek[1], 2));

      const size = Math.round(faceWidth * 0.8);
      ctx.font = `${size}px serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('😁', mouthCenter[0], mouthCenter[1]);
    },
  },
];

const CATEGORIES = [
  { id: 'beauty',    label: 'Beauty ✨' },
  { id: 'fun',       label: 'Fun 🎉' },
  { id: 'transform', label: 'Transform 🎭' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SVG filter defs (referenced by svgId above)
// ─────────────────────────────────────────────────────────────────────────────
const SvgDefs = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      {/* Anime: sharp edges + glow */}
      <filter id="anime-filter" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.2 0.5 0.8 1" />
          <feFuncG type="discrete" tableValues="0 0.2 0.5 0.8 1" />
          <feFuncB type="discrete" tableValues="0 0.2 0.5 0.8 1" />
        </feComponentTransfer>
      </filter>
      {/* Posterize / cartoon */}
      <filter id="posterize-filter" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.33 0.66 1" />
          <feFuncG type="discrete" tableValues="0 0.33 0.66 1" />
          <feFuncB type="discrete" tableValues="0 0.33 0.66 1" />
        </feComponentTransfer>
      </filter>
      {/* Sketch / AI cartoon */}
      <filter id="sketch-filter" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
        </feComponentTransfer>
        <feBlend mode="multiply" />
      </filter>
    </defs>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef      = useRef(null);
  const overlayCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const animFrameRef  = useRef(null);
  const streamRef     = useRef(null);
  const trackerRef    = useRef(null);

  const [capturedImage, setCapturedImage]   = useState(null);
  const [isFrontCamera, setIsFrontCamera]   = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [activeCategory, setActiveCategory] = useState('beauty');

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async (useFront) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFront ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setError(null);
    } catch {
      setError('Camera permission denied. Please allow camera access.');
    }
  }, []);

  useEffect(() => {
    // Initialize clmtrackr
    if (window.clm && !trackerRef.current) {
        const tracker = new window.clm.tracker();
        tracker.init();
        trackerRef.current = tracker;
    }

    startCamera(isFrontCamera);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (trackerRef.current) trackerRef.current.stop();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isFrontCamera, startCamera]);

  // Start tracking when video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (video && trackerRef.current) {
        const handlePlay = () => {
            trackerRef.current.start(video);
        };
        video.addEventListener('playing', handlePlay);
        return () => video.removeEventListener('playing', handlePlay);
    }
  }, []);

  // ── Animated overlay loop ─────────────────────────────────────────────────
  useEffect(() => {
    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const video  = videoRef.current;
      if (!canvas || !video || !video.videoWidth) {
        animFrameRef.current = requestAnimationFrame(drawOverlay);
        return;
      }
      canvas.width  = video.clientWidth;
      canvas.height = video.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const positions = trackerRef.current ? trackerRef.current.getCurrentPosition() : null;

      if (selectedFilter.overlay) {
        selectedFilter.overlay(ctx, canvas.width, canvas.height, positions);
      }
      animFrameRef.current = requestAnimationFrame(drawOverlay);
    };
    animFrameRef.current = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [selectedFilter]);

  // ── Capture photo ─────────────────────────────────────────────────────────
  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Apply CSS-style filter
    if (selectedFilter.cssFilter !== 'none') ctx.filter = selectedFilter.cssFilter;

    // Mirror for front cam
    if (isFrontCamera) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    // Paint emoji overlay scaled to full resolution
    if (selectedFilter.overlay) {
      ctx.save();
      const positions = trackerRef.current ? trackerRef.current.getCurrentPosition() : null;
      // We need to scale positions since video resolution != clientWidth
      let scaledPositions = null;
      if (positions) {
          const scaleX = canvas.width / video.clientWidth;
          const scaleY = canvas.height / video.clientHeight;
          scaledPositions = positions.map(p => [p[0] * scaleX, p[1] * scaleY]);
      }
      selectedFilter.overlay(ctx, canvas.width, canvas.height, scaledPositions);
      ctx.restore();
    }

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.88));
  };

  const handleSend = () => {
    if (capturedImage) { onCapture(capturedImage); onClose(); }
  };

  const filtersByCategory = FILTERS.filter(f => f.category === activeCategory);
  const videoFilterStyle = selectedFilter.svgId
    ? `${selectedFilter.cssFilter} url(#${selectedFilter.svgId})`
    : selectedFilter.cssFilter;

  return (
    <>
      <SvgDefs />
      <div className="camera-container">
        {/* Close */}
        <button onClick={onClose} className="camera-close-btn">
          <X size={26} />
        </button>

        {/* Filter name badge */}
        {!capturedImage && (
          <div className="camera-filter-badge">
            {selectedFilter.emoji} {selectedFilter.name}
          </div>
        )}

        {/* Camera / preview */}
        <div className="camera-video-wrapper">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef} autoPlay playsInline
                className="camera-video"
                style={{
                  transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                  filter: videoFilterStyle,
                }}
              />
              {/* Animated emoji overlay canvas */}
              <canvas ref={overlayCanvasRef} className="camera-overlay-canvas" />
            </>
          ) : (
            <img src={capturedImage} alt="captured" className="camera-video" />
          )}

          {error && (
            <div className="camera-error-badge">{error}</div>
          )}
        </div>

        {/* Bottom panel */}
        {!capturedImage ? (
          <div className="camera-bottom-panel">

            {/* Category tabs */}
            <div className="camera-category-tabs">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)} 
                  className={`camera-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filter strip */}
            <div className="camera-filter-strip">
              {filtersByCategory.map(f => (
                <button 
                  key={f.id} 
                  onClick={() => setSelectedFilter(f)} 
                  className={`camera-filter-item ${selectedFilter.id === f.id ? 'active' : ''}`}
                >
                  <div className="camera-filter-icon">
                    {f.emoji}
                  </div>
                  <span className="camera-filter-label">{f.name}</span>
                </button>
              ))}
            </div>

            {/* Capture controls */}
            <div className="camera-controls">
              <button onClick={() => setIsFrontCamera(f => !f)} className="camera-flip-btn">
                <FlipHorizontal size={24} />
              </button>

              {/* Shutter button */}
              <button onClick={capturePhoto} className="camera-shutter-btn">
                <div className="camera-shutter-inner" />
              </button>

              <div style={{ width: 52 }} />
            </div>
          </div>
        ) : (
          <div className="camera-result-panel">
            <button onClick={() => setCapturedImage(null)} className="camera-result-btn retake">
              <RotateCcw size={20} /> Retake
            </button>
            <button onClick={handleSend} className="camera-result-btn send">
              <Check size={20} /> Send
            </button>
          </div>
        )}

        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      </div>
    </>
  );
};

export default CameraCapture;
