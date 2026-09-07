import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Sub } from '@/shared/components/Layout';

/**
 * Ownership diagram.
 *
 * Solid arrows are ownership and carry a share; dashed arrows are control
 * relationships (director, trustee) and carry none — which is exactly the
 * distinction BR-02 depends on, so the legend below the diagram is required
 * reading, not decoration.
 */
export function OwnershipMap() {
  return (
    <Card>
      <CardHeader title="Ownership map" aside={<Sub>Dated relationships</Sub>} />
      <CardBody>
        <svg
          viewBox="0 0 420 330"
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="Diagram of entities and the assets they own"
        >
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 10 5 0 10z" fill="var(--faint)" />
            </marker>
          </defs>

          <g stroke="var(--faint)" strokeWidth="1.2" fill="none" markerEnd="url(#arr)">
            <path d="M80 70v40" />
            <path d="M80 150v40" />
            <path d="M80 230v40" />
            <path d="M230 70v40" />
            <path d="M230 150v40" />
            <path d="M340 70v40" />
            <path d="M130 50h60" strokeDasharray="4 3" />
            <path d="M280 130h40 v-60" strokeDasharray="4 3" />
          </g>

          <g fontFamily="IBM Plex Sans, sans-serif" fontSize="11">
            <rect x="30" y="30" width="100" height="40" rx="8" fill="var(--info-bg)" />
            <text x="80" y="47" textAnchor="middle" fill="var(--info)" fontWeight="600">Jawad</text>
            <text x="80" y="61" textAnchor="middle" fill="var(--info)">Individual</text>

            <rect x="190" y="30" width="100" height="40" rx="8" fill="var(--gold-soft)" />
            <text x="240" y="47" textAnchor="middle" fill="var(--gold-deep)" fontWeight="600">Esteem Dev</text>
            <text x="240" y="61" textAnchor="middle" fill="var(--gold-deep)">Company</text>

            <rect x="300" y="30" width="100" height="40" rx="8" fill="var(--info-bg)" />
            <text x="350" y="47" textAnchor="middle" fill="var(--info)" fontWeight="600">Mahvish</text>
            <text x="350" y="61" textAnchor="middle" fill="var(--info)">Individual</text>

            <rect x="30" y="110" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="80" y="127" textAnchor="middle" fill="var(--text)" fontWeight="500">Watson Rd</text>
            <text x="80" y="141" textAnchor="middle" fill="var(--muted)">50 / 50 · own home</text>

            <rect x="180" y="110" width="100" height="40" rx="8" fill="var(--good-bg)" />
            <text x="230" y="127" textAnchor="middle" fill="var(--good)" fontWeight="600">Family Trust</text>
            <text x="230" y="141" textAnchor="middle" fill="var(--good)">trustee: Esteem</text>

            <rect x="300" y="110" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="350" y="127" textAnchor="middle" fill="var(--text)" fontWeight="500">20 Benton St</text>
            <text x="350" y="141" textAnchor="middle" fill="var(--muted)">Esteem · 100%</text>

            <rect x="30" y="190" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="80" y="207" textAnchor="middle" fill="var(--text)" fontWeight="500">Loan → S. Khalid</text>
            <text x="80" y="221" textAnchor="middle" fill="var(--muted)">receivable</text>

            <rect x="180" y="190" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="230" y="207" textAnchor="middle" fill="var(--text)" fontWeight="500">166 Compton Rd</text>
            <text x="230" y="221" textAnchor="middle" fill="var(--muted)">Trust · 100% · 6 rooms</text>

            <rect x="30" y="270" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="80" y="287" textAnchor="middle" fill="var(--text)" fontWeight="500">Siddique SMSF</text>
            <text x="80" y="301" textAnchor="middle" fill="var(--muted)">member · not consolidated</text>

            <rect x="180" y="270" width="100" height="40" rx="8" fill="var(--surface-2)" stroke="var(--line)" />
            <text x="230" y="287" textAnchor="middle" fill="var(--text)" fontWeight="500">Mians Rd</text>
            <text x="230" y="301" textAnchor="middle" fill="var(--muted)">Trust · 100% · vacant</text>

            <path d="M230 230v40" stroke="var(--faint)" strokeWidth="1.2" fill="none" markerEnd="url(#arr)" />
            <text x="160" y="46" fill="var(--faint)" fontSize="10">director</text>
            <text x="318" y="100" fill="var(--faint)" fontSize="10">trustee</text>
          </g>
        </svg>

        <p className="sub" style={{ fontSize: 12, margin: '10px 0 0' }}>
          Dashed lines are control relationships (director, trustee) and carry no ownership share. Beneficiary status
          never assigns a percentage automatically.
        </p>
      </CardBody>
    </Card>
  );
}
