
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { flat_no, tenant_name, phone, amount } = await req.json();

    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Razorpay works in paise
      currency: 'INR',
      accept_partial: false,
      description: `Rent Payment for Flat ${flat_no}`,
      customer: {
        name: tenant_name,
        contact: phone,
      },
      notify: {
        sms: false,
        whatsapp: false,
      },
      notes: {
        flat_no: flat_no,
      },
      callback_url: 'https://rent-app-mauve.vercel.app',
      callback_method: 'get',
    });

    return NextResponse.json({ url: paymentLink.short_url });
  } catch (error: any) {
    console.error('Razorpay Link Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
