import React, { useState } from 'react';
import { Event, TicketType, User } from '../../types';
import { X, Calendar, MapPin, CheckCircle2, AlertCircle, Users, ArrowRight } from 'lucide-react';

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
    attendees: Array<{ name: string; email: string; phone: string; idLast4: string }>;
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
  const [selectedTierId, setSelectedTierId] = useState<string>(
    initialTierId && eventTiers.some((t) => t.id === initialTierId)
      ? initialTierId
      : eventTiers[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  // Buyer Info
  const [buyerName, setBuyerName] = useState<string>(currentUser.name);
  const [buyerEmail, setBuyerEmail] = useState<string>(currentUser.email);
  const [buyerPhone, setBuyerPhone] = useState<string>(currentUser.phone);

  // Attendees Info (array matching quantity)
  const [attendees, setAttendees] = useState<Array<{ name: string; email: string; phone: string; idLast4: string }>>([
    { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, idLast4: '7821' },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  const selectedTier = eventTiers.find((t) => t.id === selectedTierId);

  const handleQuantityChange = (newQty: number) => {
    if (!selectedTier) return;
    const bounded = Math.max(1, Math.min(newQty, Math.min(4, selectedTier.availableQuota)));
    setQuantity(bounded);

    // Sync attendees array length
    const updated = [...attendees];
    if (bounded > updated.length) {
      for (let i = updated.length; i < bounded; i++) {
        updated.push({
          name: '',
          email: buyerEmail,
          phone: buyerPhone,
          idLast4: '',
        });
      }
    } else if (bounded < updated.length) {
      updated.splice(bounded);
    }
    setAttendees(updated);
  };

  const handleAttendeeChange = (idx: number, field: string, value: string) => {
    const updated = [...attendees];
    updated[idx] = { ...updated[idx], [field]: value };
    setAttendees(updated);
  };

  const handleProceed = () => {
    setFormError(null);
    if (!selectedTier) {
      setFormError('Silakan pilih kategori tiket.');
      return;
    }
    if (selectedTier.availableQuota < quantity) {
      setFormError(`Kuota tidak mencukupi. Sisa kuota hanya ${selectedTier.availableQuota} lembar.`);
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      setFormError('Lengkapi informasi data pemesan (Nama, Email, dan No. WhatsApp).');
      return;
    }
    for (let i = 0; i < attendees.length; i++) {
      const att = attendees[i];
      if (!att.name.trim()) {
        setFormError(`Nama lengkap pengunjung #${i + 1} wajib diisi.`);
        return;
      }
      if (!att.idLast4 || att.idLast4.trim().length !== 4) {
        setFormError(`Masukkan 4 digit terakhir nomor KTP/Identitas untuk pengunjung #${i + 1} (digunakan untuk verifikasi darurat di gate).`);
        return;
      }
    }

    onProceedToCheckout({
      eventId: event.id,
      ticketTypeId: selectedTier.id,
      quantity,
      customerName: buyerName,
      customerEmail: buyerEmail,
      customerPhone: buyerPhone,
      attendees,
    });
  };

  const totalPrice = selectedTier ? selectedTier.price * quantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-indigo-400">PEMESANAN TIKET RESMI</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">{event.category}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Event Preview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="relative aspect-video md:aspect-square rounded-lg overflow-hidden">
              <img
                src={event.posterUrl}
                alt={event.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <h2 className="text-xl font-bold text-white">{event.title}</h2>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{new Date(event.startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{event.venue}, {event.city}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 pt-1 leading-relaxed">{event.description}</p>
            </div>
          </div>

          {/* Ticket Tier Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Pilih Kategori Tiket
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eventTiers.map((tier) => {
                const isSelected = selectedTierId === tier.id;
                const isSoldOut = tier.availableQuota <= 0;

                return (
                  <button
                    key={tier.id}
                    disabled={isSoldOut}
                    onClick={() => {
                      setSelectedTierId(tier.id);
                      setQuantity(1);
                    }}
                    type="button"
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                        : isSoldOut
                        ? 'border-slate-800/60 bg-slate-950/40 opacity-50 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white">{tier.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </div>

                      <div className="mt-2 text-base font-bold text-indigo-300 font-mono tabular-nums">
                        Rp {tier.price.toLocaleString('id-ID')}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tier.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Sisa Kuota:</span>
                      <span
                        className={`font-mono font-semibold ${
                          isSoldOut ? 'text-rose-400' : tier.availableQuota < 20 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {isSoldOut ? 'HABIS' : `${tier.availableQuota} tiket`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Included Facilities / Perks */}
            {selectedTier && selectedTier.perks && selectedTier.perks.length > 0 && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                  Fasilitas Termasuk dalam {selectedTier.name}:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                  {selectedTier.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          {selectedTier && selectedTier.availableQuota > 0 && (
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="text-xs font-semibold text-white block">Jumlah Tiket</span>
                <span className="text-[11px] text-slate-400">Maksimal 4 tiket per transaksi checkout</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="font-mono text-base font-bold text-white w-6 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= Math.min(4, selectedTier.availableQuota)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Buyer Information Form */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Data Pemesan & Kontak E-Tiket</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nama Pemesan</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Nama Lengkap Sesuai KTP"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Email Pengiriman E-Ticket</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="email@domain.com"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nomor WhatsApp</label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="0812xxxxxxx"
                />
              </div>
            </div>
          </div>

          {/* Individual Attendees with 4-Digit KTP Verification (FR-CHK-04 requirement) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Detail Identitas Tiap Lembar Tiket ({quantity} Pengunjung)
              </span>
              <span className="text-[11px] text-slate-400">Wajib untuk verifikasi darurat KTP di pintu masuk</span>
            </div>

            <div className="space-y-3">
              {attendees.map((att, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400">
                      Pengunjung #{idx + 1}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Tier: {selectedTier?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-slate-400 block mb-1">Nama Lengkap Pengunjung</label>
                      <input
                        type="text"
                        value={att.name}
                        onChange={(e) => handleAttendeeChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Nama pengunjung sesuai KTP"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        4 Digit Terakhir KTP
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={att.idLast4}
                        onChange={(e) => handleAttendeeChange(idx, 'idLast4', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono tracking-wider focus:outline-none focus:border-indigo-500"
                        placeholder="Contoh: 7821"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer with Total & CTA */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between sticky bottom-0 z-10">
          <div>
            <span className="text-[11px] text-slate-400 block">Total Tagihan ({quantity} Tiket)</span>
            <span className="text-xl font-bold text-white font-mono tabular-nums">
              Rp {totalPrice.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>

            <button
              onClick={handleProceed}
              disabled={!selectedTier || selectedTier.availableQuota < quantity}
              type="button"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
