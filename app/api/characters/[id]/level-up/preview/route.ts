import { NextResponse } from 'next/server';
import { previewDraft } from '@/lib/level-up-store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json(previewDraft(id, body));
}
