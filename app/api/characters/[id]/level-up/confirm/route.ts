import { NextResponse } from 'next/server';
import { confirmDraft } from '@/lib/level-up-store';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(confirmDraft(id));
}
