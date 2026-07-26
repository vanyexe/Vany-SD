'use client';

import { useEffect, useRef, useState } from 'react';
import { PHASES } from '@/lib/data/seed';

type Props = {
  currentPhase: number;          // 1–6
  phaseProgress: number;         // 0–1 within current phase
  completedMilestones: number[]; // list of month numbers checked
  onPhaseClick?: (phaseId: number) => void;
};

const VIEWBOX_W = 750;
const VIEWBOX_H = 120;
const PADDING_X = 40;
const LINE_Y = 55;

// Maps a month (1-24) to an X coordinate on the track
function getMonthX(month: number): number {
  // 23 intervals between month 1 and 24
  const t = (month - 1) / 23;
  return PADDING_X + t * (VIEWBOX_W - PADDING_X * 2);
}

export default function RouteVisualization({
  currentPhase,
  phaseProgress,
  completedMilestones,
  onPhaseClick,
}: Props) {
  const [animatedProgress, setAnimatedProgress] = useState(phaseProgress);
  const [pulsing, setPulsing] = useState(false);
  const prevProgressRef = useRef(phaseProgress);

  useEffect(() => {
    if (phaseProgress !== prevProgressRef.current) {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 700);
      prevProgressRef.current = phaseProgress;
    }
    const timer = setTimeout(() => setAnimatedProgress(phaseProgress), 50);
    return () => clearTimeout(timer);
  }, [phaseProgress]);

  // The current phase node index (0-based)
  const currentIdx = currentPhase - 1;
  const phaseStart = PHASES[currentIdx].monthStart;
  const phaseEnd = PHASES[currentIdx].monthEnd;
  const phaseMonths = phaseEnd - phaseStart;

  // Convert progress (0-1) to an actual month offset
  const currentMonthDecimal = phaseMonths === 0 ? phaseStart : phaseStart + animatedProgress * phaseMonths;
  const markerX = getMonthX(currentMonthDecimal);

  const goldEndX = Math.min(markerX, getMonthX(24));

  // Milestone ticks along the route (24 months total, distributed)
  const tickData = Array.from({ length: 24 }, (_, i) => {
    const month = i + 1;
    const x = getMonthX(month);
    const isPassed = completedMilestones.includes(month);
    return { month, x, isPassed };
  });

  // Overall % complete label
  const totalMonths = 24;
  const completedMonths = (currentPhase - 1) * 4 + Math.round(phaseProgress * 4); // rough
  const overallPct = Math.round((completedMonths / totalMonths) * 100);

  return (
    <div className="w-full relative py-4">
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label={`Journey route: Phase ${currentPhase} of 6, ${overallPct}% complete`}
      >
        {/* ── Background track (muted) ── */}
        <line
          x1={getMonthX(1)} y1={LINE_Y}
          x2={getMonthX(24)} y2={LINE_Y}
          stroke="#2E3245"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* ── Gold completed segment ── */}
        <line
          x1={getMonthX(1)} y1={LINE_Y}
          x2={goldEndX}  y2={LINE_Y}
          stroke="#D6A24C"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ transition: 'x2 0.5s ease' }}
        />

        {/* ── Pulse animation line (fires on progress update) ── */}
        {pulsing && (
          <line
            x1={getMonthX(1)} y1={LINE_Y}
            x2={goldEndX}  y2={LINE_Y}
            stroke="#D6A24C"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.6}
            className="route-pulse"
          />
        )}

        {/* ── Milestone ticks ── */}
        {tickData.map(({ month, x, isPassed }) => (
          <line
            key={month}
            x1={x} y1={LINE_Y - 8}
            x2={x} y2={LINE_Y + 8}
            stroke={isPassed ? '#D6A24C' : '#2E3245'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}

        {/* ── Phase waypoint nodes ── */}
        {PHASES.map((phase, i) => {
          const x = getMonthX(phase.monthStart);
          const isCompleted = phase.id < currentPhase;
          const isActive = phase.id === currentPhase;
          const isFuture = phase.id > currentPhase;

          return (
            <g
              key={phase.id}
              onClick={() => onPhaseClick?.(phase.id)}
              style={{ cursor: onPhaseClick ? 'pointer' : 'default' }}
              role={onPhaseClick ? 'button' : undefined}
              aria-label={`Phase ${phase.id}: ${phase.title}`}
            >
              {/* Glow ring for active node */}
              {isActive && (
                <circle
                  cx={x} cy={LINE_Y}
                  r={28}
                  fill="rgba(214,162,76,0.12)"
                  className="animate-pulse-gold"
                />
              )}

              {/* Main circle */}
              <circle
                cx={x} cy={LINE_Y}
                r={isActive ? 20 : isCompleted ? 16 : 13}
                fill={isCompleted ? '#3FA793' : isActive ? '#D6A24C' : '#1C1F28'}
                stroke={isCompleted ? '#3FA793' : isActive ? '#D6A24C' : '#3A3F52'}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ transition: 'all 0.4s ease' }}
              />

              {/* Check mark for completed */}
              {isCompleted && (
                <text
                  x={x} y={LINE_Y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#14161C"
                  fontSize={12}
                  fontWeight="bold"
                >✓</text>
              )}

              {/* Phase number for active/future */}
              {!isCompleted && (
                <text
                  x={x} y={LINE_Y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isActive ? '#14161C' : '#5A6070'}
                  fontSize={isActive ? 11 : 10}
                  fontWeight={isActive ? '700' : '500'}
                  fontFamily="var(--font-mono)"
                >
                  {String(phase.id).padStart(2, '0')}
                </text>
              )}

              {/* Phase label below */}
              <text
                x={x} y={LINE_Y + (isActive ? 34 : 28)}
                textAnchor="middle"
                fill={isActive ? '#D6A24C' : isCompleted ? '#3FA793' : '#5A6070'}
                fontSize={isActive ? 12 : 11}
                fontWeight={isActive ? '600' : '400'}
                fontFamily="var(--font-mono)"
              >
                P{phase.id}
              </text>

              {/* Current phase subtitle under label */}
              {isActive && (
                <text
                  x={x} y={LINE_Y + 50}
                  textAnchor="middle"
                  fill="#9297A6"
                  fontSize={9}
                  fontFamily="var(--font-body)"
                >
                  {phase.subtitle.slice(0, 18)}…
                </text>
              )}
            </g>
          );
        })}

        {/* ── Progress marker ── */}
        <g>
          {/* Drop shadow filter */}
          <defs>
            <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Glow */}
          <circle
            cx={markerX} cy={LINE_Y}
            r={18}
            fill="rgba(214,162,76,0.2)"
            style={{ transition: 'cx 0.5s ease' }}
          />

          {/* Marker outer ring */}
          <circle
            cx={markerX} cy={LINE_Y}
            r={14}
            fill="#1C1F28"
            stroke="#D6A24C"
            strokeWidth={2.5}
            style={{ transition: 'cx 0.5s ease' }}
          />

          {/* Progress % inside marker */}
          <text
            x={markerX} y={LINE_Y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#D6A24C"
            fontSize={8}
            fontWeight="700"
            fontFamily="var(--font-mono)"
            style={{ transition: 'x 0.5s ease' }}
          >
            {overallPct}%
          </text>

          {/* Tooltip above marker */}
          <text
            x={markerX} y={LINE_Y - 26}
            textAnchor="middle"
            fill="#EDEEF2"
            fontSize={10}
            fontFamily="var(--font-body)"
            fontWeight="500"
            style={{ transition: 'x 0.5s ease' }}
          >
            Phase {currentPhase}
          </text>
        </g>

        {/* ── Flag at node 6 ── */}
        <g>
          <text x={getMonthX(24) + 2} y={LINE_Y - 30} textAnchor="middle" fontSize={14}>🏁</text>
          <text
            x={getMonthX(24)} y={LINE_Y - 16}
            textAnchor="middle"
            fill="#5A6070"
            fontSize={9}
            fontFamily="var(--font-mono)"
          >
            Month 24
          </text>
        </g>
      </svg>
    </div>
  );
}
