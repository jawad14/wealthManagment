import Link from 'next/link';
import { MAP_EDGES, MAP_NODES, NODE_HEIGHT } from '../content';

/**
 * The map itself, as inline SVG.
 *
 * Inline rather than an image so the boxes are real links, the text is
 * selectable and searchable, and every colour comes from a CSS custom property
 * — which is what makes it survive the dark theme without a second asset.
 *
 * The SVG is described to assistive technology by the `<title>`/`<desc>` pair,
 * and the tables further down the page carry the same relationships as text, so
 * nothing here is the only way to reach the information.
 */
export function MindMapDiagram() {
  return (
    <div className="mm-scroll">
      <svg className="mm-svg" viewBox="0 0 800 540" role="img" aria-labelledby="mm-title mm-desc">
        <title id="mm-title">How Holdfast&rsquo;s records connect</title>
        <desc id="mm-desc">
          Entities own properties and borrow on loans. Properties secure loans and carry leases, shared bills and
          obligations. Those, along with documents and the bank import, feed the expense ledger, which rolls up into the
          dashboard. Loans have no link to expenses.
        </desc>

        <defs>
          <marker id="mm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="mm-arrow-head" />
          </marker>
          <marker id="mm-arrow-absent" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="mm-arrow-head-absent" />
          </marker>
        </defs>

        {MAP_EDGES.map((edge) => (
          <g key={edge.id}>
            <path
              d={edge.d}
              className={edge.kind === 'absent' ? 'mm-edge mm-edge-absent' : 'mm-edge'}
              markerEnd={edge.kind === 'absent' ? 'url(#mm-arrow-absent)' : 'url(#mm-arrow)'}
            />
            {edge.label ? (
              <text
                x={edge.labelX}
                y={edge.labelY}
                textAnchor={edge.labelAnchor ?? 'middle'}
                className={edge.kind === 'absent' ? 'mm-edge-label mm-edge-label-absent' : 'mm-edge-label'}
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        ))}

        {MAP_NODES.map((node) => {
          const body = (
            <>
              <rect x={node.x} y={node.y} width={node.w} height={NODE_HEIGHT} rx="8" className={`mm-box mm-${node.tone}`} />
              <text x={node.x + node.w / 2} y={node.y + 20} textAnchor="middle" className="mm-label">
                {node.label}
              </text>
              <text x={node.x + node.w / 2} y={node.y + 35} textAnchor="middle" className="mm-sub">
                {node.sub}
              </text>
            </>
          );

          return node.href ? (
            <Link key={node.key} href={node.href} className="mm-node">
              {body}
            </Link>
          ) : (
            <g key={node.key}>{body}</g>
          );
        })}
      </svg>
    </div>
  );
}
