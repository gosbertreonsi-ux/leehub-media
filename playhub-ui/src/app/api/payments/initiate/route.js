import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { method, phone, operator, amount } = body;

    // Generate a unique tracking transaction ID prefixed by provider type
    const prefix = method === 'momo' ? operator.toUpperCase() : 'CARD';
    const uniqueTxId = `${prefix}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    console.log(`[Gateway API] Push Request initiated for ${phone || 'Cardholder'} - ID: ${uniqueTxId}`);

    // Return a successful initialization response along with the transaction token
    return NextResponse.json({
      success: true,
      message: 'STK push notification generated successfully.',
      transactionId: uniqueTxId,
      amount: amount
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to process payment dispatch payload.'
    }, { status: 400 });
  }
}
