import { NextResponse } from "next/server";
import { generatePortalToken, getClient, setPortalEnabled } from "@/lib/server/repositories";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = await generatePortalToken(params.id);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { enabled } = await request.json() as { enabled: boolean };
    await setPortalEnabled(params.id, enabled);
    const client = await getClient(params.id);
    return NextResponse.json({ portalEnabled: client?.portalEnabled, portalToken: client?.portalToken });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}
