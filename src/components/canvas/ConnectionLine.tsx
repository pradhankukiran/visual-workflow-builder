import type { ConnectionLineComponentProps } from '@xyflow/react';

/**
 * Custom connection line rendered while the user drags from a handle
 * to create a new edge. Displays an animated dashed line in the accent color.
 */
export default function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  return (
    <g>
      <path
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeDasharray="6 4"
        strokeLinecap="round"
        d={`M${fromX},${fromY} C${fromX + (toX - fromX) / 2},${fromY} ${fromX + (toX - fromX) / 2},${toY} ${toX},${toY}`}
        className="animated"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="10"
          to="0"
          dur="0.6s"
          repeatCount="indefinite"
        />
      </path>
      <circle
        cx={toX}
        cy={toY}
        r={4}
        fill="var(--color-accent)"
        stroke="var(--color-surface-elevated)"
        strokeWidth={1.5}
      />
    </g>
  );
}
