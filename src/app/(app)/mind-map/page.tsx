import type { Metadata } from 'next';
import Link from 'next/link';
import { Banner } from '@/shared/components/Banner';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable } from '@/shared/components/DataTable';
import { Icon } from '@/shared/components/Icon';
import { Stack, Sub } from '@/shared/components/Layout';
import { MindMapDiagram } from '@/modules/mind-map/components/MindMapDiagram';
import { CONNECTIONS, ENTRY_STEPS, MISSING_EDGES, type Connection } from '@/modules/mind-map/content';

export const metadata: Metadata = { title: 'Mind map · Holdfast' };

/**
 * The shape of the system in one screen: the map, the order to enter data in,
 * what joins to what, and the joins that do not exist.
 */
export default function MindMapPage() {
  return (
    <Stack>
      <Banner tone="info" icon="i-link" title="Read the map from the top down">
        Entities are the root — nothing can be recorded without one. Each layer below can only be entered once the layer
        above exists, which is why the numbered sequence is a sequence and not a menu. Boxes on the map are links.
      </Banner>

      <Card>
        <CardHeader
          title="How everything connects"
          aside={<Sub>Gold is the trunk · dashed red marks a record you cannot create</Sub>}
        />
        <CardBody>
          <MindMapDiagram />
          <div className="mm-legend">
            <span>
              <i className="mm-key mm-key-spine" /> The trunk — everything hangs off these
            </span>
            <span>
              <i className="mm-key mm-key-branch" /> Records that attach to a property
            </span>
            <span>
              <i className="mm-key mm-key-blocked" /> Cannot be created in the app
            </span>
            <span>
              <i className="mm-key mm-key-derived" /> Computed, never stored
            </span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Entering data, step by step"
          aside={<Sub>The order is set by what each form requires, not by preference</Sub>}
        />
        <CardBody>
          {ENTRY_STEPS.map((step) => (
            <section className="mm-step" key={step.order}>
              <div className="mm-step-n">{step.order}</div>
              <div className="mm-step-body">
                <h4>
                  {step.href ? (
                    <Link className="hiw-link" href={step.href}>
                      {step.title}
                      <Icon name="i-chev" />
                    </Link>
                  ) : (
                    step.title
                  )}
                  {step.tone === 'bad' ? (
                    <Chip tone="bad" icon="i-alert">
                      No form exists
                    </Chip>
                  ) : null}
                </h4>

                {step.required.length > 0 ? (
                  <p className="mm-req">
                    {step.required.map((field) => (
                      <Chip key={field} tone="neutral">
                        {field}
                      </Chip>
                    ))}
                  </p>
                ) : null}

                <dl className="mm-pair">
                  <dt>Needs first</dt>
                  <dd>{step.needs}</dd>
                  <dt>Unlocks</dt>
                  <dd>{step.unlocks}</dd>
                </dl>

                {step.note ? <p className="ds-note">{step.note}</p> : null}
              </div>
            </section>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What joins to what" aside={<Sub>The same edges as the map, with the field that holds them together</Sub>} />
        <DataTable<Connection>
          rows={CONNECTIONS}
          rowKey={(row) => `${row.from}-${row.relation}-${row.to}`}
          columns={[
            {
              header: 'Relationship',
              lead: true,
              render: (row) => (
                <span className="mm-rel">
                  <Icon name={row.icon} />
                  <b>{row.from}</b>
                  <em>{row.relation}</em>
                  <b>{row.to}</b>
                </span>
              ),
            },
            { header: 'What holds it together', mobileLabel: 'Held by', render: (row) => <span className="sub">{row.joinedBy}</span> },
          ]}
        />
      </Card>

      <Card>
        <CardHeader
          title="Joins you will look for and not find"
          aside={<Sub>What the map cannot show, because the data has nowhere to put it</Sub>}
        />
        <CardBody>
          {MISSING_EDGES.map((edge) => (
            <div className="mm-missing" key={edge.between}>
              <h4>
                <Icon name="i-alert" />
                {edge.between}
              </h4>
              <p className="ds-note">{edge.consequence}</p>
              <p className="hiw-observe">
                <b>What to do instead</b> {edge.workaround}
              </p>
            </div>
          ))}
          <p className="ds-note" style={{ marginTop: 14 }}>
            These are recorded as known gaps on{' '}
            <Link className="hiw-link" href="/how-it-works">
              How it works
              <Icon name="i-chev" />
            </Link>{' '}
            — please do not raise them as defects.
          </p>
        </CardBody>
      </Card>
    </Stack>
  );
}
