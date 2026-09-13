import type { Metadata } from 'next';
import Link from 'next/link';
import { Banner } from '@/shared/components/Banner';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable } from '@/shared/components/DataTable';
import { Icon } from '@/shared/components/Icon';
import { Grid, Stack, Sub } from '@/shared/components/Layout';
import {
  ALWAYS_RAISE,
  KNOWN_GAPS,
  ROUTING,
  RULES,
  WALKTHROUGHS,
  type GapRow,
  type RoutingRow,
} from '@/modules/how-it-works/content';

export const metadata: Metadata = { title: 'How it works · Holdfast' };

/**
 * Tester-facing guide: where each fact is recorded, the rules the figures obey,
 * scripted walkthroughs, and the gaps that are not defects.
 *
 * Deliberately a server component with no tabs or disclosure. A tester needs to
 * search the whole guide at once, and Ctrl+F only reaches what is rendered.
 */
export default function HowItWorksPage() {
  return (
    <Stack>
      <Banner tone="info" icon="i-search" title="Read this before raising a defect">
        Holdfast keeps three things apart on purpose: who <b>owns</b> a property, who <b>borrows</b> against it, and
        what was actually <b>paid</b>. Most surprises come from expecting one screen to hold all three. The last
        section lists behaviour that looks wrong and is not.
      </Banner>

      <Card>
        <CardHeader
          title="Where each fact is recorded"
          aside={<Sub>Find the row that matches what you are trying to enter</Sub>}
        />
        <DataTable<RoutingRow>
          rows={ROUTING}
          rowKey={(row) => row.what}
          columns={[
            { header: 'What you are recording', lead: true, render: (row) => row.what },
            {
              header: 'Goes to',
              mobileLabel: 'Screen',
              render: (row) => (
                <Link className="hiw-link" href={row.href}>
                  {row.screen}
                  <Icon name="i-chev" />
                </Link>
              ),
            },
            { header: 'Why there', mobileLabel: 'Why', render: (row) => <span className="sub">{row.why}</span> },
          ]}
        />
      </Card>

      <Card>
        <CardHeader
          title="The rules the figures obey"
          aside={<Sub>Each rule states what you should be able to observe</Sub>}
        />
        <CardBody>
          <Grid columns={2}>
            {RULES.map((rule) => (
              <div className="hiw-rule" key={`${rule.id}-${rule.title}`}>
                <div className="hiw-rule-h">
                  <Icon name={rule.icon} />
                  <b>{rule.title}</b>
                  <Chip tone="neutral">{rule.id}</Chip>
                </div>
                <p className="ds-note">{rule.body}</p>
                <p className="hiw-observe">
                  <b>What to check</b> {rule.observe}
                </p>
              </div>
            ))}
          </Grid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Walkthroughs" aside={<Sub>Scripted paths through the flows that cause the most confusion</Sub>} />
        <CardBody>
          {WALKTHROUGHS.map((walkthrough, index) => (
            <section className="hiw-walk" key={walkthrough.id}>
              <h4>
                <span className="hiw-num">{index + 1}</span>
                {walkthrough.title}
              </h4>
              <p className="ds-note">{walkthrough.purpose}</p>
              <ol className="hiw-steps">
                {walkthrough.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="hiw-observe">
                <b>Expected</b> {walkthrough.expected}
              </p>
            </section>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Known gaps — please do not raise these"
          aside={<Sub>Verified against the code, not inferred from the screens</Sub>}
        />
        <DataTable<GapRow>
          rows={KNOWN_GAPS}
          rowKey={(row) => row.gap}
          columns={[
            {
              header: 'Area',
              render: (row) => (
                <Chip tone={row.tone} icon={row.tone === 'bad' ? 'i-alert' : 'i-clock'}>
                  {row.area}
                </Chip>
              ),
            },
            { header: 'What is missing', lead: true, render: (row) => row.gap },
            { header: 'Why', mobileLabel: 'Why', render: (row) => <span className="sub">{row.status}</span> },
          ]}
        />
        <CardBody>
          <p className="ds-note">
            <b>Always worth raising, though</b> — these would each mean a rule above has actually broken:
          </p>
          <ul className="hiw-raise">
            {ALWAYS_RAISE.map((symptom) => (
              <li key={symptom}>
                <Icon name="i-alert" />
                {symptom}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </Stack>
  );
}
