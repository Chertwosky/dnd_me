import { NextResponse } from 'next/server';
import { createDraft } from '@/lib/level-up-store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(createDraft(id, body.targetClassId));
}
