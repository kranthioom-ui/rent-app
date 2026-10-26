import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const { amount, flat_no, tenant_name, phone } = await request.json();

    const options = {
      amount: Math.round(amount), // must be in paise (integer)
      currency: 'INR',
      receipt: `receipt_flat_${flat_no}_${Date.now()}`,
      notes: {
        flat_no: String(flat_no),
        tenant_name: String(tenant_name || ''),
      },
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Razorpay Link Generation Error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.error?.description || error.message || 'Unknown error' }, { status: 400 });
  }
}
