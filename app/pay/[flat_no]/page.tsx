'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PaymentPage() {
  const params = useParams();
  const flat_no = params.flat_no;

  const [flat, setFlat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchFlatDetails() {
      if (!flat_no) return;
      const { data, error } = await supabase
        .from('flats')
        .select('*')
        .eq('flat_no', flat_no)
        .single();

      if (error) console.error('Error fetching flat:', error);
      else setFlat(data);
      setLoading(false);
    }
    fetchFlatDetails();
  }, [flat_no]);

  const totalDue = flat ? flat.rent + (flat.water_bill || 0) + (flat.electricity || 0) + (flat.maintenance || 0) : 0;

  const handlePayment = () => {
    // Load Razorpay Script dynamically if needed, or use test mode trigger
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockkey', // Use your Razorpay Test Key ID
      amount: totalDue * 100, // Amount in paise
      currency: 'INR',
      name: 'Rental Management',
      description: `Rent for Flat ${flat_no}`,
      handler: async function (response: any) {
        // Once payment succeeds, update Supabase directly
        const { error } = await supabase
          .from('flats')
          .update({ status: 'PAID', paid_amount: totalDue })
          .eq('flat_no', flat_no);

        if (!error) {
          setSuccess(true);
        } else {
          alert('Payment successful, but failed to update status in database.');
        }
      },
      prefill: {
        name: flat?.tenant_name || '',
        contact: flat?.phone || '',
      },
      theme: { color: '#2563EB' },
    };

    const paymentWindow = new (window as any).Razorpay(options);
    paymentWindow.open();
  };

  if (loading) return <div className="text-center py-20">Loading bill details...</div>;
  if (!flat) return <div className="text-center py-20">Flat not found.</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg border border-gray-100 text-center space-y-4">
        <h1 className="text-xl font-bold text-900">Rent Payment - Flat {flat.flat_no}</h1>
        <p className="text-sm text-gray-500">Tenant: <span className="font-semibold text-gray-800">{flat.tenant_name}</span></p>
        
        <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>Base Rent:</span> <span>₹{flat.rent?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span>Water Bill:</span> <span>₹{flat.water_bill?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span>Electricity:</span> <span>₹{flat.electricity?.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span>Maintenance:</span> <span>₹{flat.maintenance?.toLocaleString('en-IN')}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
            <span>Total Due:</span> <span>₹{totalDue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl font-semibold text-sm">
            ✅ Payment Successful! Dashboard updated.
          </div>
        ) : (
          <button
            onClick={handlePayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
          >
            Pay ₹{totalDue.toLocaleString('en-IN')} Now
          </button>
        )}
      </div>
    </main>
  );
}
