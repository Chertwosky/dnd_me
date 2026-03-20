import { NextResponse } from 'next/server';
import { referenceFeats } from '@/lib/level-up-store';

export async function GET() {
  return NextResponse.json(referenceFeats());
}
