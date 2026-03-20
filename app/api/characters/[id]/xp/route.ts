import { NextResponse } from 'next/server';
import { patchXp } from '@/lib/level-up-store';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = patchXp(id, Number(body.xpDelta ?? 0));
  return NextResponse.json(result);
}
