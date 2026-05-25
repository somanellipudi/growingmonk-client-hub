import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CopyButton } from "@/components/mvp-actions";
import { PageHeader, Panel } from "@/components/ui";
import { getClient, getCurrentBrief } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

export default async function WeeklyPlanPage({ params }: { params: { id: string } }) {
  const [client, brief] = await Promise.all([getClient(params.id), getCurrentBrief(params.id)]);
  if (!client) notFound();
  if (!brief) {
    return (
      <AppShell>
        <PageHeader
          eyebrow={client.name}
          title="Weekly plan"
          description="No intelligence brief exists yet. Generate a brief from the client home page first."
          action={<Link href={`/clients/${client.id}`} className="text-sm font-semibold text-gm-orange">Client home</Link>}
        />
      </AppShell>
    );
  }

  const plan = brief.brief.weekPlan;
  return (
    <AppShell>
      <PageHeader
        eyebrow={`${client.name} / Week ${brief.weekNumber}`}
        title="Weekly Plan"
        description={`${new Date(brief.weekStartDate).toLocaleDateString()} - ${new Date(brief.weekEndDate).toLocaleDateString()}`}
        action={<Link href={`/clients/${client.id}`} className="text-sm font-semibold text-gm-orange">Client home</Link>}
      />

      <div className="grid gap-5">
        <Panel>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Strategy rationale</p>
          <p className="mt-3 text-lg leading-8 text-ink">{plan.strategyRationale}</p>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-ink">Content this week</h2>
          <div className="mt-5 grid gap-4">
            {plan.posts.map((post) => (
              <div key={`${post.day}-${post.hook}`} className="border border-stoneLine bg-paper p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gm-orange">
                  {post.day} / {post.platform} {post.postType} / {post.bestTimeToPost}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0 space-y-4 text-sm leading-6 text-muted">
                    <Block title="Hook" body={post.hook} strong />
                    <Block title="Caption draft" body={post.captionDraft} />
                    <Block title="Visual direction" body={post.visualDirection} />
                    <Block title="Why this week" body={post.whyThisWorks} />
                    <Block title="Data reasoning" body={post.dataReasoning} />
                  </div>
                  <div className="flex items-start lg:justify-end">
                    <CopyButton text={post.captionDraft} label="Copy caption" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {plan.whatsappBlast ? (
          <Panel>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">WhatsApp blast / {plan.whatsappBlast.bestTimeToSend}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{plan.whatsappBlast.message}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{plan.whatsappBlast.sendingReason}</p>
            <div className="mt-4">
              <CopyButton text={plan.whatsappBlast.message} label="Copy message" />
            </div>
          </Panel>
        ) : null}

        <Panel>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Client update - send this to the client</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{plan.clientUpdateDraft}</p>
          <div className="mt-4">
            <CopyButton text={plan.clientUpdateDraft} label="Copy message" />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Block({ title, body, strong }: { title: string; body: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className={`mt-1 whitespace-pre-line ${strong ? "font-semibold text-ink" : "text-muted"}`}>{body}</p>
    </div>
  );
}
