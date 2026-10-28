'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Script from 'next/script';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function PaymentContent() {
  const params = useParams();
  const flat_no = params.flat_no;

  const [flat, setFlat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (flat_no) {
      fetchFlatDetails();
    }
  }, [flat_no]);

  const fetchFlatDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flats')
      .select('*')
      .eq('flat_no', flat_no)
      .single();

    if (error) {
      console.error('Error fetching flat:', error);
    } else {
      setFlat(data);
      if (data && data.status === 'PAID') {
        setSuccess(true);
      }
    }
    setLoading(false);
  };

  const handleRazorpayPayment = async () => {
    if (!flat) return;
    setPaying(true);

    const totalDue = (flat.rent || 0) + (flat.water_bill || 0) + (flat.electricity || 0) + (flat.maintenance || 0);

    try {
      const response = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalDue * 100,
          flat_no: flat.flat_no,
          tenant_name: flat.tenant_name,
          phone: flat.phone,
        }),
      });

      const order = await response.json();

      if (order.error) {
        alert('Failed to initiate payment: ' + order.error);
        setPaying(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: order.amount,
        currency: 'INR',
        name: 'Rental Management',
        description: `Rent for Flat ${flat.flat_no}`,
        order_id: order.id,
        handler: async function (response: any) {
          const { error } = await supabase
            .from('flats')
            .update({ 
              status: 'PAID', 
              paid_amount: totalDue,
              paid_at: new Date().toISOString() 
            })
            .eq('flat_no', flat.flat_no);

          if (error) {
            console.error('Error updating payment status:', error);
          } else {
            setSuccess(true);
          }
          setPaying(false);
        },
        prefill: {
          name: flat.tenant_name,
          email: 'tenant@example.com',
          contact: flat.phone,
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Something went wrong during payment initialization.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-500 text-sm">Loading bill details...</div>
    );
  }

  if (!flat) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Flat Not Found</h2>
        <p className="text-xs text-gray-500">The requested flat number does not exist.</p>
      </div>
    );
  }

  const water = flat.water_bill || 0;
  const electricity = flat.electricity || 0;
  const maintenance = flat.maintenance || 0;
  const totalDue = flat.rent + water + electricity + maintenance;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-sm border border-gray-100 space-y-6">
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Flat {flat.flat_no} Online Payment</span>
        <h1 className="text-xl font-extrabold text-gray-900">Monthly Rent Bill</h1>
        <p className="text-xs text-gray-500">Tenant: <span className="font-semibold text-gray-700">{flat.tenant_name}</span></p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-2">
          <div className="text-3xl">✅</div>
          <h3 className="text-base font-bold text-emerald-800">Payment Successful!</h3>
          <p className="text-xs text-emerald-600">Your rent for this month has been successfully paid and recorded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-2 text-gray-600 border border-gray-100">
            <div className="flex justify-between"><span>Base Rent:</span> <span>₹{flat.rent.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Water Bill:</span> <span>₹{water.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Electricity:</span> <span>₹{electricity.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Maintenance:</span> <span>₹{maintenance.toLocaleString('en-IN')}</span></div>
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-sm">
              <span>Total Due:</span> <span>₹{totalDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={paying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
          >
            {paying ? 'Opening Payment Gateway...' : `Pay ₹${totalDue.toLocaleString('en-IN')} Securely`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Suspense fallback={<div className="text-gray-500 text-sm">Loading...</div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}
