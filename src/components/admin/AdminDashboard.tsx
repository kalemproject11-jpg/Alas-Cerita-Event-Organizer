import React, { useState } from 'react';
import { Event, TicketType, Booking, IssuedTicket, CheckInLog } from '../../types';
import { storageService } from '../../services/storageService';
import {
  TrendingUp,
  Users,
  Ticket,
  DollarSign,
  Plus,
  Zap,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  events: Event[];
  ticketTypes: TicketType[];
  bookings: Booking[];
  issuedTickets: IssuedTicket[];
  logs: CheckInLog[];
  onOpenConcurrencyDemo?: () => void;
  onOpenAuditLogs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  ticketTypes,
  bookings,
  issuedTickets,
  logs,
  onOpenConcurrencyDemo,
  onOpenAuditLogs,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [showNewEventModal, setShowNewEventModal] = useState<boolean>(false);
  const [showNewTierModal, setShowNewTierModal] = useState<boolean>(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<'Music' | 'Technology' | 'Sports' | 'Conference' | 'Arts'>('Music');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventCity, setNewEventCity] = useState('Jakarta Pusat');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-12-25T19:00');

  // New Tier Form State
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState<number>(350000);
  const [newTierQuota, setNewTierQuota] = useState<number>(500);

  // Computed Financial & Gate Statistics
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const totalTicketsIssued = issuedTickets.length;
  const totalCheckedIn = issuedTickets.filter((t) => t.status === 'checked-in').length;
  const checkInRate = totalTicketsIssued > 0 ? Math.round((totalCheckedIn / totalTicketsIssued) * 100) : 0;

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const currentEventTiers = ticketTypes.filter((t) => t.eventId === currentEvent?.id);
  const currentEventTickets = issuedTickets.filter((t) => t.eventId === currentEvent?.id);
  const currentEventCheckedIn = currentEventTickets.filter((t) => t.status === 'checked-in').length;

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventVenue.trim()) return;

    const newEvt: Event = {
      id: `evt_${Date.now()}`,
      title: newEventTitle,
      slug: newEventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: newEventDesc || 'Deskripsi acara resmi.',
      venue: newEventVenue,
      city: newEventCity,
      startTime: new Date(newEventDate).toISOString(),
      endTime: new Date(new Date(newEventDate).getTime() + 4 * 3600 * 1000).toISOString(),
      posterUrl: '/assets/aistudio/WhatsApp_Image_2026-11-14_at_19.20.45_a24d6398.jpeg',
      status: 'published',
      category: newEventCategory,
      organizer: 'Soundwave Official EO',
    };

    storageService.saveEvent(newEvt);
    // Also create 1 default ticket tier for this event
    const defaultTier: TicketType = {
      id: `tt_${Date.now()}_default`,
      eventId: newEvt.id,
      name: 'Regular Pass',
      price: 300000,
      quota: 400,
      availableQuota: 400,
      heldQuota: 0,
      saleStart: new Date().toISOString(),
      saleEnd: newEvt.startTime,
      description: 'Akses festival umum.',
      perks: ['Akses Panggung Utama'],
    };
    storageService.saveTicketType(defaultTier);

    setSelectedEventId(newEvt.id);
    setShowNewEventModal(false);
    setNewEventTitle('');
    setNewEventVenue('');
  };

  const handleCreateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim() || !currentEvent) return;

    const newTier: TicketType = {
      id: `tt_${Date.now()}`,
      eventId: currentEvent.id,
      name: newTierName,
      price: Number(newTierPrice),
      quota: Number(newTierQuota),
      availableQuota: Number(newTierQuota),
      heldQuota: 0,
      saleStart: new Date().toISOString(),
      saleEnd: currentEvent.startTime,
      description: 'Akses masuk kelas resmi.',
      perks: ['Akses Pintu Masuk'],
    };

    storageService.saveTicketType(newTier);
    setShowNewTierModal(false);
    setNewTierName('');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-pink-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PANEL SUPER ADMIN &amp; PENYELENGGARA EVENT (EO)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Dashboard Penjualan &amp; Kendali Gate Real-Time
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Pemantauan kuota tiket, pendapatan terbayar, dan tingkat kedatangan pintu masuk secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowNewEventModal(true)}
            className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-pink-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Event Baru</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards (FR-EVT-03) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 bg-[#221221] border border-pink-500/25 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-xs font-medium">Pendapatan Lunas</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-stone-400">
            Dari {paidBookings.length} transaksi invoice terverifikasi
          </span>
        </div>

        {/* Total Issued Tickets */}
        <div className="p-5 bg-[#221221] border border-pink-500/25 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-xs font-medium">Lembar Tiket Terbit</span>
            <Ticket className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {totalTicketsIssued} Lembar
          </div>
          <span className="text-[11px] text-stone-400">
            Berpasangan qr_token &amp; ticket_number
          </span>
        </div>

        {/* Check-In Attendees */}
        <div className="p-5 bg-[#221221] border border-emerald-500/25 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-xs font-medium">Telah Hadir di Lokasi</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {totalCheckedIn} / {totalTicketsIssued}
          </div>
          <span className="text-[11px] text-stone-400">
            Tingkat kehadiran pengunjung: {checkInRate}%
          </span>
        </div>

        {/* Security / Gate Velocity */}
        <div className="p-5 bg-[#221221] border border-pink-500/25 rounded-2xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-stone-300">
            <span className="text-xs font-medium">Jejak Log Gate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {logs.length} Percobaan
          </div>
          <button
            onClick={onOpenAuditLogs}
            className="text-[11px] text-emerald-300 hover:text-emerald-200 text-left font-medium cursor-pointer"
          >
            Lihat riwayat audit lengkap &rarr;
          </button>
        </div>
      </div>

      {/* Event Selection & Detail Tabs */}
      <div className="p-6 bg-[#221221] border border-pink-500/25 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-500/20">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Pilih Event untuk Dikelola
            </span>
            <div className="flex items-center gap-3">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-2 text-sm font-bold bg-[#170a16] border border-pink-500/30 rounded-xl text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTierModal(true)}
              className="px-3.5 py-1.5 bg-[#0e2218] hover:bg-[#163324] text-emerald-200 border border-emerald-400/35 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tambah Kategori Tiket</span>
            </button>
          </div>
        </div>

        {/* Selected Event Details & Ticket Tiers Progress (FR-EVT-02) */}
        {currentEvent && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-xs text-stone-400 block">Venue &amp; Waktu Acara</span>
                <div className="space-y-1 text-xs text-stone-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>{currentEvent.venue}, {currentEvent.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{new Date(currentEvent.startTime).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-stone-400 block">Kehadiran Pintu Masuk Event Ini</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white font-mono tabular-nums">
                    {currentEventCheckedIn}
                  </span>
                  <span className="text-xs text-stone-400">
                    / {currentEventTickets.length} Tiket Masuk ({currentEventTickets.length > 0 ? Math.round((currentEventCheckedIn / currentEventTickets.length) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-stone-400 block">Status Publikasi Event</span>
                <span className="inline-block px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg font-mono">
                  PUBLISHED &middot; AKTIF
                </span>
              </div>
            </div>

            {/* Ticket Tiers Breakdown */}
            <div className="space-y-3 pt-4 border-t border-pink-500/20">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-200 block">
                Manajemen Kategori &amp; Kuota Tiket (Tiered Allocation)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentEventTiers.map((tier) => {
                  const isSingleTier = tier.id === 'tt_alas_single' || tier.name.toLowerCase().includes('single');
                  const singleInfo = isSingleTier ? storageService.getSinglePricingInfo() : null;
                  const sold = isSingleTier && singleInfo
                    ? singleInfo.registeredCount
                    : Math.max(0, tier.quota - tier.availableQuota);
                  const remaining = Math.max(0, tier.quota - sold);
                  const percentSold = tier.quota > 0 ? Math.min(100, Math.round((sold / tier.quota) * 100)) : 0;

                  return (
                    <div
                      key={tier.id}
                      className="p-4 bg-[#170a16] rounded-xl border border-pink-500/25 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{tier.name}</span>
                        <span className="font-mono text-xs font-semibold text-emerald-300">
                          Rp {tier.price.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Quota Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                          <span>Terdaftar: {sold} / {tier.quota}</span>
                          <span>{percentSold}%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percentSold >= 100
                                ? 'bg-rose-500'
                                : percentSold > 70
                                ? 'bg-pink-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentSold}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                        <span>Sisa Kuota:</span>
                        <span className={`font-mono font-bold ${remaining <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {remaining <= 0 ? 'SOLD OUT' : `${remaining} lembar`}
                        </span>
                      </div>

                      {isSingleTier && singleInfo && (
                        <div className="pt-2.5 border-t border-pink-500/20 space-y-1.5 text-[11px] font-mono">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-300">Pendaftar 1–13 (Rp70.000):</span>
                            <span className={`font-bold ${singleInfo.isPromoActive ? 'text-emerald-300' : 'text-stone-400'}`}>
                              {Math.min(singleInfo.registeredCount, 13)}/13 {singleInfo.isPromoActive ? '· AKTIF' : '· PENUH'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-stone-300">Pendaftar 14+ (Rp80.000):</span>
                            <span className={`font-bold ${!singleInfo.isPromoActive ? 'text-pink-300' : 'text-stone-400'}`}>
                              {Math.max(0, singleInfo.registeredCount - 13)} org {!singleInfo.isPromoActive ? '· AKTIF' : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Event */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1c0f1c] border border-pink-500/35 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Buat Event Baru (FR-EVT-01)</h3>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1">Nama Acara / Event Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Contoh: Alas Cerita Vol. 2"
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Kategori</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as unknown as typeof newEventCategory)}
                    className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Music">Music</option>
                    <option value="Technology">Technology</option>
                    <option value="Sports">Sports</option>
                    <option value="Conference">Conference</option>
                    <option value="Arts">Arts</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">Kota</label>
                  <input
                    type="text"
                    required
                    value={newEventCity}
                    onChange={(e) => setNewEventCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Venue / Lokasi</label>
                <input
                  type="text"
                  required
                  value={newEventVenue}
                  onChange={(e) => setNewEventVenue(e.target.value)}
                  placeholder="Contoh: Kalura Secret Garden"
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Jadwal Mulai</label>
                <input
                  type="datetime-local"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Rincian acara..."
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewEventModal(false)}
                  className="px-4 py-2 bg-[#251323] text-stone-300 rounded-lg hover:bg-[#341a32] border border-pink-500/25 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Simpan &amp; Terbitkan Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Tier */}
      {showNewTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1c0f1c] border border-pink-500/35 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Kategori Tiket (FR-EVT-02)</h3>

            <form onSubmit={handleCreateTier} className="space-y-3 text-xs">
              <div>
                <label className="text-stone-300 block mb-1">Nama Kategori / Tier</label>
                <input
                  type="text"
                  required
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  placeholder="Contoh: VIP Garden Pass"
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Harga Tiket (Rp)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={10000}
                  value={newTierPrice}
                  onChange={(e) => setNewTierPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Kuota Maksimal Lembar Tiket</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTierQuota}
                  onChange={(e) => setNewTierQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#150914] border border-pink-500/30 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTierModal(false)}
                  className="px-4 py-2 bg-[#251323] text-stone-300 rounded-lg hover:bg-[#341a32] border border-pink-500/25 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Simpan Kategori Tiket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
