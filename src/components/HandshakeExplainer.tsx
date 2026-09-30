import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Onlooker Handshake — animated explainer (cartoon, 6 steps, labeled characters)
 * Drop-in replacement for the wall-of-text handshake explainer.
 * No external deps — plain SVG + CSS animations, self-contained.
 */

const STEPS = [
  {
    title: "1 · Poster funds the bounty",
    caption:
      "The poster describes the property visit and the on-site contact, then funds it. Payment sits in escrow — nothing is released yet.",
  },
  {
    title: "2 · A one-time PIN goes out",
    caption:
      "A one-time 6-digit backup PIN is texted and emailed to the on-site agent. No account needed on their side.",
  },
  {
    title: "3 · Hunter heads to the location",
    caption:
      "The app sends the Hunter straight to the property. They travel to the address on the bounty.",
  },
  {
    title: "4 · On-site, code approved",
    caption:
      "The Hunter taps “I'm on site.” The agent — present or not — sees their name and photo and approves the code.",
  },
  {
    title: "5 · Hunter films & sends it live",
    caption:
      "Once access is granted, the Hunter follows the instructions and records the walkthrough, streaming it straight to the poster.",
  },
  {
    title: "6 · Approved & paid",
    caption:
      "The poster reviews and approves — or after 2 hours it auto-releases either way. Escrow pays out, Hunter's happy.",
  },
];

const STEP_MS = 9500;

function Tag({ label, width = 62 }: { label: string; width?: number }) {
  const half = width / 2;
  return (
    <g transform="translate(0,-40)">
      <rect
        x={-half}
        y={-9}
        width={width}
        height={17}
        rx={8}
        fill="#0A0A0B"
        stroke="#D6FF3E"
        strokeWidth={1.2}
      />
      <text
        x={0}
        y={3.5}
        textAnchor="middle"
        fill="#D6FF3E"
        fontSize={10.5}
        fontWeight={800}
        fontFamily="inherit"
        letterSpacing={0.5}
      >
        {label}
      </text>
    </g>
  );
}

function HouseBackdrop({ skyId }: { skyId: string }) {
  return (
    <>
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2A33" />
          <stop offset="100%" stopColor="#0E1418" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="424" height="200" fill={`url(#${skyId})`} />
      <rect x="0" y="196" width="424" height="64" fill="#152018" />
      <path d="M0,212 L300,200 L424,196 L424,260 L0,260 Z" fill="#1B2620" />
      <g transform="translate(330,196)">
        <rect x="-48" y="-60" width="96" height="60" fill="#20242A" />
        <path d="M-56,-60 L0,-96 L56,-60 Z" fill="#171A1E" />
        <rect x="-10" y="-30" width="20" height="30" fill="#0C0E10" />
        <rect x="18" y="-46" width="16" height="14" rx="1" fill="#D6FF3E" opacity="0.35" />
      </g>
    </>
  );
}

/** Poster / Agent / Hunter body, teal or orange, with a role tag above the head. */
function Person({
  color,
  skin,
  hair,
  tag,
  tagWidth,
}: {
  color: string;
  skin: string;
  hair: string;
  tag: string;
  tagWidth?: number;
}) {
  const light = color === "#2E8B87" ? "#3EA39E" : "#C67C3E";
  return (
    <>
      <rect x="-11" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
      <rect x="3" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
      <path d="M-20,26 Q0,10 20,26 L15,68 Q0,76 -15,68 Z" fill={color} />
      <path d="M-20,26 Q0,10 20,26 L18,34 Q0,20 -18,34 Z" fill={light} />
      <Tag label={tag} width={tagWidth ?? 62} />
      <rect x="-28" y="30" width="9" height="30" rx="4" fill={color} transform="rotate(-25 -24 30)" />
      <rect x="19" y="30" width="9" height="26" rx="4" fill={color} transform="rotate(35 24 34)" />
      <circle cx="0" cy="2" r="19" fill={skin} />
      <circle cx="-6" cy="0" r="2" fill="#20211f" />
      <circle cx="6" cy="0" r="2" fill="#20211f" />
      <path d="M-6,8 Q0,12 6,8" stroke="#20211f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M-19,-2 Q0,-20 19,-2 Q15,-11 0,-13 Q-15,-11 -19,-2 Z" fill={hair} />
    </>
  );
}

export default function HandshakeExplainer() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_MS);
  }, []);

  useEffect(() => {
    if (!paused) start();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    setStep(i);
    if (!paused) start();
  };

  const togglePause = () => {
    setPaused((p) => {
      const next = !p;
      if (next) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        start();
      }
      return next;
    });
  };

  const trackPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        boxSizing: "border-box",
        background: "#0A0A0B",
        color: "#F2F2F3",
        border: "1px solid #222327",
        borderRadius: 20,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        fontFamily:
          '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
      }}
    >
      <style>{`
        .hsx-scene { position: absolute; inset: 0; animation: hsxSceneEnter 0.5s ease both; }
        @keyframes hsxSceneEnter { from { opacity: 0; } to { opacity: 1; } }

        .hsx-paused .hsx-scene *, .hsx-paused .hsx-scene { animation-play-state: paused !important; }

        .hsx-idle { animation: hsxBob 2.6s ease-in-out infinite; transform-origin: center; }
        @keyframes hsxBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }

        .hsx-walk-body { animation: hsxWalkIn 2.3s cubic-bezier(.35,.62,.4,1) both, hsxWalkBob 0.42s ease-in-out 7, hsxBodyBob 0.42s ease-in-out 7; }
        .hsx-walk-body-mid { animation: hsxWalkMid 2.3s cubic-bezier(.4,.2,.4,1) both, hsxWalkBob 0.42s ease-in-out 7, hsxBodyBob 0.42s ease-in-out 7; }
        @keyframes hsxWalkIn { 0% { transform: translateX(-190px); } 100% { transform: translateX(0); } }
        @keyframes hsxWalkMid { 0% { transform: translateX(-210px); } 100% { transform: translateX(84px); } }
        @keyframes hsxWalkBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes hsxBodyBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .hsx-leg-a { animation: hsxLegA 0.42s ease-in-out 7; transform-origin: 0px 60px; }
        .hsx-leg-b { animation: hsxLegB 0.42s ease-in-out 7; transform-origin: 0px 60px; }
        @keyframes hsxLegA { 0%,100% { transform: rotate(18deg); } 50% { transform: rotate(-18deg); } }
        @keyframes hsxLegB { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }
        .hsx-arm-a { animation: hsxLegB 0.42s ease-in-out 7; transform-origin: 0px -4px; }
        .hsx-arm-b { animation: hsxLegA 0.42s ease-in-out 7; transform-origin: 0px -4px; }

        .hsx-pin-bounce { animation: hsxPinBounce 1s ease-in-out infinite; transform-origin: center; }
        @keyframes hsxPinBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .hsx-dash-move { stroke-dasharray: 6 6; animation: hsxDashMove 1.2s linear infinite; }
        @keyframes hsxDashMove { to { stroke-dashoffset: -24; } }

        .hsx-fly-coin { opacity: 0; animation: hsxFlyCoin 1.7s cubic-bezier(.3,.7,.4,1) both; }
        @keyframes hsxFlyCoin {
          0%   { opacity: 0; transform: translate(0,0) scale(0.55); }
          15%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { opacity: 0; transform: translate(190px,-64px) scale(0.85); }
        }
        .hsx-lock-engage { animation: hsxLockEngage 0.6s ease 1.7s both; transform-origin: center; }
        @keyframes hsxLockEngage { 0% { transform: scale(1); } 50% { transform: scale(1.22); } 100% { transform: scale(1); } }
        .hsx-safe-glow { opacity: 0; animation: hsxSafeGlow 0.9s ease 1.7s both; }
        @keyframes hsxSafeGlow { 0% { opacity: 0; } 40% { opacity: 1; } 100% { opacity: 0; } }

        .hsx-fly-phone { animation: hsxFlyPhone 1.5s cubic-bezier(.3,.7,.35,1) both; }
        @keyframes hsxFlyPhone { 0% { transform: translate(0,0); } 100% { transform: translate(196px,10px); } }
        .hsx-digit { opacity: 0; animation: hsxDigitPop 0.3s ease both; }
        @keyframes hsxDigitPop { from { opacity: 0; transform: translateY(4px) scale(0.7); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .hsx-pin-ring { opacity: 0; animation: hsxRingPulse 1.3s ease-out 1.55s infinite; transform-origin: center; }
        @keyframes hsxRingPulse { 0% { opacity: 0.9; transform: scale(0.6); } 100% { opacity: 0; transform: scale(2.1); } }

        .hsx-tap-wave { animation: hsxTapWave 0.6s ease 2.3s 2; transform-origin: center; }
        @keyframes hsxTapWave { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-12deg); } }
        .hsx-handshake-pop { opacity: 0; animation: hsxHsPop 0.6s cubic-bezier(.2,1.4,.4,1) 2.15s both; transform-origin: center; }
        @keyframes hsxHsPop { 0% { opacity: 0; transform: scale(0.2); } 70% { opacity: 1; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }

        .hsx-rec-blink { animation: hsxRecBlink 1s step-end infinite; }
        @keyframes hsxRecBlink { 50% { opacity: 0.25; } }
        .hsx-fly-clip { opacity: 0; animation: hsxFlyClip 1.7s cubic-bezier(.3,.7,.35,1) 0.4s both; }
        @keyframes hsxFlyClip { 0% { opacity: 0; transform: translate(0,0) scale(0.6); } 12% { opacity: 1; } 88% { opacity: 1; } 100% { opacity: 0; transform: translate(150px,-58px) scale(0.9); } }
        .hsx-play-pulse { animation: hsxPlayPulse 1.4s ease-in-out infinite; transform-origin: center; }
        @keyframes hsxPlayPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }

        .hsx-clock-tick { animation: hsxClockTick 1s steps(12) infinite; transform-origin: center; }
        @keyframes hsxClockTick { to { transform: rotate(360deg); } }

        .hsx-lid-open { animation: hsxLidOpen 0.6s ease both; transform-origin: left center; }
        @keyframes hsxLidOpen { 0% { transform: rotate(0deg); } 100% { transform: rotate(-32deg); } }
        .hsx-arc-coin { opacity: 0; animation: hsxArcCoin 1.6s cubic-bezier(.3,.6,.3,1) both; }
        @keyframes hsxArcCoin {
          0%   { opacity: 0; transform: translate(0,0); }
          10%  { opacity: 1; }
          50%  { transform: translate(-60px,70px); }
          88%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-110px,128px); }
        }
        .hsx-check-draw { stroke-dasharray: 14; stroke-dashoffset: 14; animation: hsxCheckDraw 0.45s ease 1.9s forwards; }
        @keyframes hsxCheckDraw { to { stroke-dashoffset: 0; } }
        .hsx-badge-pop { opacity: 0; animation: hsxBadgePop 0.5s cubic-bezier(.2,1.4,.4,1) 1.75s both; transform-origin: center; }
        @keyframes hsxBadgePop { 0% { opacity: 0; transform: scale(0.3); } 100% { opacity: 1; transform: scale(1); } }
        .hsx-cheer { animation: hsxCheer 0.6s ease 2.1s 2; transform-origin: center; }
        @keyframes hsxCheer { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-14deg); } }
        .hsx-confetti { opacity: 0; animation: hsxConfetti 1.3s ease-out both; }
        @keyframes hsxConfetti { 0% { opacity: 0; transform: translate(0,0) rotate(0deg); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), 46px) rotate(140deg); } }

        .hsx-dot { width: 8px; height: 8px; border-radius: 50%; background: #2A2B2E; border: none; padding: 0; cursor: pointer; transition: background 0.2s ease, transform 0.2s ease; }
        .hsx-dot.hsx-on { background: #D6FF3E; transform: scale(1.3); }
        .hsx-track-fill { position: absolute; top: 0; left: 0; bottom: 0; background: #D6FF3E; border-radius: 999px; transition: width 0.45s ease; }
        .hsx-playbtn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid #2A2B2E; background: #131417; color: #E8E8EA; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; flex-shrink: 0; }
        .hsx-playbtn:hover { border-color: #D6FF3E; color: #D6FF3E; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8B8C90" }}>
          The Onlooker Handshake
          <sup style={{ fontSize: "0.7em", letterSpacing: 0, marginLeft: 1 }}>™</sup>
        </div>
        <button
          className="hsx-playbtn"
          onClick={togglePause}
          aria-label={paused ? "Play animation" : "Pause animation"}
        >
          {paused ? "▶" : "❙❙"}
        </button>
      </div>

      <div
        className={paused ? "hsx-paused" : ""}
        style={{ position: "relative", width: "100%", maxWidth: 424, height: 260, borderRadius: 16, overflow: "hidden", flexShrink: 0 }}
      >
        {step === 0 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <HouseBackdrop skyId="hsxSky0" />
              <g transform="translate(74,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <Person color="#2E8B87" skin="#E8B88A" hair="#4A3B2B" tag="POSTER" />
                </g>
                <rect x="16" y="20" width="16" height="24" rx="3" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.2" />
              </g>

              <circle className="hsx-fly-coin" cx="94" cy="118" r="6" fill="#D6FF3E" style={{ animationDelay: "0.1s" }} />
              <circle className="hsx-fly-coin" cx="94" cy="128" r="5" fill="#D6FF3E" style={{ animationDelay: "0.4s" }} />
              <circle className="hsx-fly-coin" cx="94" cy="110" r="5" fill="#D6FF3E" style={{ animationDelay: "0.7s" }} />

              <circle className="hsx-safe-glow" cx="300" cy="54" r="50" fill="#D6FF3E" opacity="0.14" />
              <g transform="translate(300,54)">
                <rect x="-40" y="-26" width="80" height="52" rx="10" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.6" />
                <circle className="hsx-lock-engage" cx="0" cy="6" r="10" fill="none" stroke="#D6FF3E" strokeWidth="1.6" />
                <circle cx="0" cy="6" r="2" fill="#D6FF3E" />
                <text x="0" y="-12" textAnchor="middle" fill="#9A9A9E" fontSize="10" fontFamily="inherit">ESCROW</text>
              </g>
            </svg>
          </div>
        )}

        {step === 1 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <HouseBackdrop skyId="hsxSky1" />
              <g transform="translate(74,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <Person color="#2E8B87" skin="#E8B88A" hair="#4A3B2B" tag="POSTER" />
                </g>
              </g>

              <g transform="translate(300,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <Person color="#B0672E" skin="#C98A5B" hair="#241F1C" tag="AGENT" tagWidth={54} />
                </g>
              </g>

              <g transform="translate(94,90)">
                <g className="hsx-fly-phone">
                  <circle className="hsx-pin-ring" cx="0" cy="0" r="20" fill="none" stroke="#D6FF3E" strokeWidth="1.2" />
                  <rect x="-40" y="-18" width="80" height="36" rx="10" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.4" />
                  {["4", "8", "2", "1", "6", "7"].map((d, i) => (
                    <text
                      key={i}
                      className="hsx-digit"
                      x={-30 + i * 12}
                      y="6"
                      textAnchor="middle"
                      fill="#D6FF3E"
                      fontSize="14"
                      fontFamily="inherit"
                      style={{ animationDelay: `${1.55 + i * 0.13}s` }}
                    >
                      {d}
                    </text>
                  ))}
                </g>
              </g>
            </svg>
          </div>
        )}

        {step === 2 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <defs>
                <linearGradient id="hsxSky2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B2A33" />
                  <stop offset="100%" stopColor="#0E1418" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="424" height="200" fill="url(#hsxSky2)" />
              <rect x="0" y="196" width="424" height="64" fill="#152018" />
              <path d="M0,220 L424,214 L424,260 L0,260 Z" fill="#1B2620" />
              <path className="hsx-dash-move" d="M0,232 L424,224" stroke="#3A3D42" strokeWidth="2" fill="none" />
              <g transform="translate(330,196)">
                <rect x="-48" y="-60" width="96" height="60" fill="#20242A" />
                <path d="M-56,-60 L0,-96 L56,-60 Z" fill="#171A1E" />
                <rect x="-10" y="-30" width="20" height="30" fill="#0C0E10" />
                <rect x="18" y="-46" width="16" height="14" rx="1" fill="#D6FF3E" opacity="0.35" />
              </g>

              <g className="hsx-pin-bounce" transform="translate(330,64)">
                <path d="M0,-14 C9,-14 15,-8 15,0 C15,10 0,22 0,22 C0,22 -15,10 -15,0 C-15,-8 -9,-14 0,-14 Z" fill="#D6FF3E" />
                <circle cx="0" cy="0" r="5" fill="#0A0A0B" />
              </g>

              <g transform="translate(60,112)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.3" style={{ animation: "hsxWalkMid 2.3s cubic-bezier(.4,.2,.4,1) both" }} />
                <g className="hsx-walk-body-mid">
                  <g className="hsx-leg-a" transform="translate(-4,0)"><rect x="-11" y="62" width="9" height="30" rx="4" fill="#2B2D31" /></g>
                  <g className="hsx-leg-b" transform="translate(4,0)"><rect x="3" y="62" width="9" height="30" rx="4" fill="#2B2D31" /></g>
                  <path d="M-20,26 Q0,10 20,26 L15,68 Q0,76 -15,68 Z" fill="#2E8B87" />
                  <path d="M-20,26 Q0,10 20,26 L18,34 Q0,20 -18,34 Z" fill="#3EA39E" />
                  <Tag label="HUNTER" width={62} />
                  <g className="hsx-arm-a" transform="translate(-24,36)"><rect x="-4" y="0" width="9" height="26" rx="4" fill="#2E8B87" /></g>
                  <g className="hsx-arm-b" transform="translate(24,36)"><rect x="-4" y="0" width="9" height="26" rx="4" fill="#2E8B87" /></g>
                  <circle cx="0" cy="2" r="19" fill="#E8B88A" />
                  <circle cx="-6" cy="0" r="2" fill="#20211f" />
                  <circle cx="6" cy="0" r="2" fill="#20211f" />
                  <path d="M-6,8 Q0,13 6,8" stroke="#20211f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M-19,-2 Q0,-20 19,-2 Q15,-11 0,-13 Q-15,-11 -19,-2 Z" fill="#4A3B2B" />
                </g>
              </g>
            </svg>
          </div>
        )}

        {step === 3 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <HouseBackdrop skyId="hsxSky3" />

              <g transform="translate(272,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <g className="hsx-tap-wave">
                    <Person color="#B0672E" skin="#C98A5B" hair="#241F1C" tag="AGENT" tagWidth={54} />
                  </g>
                </g>
              </g>

              <g transform="translate(196,108)">
                <ellipse className="hsx-walk-body" cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.3" style={{ animation: "hsxWalkIn 2.3s cubic-bezier(.35,.62,.4,1) both" }} />
                <g className="hsx-walk-body">
                  <g className="hsx-leg-a" transform="translate(-4,0)"><rect x="-11" y="62" width="9" height="30" rx="4" fill="#2B2D31" /></g>
                  <g className="hsx-leg-b" transform="translate(4,0)"><rect x="3" y="62" width="9" height="30" rx="4" fill="#2B2D31" /></g>
                  <path d="M-20,26 Q0,10 20,26 L15,68 Q0,76 -15,68 Z" fill="#2E8B87" />
                  <path d="M-20,26 Q0,10 20,26 L18,34 Q0,20 -18,34 Z" fill="#3EA39E" />
                  <Tag label="HUNTER" width={62} />
                  <g className="hsx-arm-a" transform="translate(-24,36)"><rect x="-4" y="0" width="9" height="26" rx="4" fill="#2E8B87" /></g>
                  <g className="hsx-arm-b" transform="translate(24,36)"><rect x="-4" y="0" width="9" height="26" rx="4" fill="#2E8B87" /></g>
                  <circle cx="0" cy="2" r="19" fill="#E8B88A" />
                  <circle cx="-6" cy="0" r="2" fill="#20211f" />
                  <circle cx="6" cy="0" r="2" fill="#20211f" />
                  <path d="M-6,8 Q0,13 6,8" stroke="#20211f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M-19,-2 Q0,-20 19,-2 Q15,-11 0,-13 Q-15,-11 -19,-2 Z" fill="#4A3B2B" />
                </g>
              </g>

              <g transform="translate(234,170)">
                <g className="hsx-handshake-pop">
                  <circle cx="0" cy="0" r="16" fill="#0A0A0B" stroke="#D6FF3E" strokeWidth="1.6" />
                  <path className="hsx-check-draw" d="M-6,1 L-1,5 L6,-4" stroke="#D6FF3E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={14} />
                </g>
              </g>
            </svg>
          </div>
        )}

        {step === 4 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <HouseBackdrop skyId="hsxSky4" />

              <g transform="translate(240,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <rect x="-11" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
                  <rect x="3" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
                  <path d="M-20,26 Q0,10 20,26 L15,68 Q0,76 -15,68 Z" fill="#2E8B87" />
                  <path d="M-20,26 Q0,10 20,26 L18,34 Q0,20 -18,34 Z" fill="#3EA39E" />
                  <Tag label="HUNTER" width={62} />
                  <rect x="-28" y="30" width="9" height="20" rx="4" fill="#2E8B87" transform="rotate(-70 -24 30)" />
                  <rect x="19" y="18" width="9" height="30" rx="4" fill="#2E8B87" transform="rotate(-95 24 20)" />
                  <circle cx="0" cy="2" r="19" fill="#E8B88A" />
                  <circle cx="-6" cy="0" r="2" fill="#20211f" />
                  <circle cx="6" cy="0" r="2" fill="#20211f" />
                  <path d="M-6,8 Q0,12 6,8" stroke="#20211f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  <path d="M-19,-2 Q0,-20 19,-2 Q15,-11 0,-13 Q-15,-11 -19,-2 Z" fill="#4A3B2B" />
                  <g transform="translate(0,-4)">
                    <rect x="10" y="-4" width="13" height="20" rx="2" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.2" />
                    <circle className="hsx-rec-blink" cx="16.5" cy="1" r="1.6" fill="#FF5A5F" />
                  </g>
                </g>
              </g>

              <g transform="translate(252,88)">
                <g className="hsx-fly-clip">
                  <rect x="-13" y="-9" width="26" height="18" rx="4" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.3" />
                  <path className="hsx-play-pulse" d="M-3,-4 L-3,4 L5,0 Z" fill="#D6FF3E" />
                </g>
              </g>

              <g transform="translate(96,80)">
                <rect x="-24" y="-30" width="48" height="60" rx="8" fill="#16171A" stroke="#D6FF3E" strokeWidth="1.4" />
                <rect x="-18" y="-22" width="36" height="24" rx="3" fill="#0E0F11" />
                <path className="hsx-play-pulse" d="M-4,-14 L-4,-2 L6,-8 Z" fill="#D6FF3E" />
                <text x="0" y="8" textAnchor="middle" fill="#9A9A9E" fontSize="8" fontFamily="inherit">LIVE FEED</text>
                <rect x="-14" y="16" width="28" height="6" rx="3" fill="#2A2B2E" />
              </g>
            </svg>
          </div>
        )}

        {step === 5 && (
          <div className="hsx-scene">
            <svg viewBox="0 0 424 260" width="100%" height="100%">
              <HouseBackdrop skyId="hsxSky5" />

              <g transform="translate(300,54)">
                <rect x="-46" y="-28" width="92" height="56" rx="10" fill="#16171A" stroke="#3A3D42" strokeWidth="1.6" />
                <g transform="translate(-46,-28)">
                  <rect className="hsx-lid-open" x="0" y="0" width="92" height="12" rx="5" fill="#3A3D42" />
                </g>
                <g className="hsx-clock-tick" transform="translate(-22,6)">
                  <circle r="9" fill="none" stroke="#9A9A9E" strokeWidth="1.4" />
                  <path d="M0,0 L0,-6 M0,0 L4,1" stroke="#9A9A9E" strokeWidth="1.3" strokeLinecap="round" fill="none" />
                </g>
                <text x="2" y="-12" textAnchor="middle" fill="#9A9A9E" fontSize="8.5" fontFamily="inherit">APPROVED OR 2H</text>
              </g>

              <circle className="hsx-arc-coin" cx="284" cy="70" r="6" fill="#D6FF3E" style={{ animationDelay: "0.2s" }} />
              <circle className="hsx-arc-coin" cx="292" cy="62" r="5" fill="#D6FF3E" style={{ animationDelay: "0.5s" }} />
              <circle className="hsx-arc-coin" cx="276" cy="64" r="5" fill="#D6FF3E" style={{ animationDelay: "0.8s" }} />

              <rect className="hsx-confetti" x="270" y="105" width="5" height="5" fill="#D6FF3E" style={{ "--dx": "-28px", animationDelay: "1.55s" } as React.CSSProperties} />
              <rect className="hsx-confetti" x="300" y="100" width="5" height="5" fill="#3EA39E" style={{ "--dx": "14px", animationDelay: "1.7s" } as React.CSSProperties} />
              <rect className="hsx-confetti" x="285" y="95" width="5" height="5" fill="#E8B88A" style={{ "--dx": "-6px", animationDelay: "1.85s" } as React.CSSProperties} />

              <g transform="translate(196,108)">
                <ellipse cx="0" cy="93" rx="20" ry="5" fill="#000" opacity="0.35" />
                <g className="hsx-idle">
                  <g className="hsx-cheer">
                    <rect x="-11" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
                    <rect x="3" y="62" width="9" height="30" rx="4" fill="#2B2D31" />
                    <path d="M-20,26 Q0,10 20,26 L15,68 Q0,76 -15,68 Z" fill="#2E8B87" />
                    <path d="M-20,26 Q0,10 20,26 L18,34 Q0,20 -18,34 Z" fill="#3EA39E" />
                    <Tag label="HUNTER" width={62} />
                    <rect x="16" y="6" width="9" height="30" rx="4" fill="#2E8B87" transform="rotate(-100 20 10)" />
                    <rect x="-28" y="32" width="9" height="26" rx="4" fill="#2E8B87" transform="rotate(20 -24 32)" />
                    <circle cx="0" cy="2" r="19" fill="#E8B88A" />
                    <circle cx="-6" cy="0" r="2" fill="#20211f" />
                    <circle cx="6" cy="0" r="2" fill="#20211f" />
                    <path d="M-7,7 Q0,15 7,7" stroke="#20211f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M-19,-2 Q0,-20 19,-2 Q15,-11 0,-13 Q-15,-11 -19,-2 Z" fill="#4A3B2B" />
                  </g>
                </g>
              </g>

              <g transform="translate(196,56)">
                <g className="hsx-badge-pop">
                  <circle cx="0" cy="0" r="14" fill="#0A0A0B" stroke="#D6FF3E" strokeWidth="1.6" />
                  <path className="hsx-check-draw" d="M-5,0 L-1,4 L5,-5" stroke="#D6FF3E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={14} style={{ animationDelay: "2.1s" }} />
                </g>
              </g>
            </svg>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", minHeight: 64, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{STEPS[step]?.title}</div>
        <div style={{ fontSize: 13, color: "#9A9A9E", lineHeight: 1.5, maxWidth: 380 }}>{STEPS[step]?.caption}</div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 3, background: "#1A1B1E", borderRadius: 999 }}>
        <div className="hsx-track-fill" style={{ width: `${trackPct}%` }} />
      </div>

      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <button
            key={i}
            className={`hsx-dot ${i === step ? "hsx-on" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Step ${i + 1}: ${s.title}`}
          />
        ))}
      </div>
    </div>
  );
}
