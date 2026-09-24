import { NextResponse } from 'next/server';

// Utilize Node global context to retain checking counter states across dynamic request loops
if (!global.mockDatabaseState) {
  global.mockDatabaseState = {};
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');

  if (!transactionId) {
    return NextResponse.json({ success: false, message: 'Missing transactionId parameter.' }, { status: 400 });
  }

  // Initialize tracking counter for this specific transaction ID if it doesn't exist
  if (!global.mockDatabaseState[transactionId]) {
    global.mockDatabaseState[transactionId] = 0;
  }

  // Increment check interval iteration index reference
  global.mockDatabaseState[transactionId] += 1;
  const currentAttempts = global.mockDatabaseState[transactionId];

  console.log(`[Gateway API] Checking status for ${transactionId} - Poll Request Count: ${currentAttempts}`);

  // 🎯 VERIFICATION STATE ROUTER SIMULATION:
  // - Attempt 1 & 2: Simulates the user looking at their smartphone screen entering their carrier money wallet PIN code.
  // - Attempt 3: Simulates mobile operators responding with successful clearing settlement status.
  if (currentAttempts >= 3) {
    // Clear out cache registry log safely to free server memory overhead limits
    delete global.mockDatabaseState[transactionId];

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Transaction successfully processed and confirmed.'
    }, { status: 200 });
  }

  // Keep returning pending status while waiting for the mobile payment process
  return NextResponse.json({
    status: 'PENDING',
    message: 'Waiting for handset mobile money user wallet approval hook.'
  }, { status: 200 });
}
