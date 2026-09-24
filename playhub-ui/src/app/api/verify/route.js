import { NextResponse } from 'next/server';

// Temporary mock counter to simulate payment approval lag in local development environments
let attemptsCounter = 0;

export async function GET(request) {
  attemptsCounter++;

  // On the 4th polling request (approx 12 seconds), mark as SUCCESS to unlock the layout
  if (attemptsCounter >= 4) {
    attemptsCounter = 0; // reset
    return NextResponse.json({ status: 'SUCCESS' });
  }

  // Keep returning pending status while waiting for the mobile PIN handshake submission code
  return NextResponse.json({ status: 'PENDING' });
}
