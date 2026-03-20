import { NextResponse } from 'next/server';
import { referenceMulticlassOptions } from '@/lib/level-up-store';

export async function GET() {
  return NextResponse.json(referenceMulticlassOptions());
}
