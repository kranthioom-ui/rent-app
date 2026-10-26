import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === 'payment.captured' || event.event === 'payment_link.paid') {
      const payment = event.payload.payment.entity;
      const flatNo = payment.notes?.flat_no;
      const amountPaid = payment.amount / 100;

      if (flatNo) {
        const { error } = await supabase
          .from('flats')
          .update({
            status: 'PAID',
            paid_amount: amountPaid,
          })
          .eq('flat_no', flatNo);

        if (error) {
          console.error('Supabase Webhook Error:', error);
          return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
