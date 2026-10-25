'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, AlertCircle, MessageCircle, CreditCard, RefreshCw, QrCode } from 'lucide-react'

// Put your family's preferred UPI ID here (e.g. '9876543210@upi' or 'yourname@okicici')
const OWNER_UPI_ID = 'your-upi-id@upi' 
const OWNER_NAME = 'Property Owner'

export default function Dashboard() {
  const [flats, setFlats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  async function fetchFlats() {
    setLoading(true)
    const { data, error } = await supabase.from('flats').select('*').order('flat_no', { ascending: true })
    if (error) {
      console.error('Error fetching flats:', error)
    } else {
      setFlats(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFlats()
  }, [])

  // Simulate Instant Cash/UPI Mark as Paid by Dad
  async function handleManualCollect(flat: any) {
    setProcessingId(flat.flat_no)
    const { error } = await supabase
      .from('flats')
      .update({ status: 'PAID', paid_amount: flat.rent })
      .eq('flat_no', flat.flat_no)

    if (error) {
      alert('Payment update failed. Please try again.')
    } else {
      await fetchFlats()
    }
    setProcessingId(null)
  }

  // Generate direct UPI payment URL for GPay / PhonePe / Paytm
  function getUpiUrl(flat: any) {
    const amount = flat.rent || 0
    const note = `Rent for Flat ${flat.flat_no}`
    return `upi://pay?pa=${OWNER_UPI_ID}&pn=${encodeURIComponent(OWNER_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
  }

  // Send WhatsApp Reminder with embedded UPI pay link
  function sendWhatsAppReminder(flat: any) {
    const phone = flat.phone ? flat.phone.replace(/[^0-9]/g, '') : ''
    const upiLink = getUpiUrl(flat)
    
    const message = encodeURIComponent(
      `Hello ${flat.tenant_name || 'Resident'},\n\n` +
      `This is a friendly reminder for your rent payment for Flat ${flat.flat_no}.\n` +
      `📌 Rent Due: ₹${flat.rent?.toLocaleString('en-IN')}\n` +
      `💳 UPI ID: ${OWNER_UPI_ID}\n\n` +
      `You can pay directly via GPay / PhonePe / Paytm using this UPI link:\n${upiLink}\n\n` +
      `Thank you!`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const totalCollected = flats.reduce((acc, flat) => flat.status === 'PAID' ? acc + (flat.paid_amount || flat.rent || 0) : acc + (flat.paid_amount || 0), 0)
  const totalPending = flats.reduce((acc, flat) => flat.status === 'UNPAID' ? acc + (flat.rent || 0) : flat.status === 'PARTIAL' ? acc + ((flat.rent || 0) - (flat.paid_amount || 0)) : acc, 0)

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rental Management Dashboard</h1>
            <p className="text-sm text-gray-500">20 Residential Flats - India Portal</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" /> Collected: ₹{totalCollected.toLocaleString('en-IN')}
            </div>
            <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border border-amber-100">
              <AlertCircle className="w-4 h-4" /> Pending: ₹{totalPending.toLocaleString('en-IN')}
            </div>
            <button 
              onClick={fetchFlats}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Flat Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-medium">Loading your flats from Supabase...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {flats.map((flat) => (
              <div key={flat.id || flat.flat_no} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-gray-900">Flat {flat.flat_no}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${flat.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : flat.status === 'PARTIAL' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {flat.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{flat.tenant_name || 'Vacant'}</p>
                  <p className="text-xs text-gray-400 mb-4">{flat.phone || 'No phone added'}</p>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Rent Due</span>
                    <span className="font-semibold text-gray-900">₹{flat.rent?.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {/* WhatsApp Button */}
                    <button
                      onClick={() => sendWhatsAppReminder(flat)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    
                    {/* Mark Paid Button */}
                    <button
                      disabled={flat.status === 'PAID' || processingId === flat.flat_no}
                      onClick={() => handleManualCollect(flat)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${
                        flat.status === 'PAID' 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> {processingId === flat.flat_no ? 'Updating...' : flat.status === 'PAID' ? 'Paid' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}