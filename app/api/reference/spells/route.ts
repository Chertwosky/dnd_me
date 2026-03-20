import { NextResponse } from 'next/server';
import { referenceSpells } from '@/lib/level-up-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId') ?? undefined;
  const maxLevel = searchParams.get('maxLevel');
  return NextResponse.json(referenceSpells(classId, maxLevel ? Number(maxLevel) : undefined));
}
