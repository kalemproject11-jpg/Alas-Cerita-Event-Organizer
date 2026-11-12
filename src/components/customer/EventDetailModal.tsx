import React, { useState, useEffect } from 'react';
import { Event, TicketType, User } from '../../types';
import { 
  X, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ArrowRight,
  ShieldCheck,
  IdCard,
  Mail,
  Phone,
  UserCheck
} from 'lucide-react';

interface AttendeeData {
  name: string;
  email: string;
  phone: string;
  nik: string;
  idLast4?: string;
}

interface EventDetailModalProps {
  event: Event;
  ticketTypes: TicketType[];
  currentUser: User;
  initialTierId?: string;
  onClose: () => void;
  onProceedToCheckout: (payload: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    attendees: Array<{ name: string; email: string; phone: string; nik: string; idLast4: string }>;
  }) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  ticketTypes,
  currentUser,
  initialTierId,
  onClose,
  onProceedToCheckout,
}) => {
  const eventTiers = ticketTypes.filter((t) => t.eventId === event.id);

  // Helper to determine capacity based on package name
  const getPackageCapacity = (tierName: string): number => {
    const lower = tierName.toLowerCase();
    if (lower.includes('couple')) return 2;
    if (lower.includes('circle')) return 3;
    return 1; // Single or standard
  };

  const [selectedTierId, setSelectedTierId] = useState<string>(
    initialTierId && eventTiers.some((t) => t.id === initialTierId)
      ? initialTierId
      : eventTiers[0]?.id || ''
  );

  const selectedTier = eventTiers.find((t) => t.id === selectedTierId) || eventTiers[0];
  const packageCapacity = selectedTier ? getPackageCapacity(selectedTier.name) : 1;

  // Buyer / Penanggung Jawab Info
  const [buyerName, setBuyerName] = useState<string>(currentUser.name);
  const [buyerEmail, setBuyerEmail] = useState<string>(currentUser.email);
  const [buyerPhone, setBuyerPhone] = useState<string>(currentUser.phone);

  // Attendees list automatically sized to packageCapacity
  const [attendees, setAttendees] = useState<AttendeeData[]>([
    { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, nik: '' },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  // Whenever selected package changes, sync attendees array length to packageCapacity
  useEffect(() => {
    if (!selectedTier) return;
    const capacity = getPackageCapacity(selectedTier.name);

    setAttendees((prev) => {
      const updated = [...prev];
      if (capacity > updated.length) {
        for (let i = updated.length; i < capacity; i++) {
          updated.push({
            name: '',
            email: buyerEmail,
            phone: buyerPhone,
            nik: '',
          });
        }
      } else if (capacity < updated.length) {
        updated.splice(capacity);
      }
      return updated;
    });
  }, [selectedTierId, buyerEmail, buyerPhone]);

  const handleAttendeeChange = (idx: number, field: keyof AttendeeData, value: string) => {
    setAttendees((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleProceed = () => {
    setFormError(null);
    if (!selectedTier) {
      setFormError('Silakan pilih paket tiket.');
      return;
    }
    if (selectedTier.availableQuota <= 0) {
      setFormError(`Kuota paket ${selectedTier.name} sudah habis.`);
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      setFormError('Lengkapi informasi penanggung jawab pemesan (Nama, Email, dan No. WhatsApp).');
      return;
    }

    // Validate each attendee according to package capacity
    for (let i = 0; i < attendees.length; i++) {
      const att = attendees[i];
      if (!att.name.trim()) {
        setFormError(`Nama lengkap peserta #${i + 1} (${selectedTier.name}) wajib diisi.`);
        return;
      }
      const cleanNik = att.nik.trim().replace(/\D/g, '');
      if (!cleanNik || cleanNik.length < 10) {
        setFormError(
          `Masukkan NIK (Nomor Induk Kependudukan) yang valid (minimal 10-16 digit) untuk peserta #${i + 1} (${att.name || 'Peserta'}).`
        );
        return;
      }
    }

    onProceedToCheckout({
      eventId: event.id,
      ticketTypeId: selectedTier.id,
      quantity: packageCapacity,
      customerName: buyerName.trim(),
      customerEmail: buyerEmail.trim(),
      customerPhone: buyerPhone.trim(),
      attendees: attendees.map((att) => ({
        name: att.name.trim(),
        email: att.email.trim() || buyerEmail.trim(),
        phone: att.phone.trim() || buyerPhone.trim(),
        nik: att.nik.trim(),
        idLast4: att.nik.trim().slice(-4),
      })),
    });
  };

  const totalPrice = selectedTier ? selectedTier.price : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#1c0e1b] border-2 border-pink-500/35 rounded-3xl shadow-2xl shadow-pink-950/60 overflow-hidden my-2 sm:my-4 max-h-[94dvh] flex flex-col">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-pink-500/25 bg-[#170a16] sticky top-0 z-20 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 border border-amber-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-mono font-black text-pink-400 uppercase tracking-wider block truncate">
                Formulir Pemesanan Tiket Resmi
              </span>
              <span className="text-xs sm:text-sm font-black text-white block truncate">Alas Cerita &bull; Kalura Secret Garden</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-pink-300 rounded-xl hover:bg-pink-950/50 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* STEP 1: PILIH PAKET PENGALAMAN (Fixed Capacity: Single / Couple / Circle) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 text-stone-950 flex items-center justify-center text-[11px] font-black">1</span>
                <span>Pilih Paket Tiket:</span>
              </label>
              <span className="text-[11px] text-pink-300 font-mono">
                Jumlah peserta otomatis sesuai paket
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {eventTiers.map((tier) => {
                const isSelected = tier.id === selectedTierId;
                const capacity = getPackageCapacity(tier.name);
                const isSingle = tier.name.toLowerCase().includes('single');
                const isCouple = tier.name.toLowerCase().includes('couple');
                const isCircle = tier.name.toLowerCase().includes('circle');

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? isCouple
                          ? 'bg-gradient-to-b from-[#341d13] to-[#1c0e18] border-2 border-amber-400 shadow-xl shadow-amber-950/40 ring-1 ring-amber-400'
                          : isCircle
                          ? 'bg-gradient-to-b from-[#2e1429] to-[#1c0e18] border-2 border-pink-400 shadow-xl shadow-pink-950/40 ring-1 ring-pink-400'
                          : 'bg-gradient-to-b from-[#2a1324] to-[#1c0e18] border-2 border-pink-400 shadow-xl ring-1 ring-pink-400'
                        : 'bg-[#21101d]/80 border-pink-900/30 hover:border-pink-500/50'
                    }`}
                  >
                    {/* Badge Capacity */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>{tier.name}</span>
                        {isSingle && <span className="w-2 h-2 rounded-full bg-pink-400" />}
                        {isCouple && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        {isCircle && <span className="w-2 h-2 rounded-full bg-pink-300" />}
                      </span>

                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSingle 
                          ? 'bg-pink-950 text-pink-300 border border-pink-800'
                          : isCouple 
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-pink-950 text-pink-200 border border-pink-700'
                      }`}>
                        {capacity} Orang
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${isCouple ? 'text-[#FACC15]' : 'text-white'}`}>
                        Rp{tier.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-stone-300 block mt-0.5">
                        {isSingle ? 'Untuk 1 Peserta' : isCouple ? 'Untuk 2 Peserta Sekaligus' : 'Untuk 3 Peserta Sekaligus'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: DATA PEMESAN / PENANGGUNG JAWAB */}
          <div className="space-y-3 pt-2 border-t border-pink-500/20">
            <label className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 text-stone-950 flex items-center justify-center text-[11px] font-black">2</span>
              <span>Data Penanggung Jawab Pemesanan:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-stone-300 block mb-1">Nama Pemesan:</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-3.5 py-2 text-xs bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-300 block mb-1">Email Aktif (Kirim Tiket):</label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2 text-xs bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-300 block mb-1">No. WhatsApp / HP:</label>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full px-3.5 py-2 text-xs bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: BIODATA SESUAI JUMLAH PAKET DENGAN NIK (1/2/3 PESERTA) */}
          <div className="space-y-4 pt-2 border-t border-pink-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 text-stone-950 flex items-center justify-center text-[11px] font-black">3</span>
                <span>Biodata Peserta Hadir (Otomatis {packageCapacity} Orang untuk {selectedTier?.name}):</span>
              </label>
              <span className="text-[11px] text-[#FACC15] font-mono font-bold">
                Setiap tiket diterbitkan per-nama dengan NIK
              </span>
            </div>

            <div className="space-y-4">
              {attendees.map((att, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 bg-[#231221]/90 rounded-2xl border border-pink-500/25 space-y-3 shadow-md shadow-pink-950/20"
                >
                  <div className="flex items-center justify-between border-b border-pink-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-black flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-white">
                        Peserta {idx + 1} {selectedTier && `(Paket ${selectedTier.name})`}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-600/50 font-bold">
                      Tiket #{idx + 1} dari {packageCapacity}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Nama Lengkap */}
                    <div>
                      <label className="text-stone-200 font-semibold block mb-1">
                        Nama Lengkap (Sesuai KTP/Identitas): <span className="text-pink-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={att.name}
                        onChange={(e) => handleAttendeeChange(idx, 'name', e.target.value)}
                        placeholder={`Nama Peserta #${idx + 1}`}
                        className="w-full px-3 py-2 bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                      />
                    </div>

                    {/* NIK (Nomor Induk Kependudukan) */}
                    <div>
                      <label className="text-stone-200 font-semibold block mb-1 flex items-center justify-between">
                        <span>NIK (Nomor Induk Kependudukan): <span className="text-pink-400">*</span></span>
                        <span className="text-[10px] font-mono text-[#FACC15] font-bold">16 Digit</span>
                      </label>
                      <div className="relative">
                        <IdCard className="w-4 h-4 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={att.nik}
                          onChange={(e) => handleAttendeeChange(idx, 'nik', e.target.value.replace(/\D/g, ''))}
                          placeholder="Contoh: 3304123456780001"
                          className="w-full pl-9 pr-3 py-2 bg-[#170a16] border border-pink-500/30 rounded-xl text-white font-mono placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                        />
                      </div>
                      <span className="text-[10px] text-pink-300/70 mt-0.5 block">
                        NIK digunakan untuk verifikasi identitas resmi saat penukaran gelang/gate Kalura.
                      </span>
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="text-stone-300 block mb-1">No. WhatsApp Peserta:</label>
                      <input
                        type="tel"
                        value={att.phone}
                        onChange={(e) => handleAttendeeChange(idx, 'phone', e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full px-3 py-2 bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-stone-300 block mb-1">Email Peserta:</label>
                      <input
                        type="email"
                        value={att.email}
                        onChange={(e) => handleAttendeeChange(idx, 'email', e.target.value)}
                        placeholder="email@peserta.com"
                        className="w-full px-3 py-2 bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Checkout Action */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#170a16] border-t border-pink-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0 z-10">
          <div className="flex items-center justify-between sm:block">
            <span className="text-[11px] text-stone-300 block">Total Tagihan ({selectedTier?.name}):</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#FACC15] font-mono tabular-nums">
                Rp{totalPrice.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] font-mono text-pink-300 font-bold">
                &bull; {packageCapacity} Orang
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium text-stone-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleProceed}
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
