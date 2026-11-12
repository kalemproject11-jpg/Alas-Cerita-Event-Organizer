import React, { useState } from 'react';
import { Event, TicketType } from '../../types';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Check, 
  Sparkles, 
  Coffee, 
  Palette, 
  Gift, 
  Users, 
  Clock,
  HeartHandshake
} from 'lucide-react';

interface EventCatalogProps {
  events: Event[];
  ticketTypes: TicketType[];
  onSelectEvent: (event: Event, preferredTierId?: string) => void;
  onOpenConcurrencyDemo: () => void;
}

export const EventCatalog: React.FC<EventCatalogProps> = ({
  events,
  ticketTypes,
  onSelectEvent,
  onOpenConcurrencyDemo,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Primary featured event is Alas Cerita
  const alasCeritaEvent = events.find((e) => e.id === 'evt_alas_cerita_2026') || events[0];
  const alasCeritaTiers = ticketTypes.filter((t) => t.eventId === alasCeritaEvent?.id);

  const categories = ['All', 'Arts', 'Music', 'Technology'];

  const otherEvents = events.filter((evt) => {
    const matchCategory = selectedCategory === 'All' || evt.category === selectedCategory;
    const matchSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const allFacilities = [
    'Jajanan Pasar',
    'Wedang',
    'Makanan Berat',
    'E-Sertifikat',
    'Totebag',
    'Merchandise',
    'Fresh Flower',
    'Voucher',
    'Tools Painting',
  ];

  return (
    <div className="space-y-14 pb-20">
      
      {/* 1. HERO SECTION: Alas Cerita — Our Philosophy */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border border-amber-900/40 p-6 sm:p-10 lg:p-12 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Yuk, temukan cerita dan versi terbaik dirimu bersama Alas Cerita!</span>
            </div>

            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-amber-400 block font-semibold">
                Talkshow: Rerasan Mawi Makna
              </span>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                “Duduk Sejenak, Leren Kepenak”
              </h1>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify sm:text-left">
              Alas Cerita adalah creative gathering berbasis self-exploration yang menggabungkan refleksi diri, aktivitas kreatif, interaksi sosial, dan pengalaman budaya dalam ruang yang hangat, terbuka, dan inklusif. Berasal dari kata “alas” (hutan dalam bahasa Jawa) dan “cerita”, Alas Cerita menjadi simbol keberagaman perjalanan hidup setiap individu serta ruang untuk berbagi, berekspresi, dan saling terhubung tanpa menghakimi.
            </p>

            {/* Date, Time, Venue Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-slate-950/70 border border-amber-900/30 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                  Hari / Tanggal
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Sabtu, 5 Desember 2026
                </span>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-amber-900/30 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                  Waktu Acara
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  08.00 WIB – Selesai
                </span>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-amber-900/30 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                  Tempat / Venue
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Kalura Secret Garden
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onSelectEvent(alasCeritaEvent)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-pointer"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#paket-tiket"
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
              >
                Lihat Paket Tiket
              </a>
            </div>
          </div>

          {/* Right Poster Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-amber-900/50 shadow-2xl group bg-slate-950">
              <img
                src={alasCeritaEvent.posterUrl}
                alt="Poster Alas Cerita — Our Philosophy"
                referrerPolicy="no-referrer"
                className="w-full aspect-4/3 sm:aspect-16/10 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/10">
                <span className="text-[11px] font-mono text-amber-300 block font-semibold">
                  Poster Alas Cerita — Our Philosophy
                </span>
                <span className="text-xs text-slate-300">
                  Kalura Secret Garden &middot; Creative Gathering &amp; Painting
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. PILIH PENGALAMANMU — TICKET PACKAGES SHOWCASE */}
      <section id="paket-tiket" className="space-y-6 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
            PILIH PENGALAMANMU
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Paket tiket untuk setiap ambisi.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Semua paket mendapat fasilitas yang sama. Pilih berdasarkan jumlah orang yang akan hadir bersamamu.
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alasCeritaTiers.map((tier) => {
            const isSingle = tier.name.toLowerCase().includes('single');
            const isCouple = tier.name.toLowerCase().includes('couple');
            const isCircle = tier.name.toLowerCase().includes('circle');

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300 ${
                  isCouple
                    ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Popular Tag for Couple */}
                {isCouple && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase rounded-full shadow-md font-mono">
                    Paling Favorit (2 Orang)
                  </div>
                )}

                <div className="space-y-6">
                  {/* Tier Title & Price */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                      <span className="text-xs font-mono text-slate-400">
                        {isSingle ? '1 Orang' : isCouple ? '2 Orang' : '3 Orang'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="text-3xl font-black text-white font-mono tabular-nums">
                        Rp{tier.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">/ paket</span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* 9 Facilities Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                      Fasilitas Termasuk:
                    </span>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {allFacilities.map((fac, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span>{fac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Buy Button */}
                <div className="pt-8">
                  <button
                    onClick={() => onSelectEvent(alasCeritaEvent, tier.id)}
                    className={`w-full py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      isCouple
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>Pilih {tier.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Sisa Kuota:</span>
                    <span className={tier.availableQuota < 20 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {tier.availableQuota} paket
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. TECHNICAL VERIFICATION & WAR TIKET BANNER */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Sistem Validasi Gate &amp; Anti-Overselling Berbasis Laravel 11/12
            </h4>
            <p className="text-xs text-slate-400">
              Didukung Pessimistic Locking (lockForUpdate) untuk mengunci kuota tiket secara akurat &amp; Anti-Double Scan.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenConcurrencyDemo}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
        >
          Uji Simulasi War Tiket &rarr;
        </button>
      </div>

      {/* 4. OTHER ACTIVE EVENTS SECTION */}
      {otherEvents.length > 1 && (
        <section className="space-y-6 pt-6 border-t border-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Event Lainnya di Platform</h3>
              <p className="text-xs text-slate-400">Pilihan konser musik dan konferensi teknologi mendatang.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {otherEvents
              .filter((e) => e.id !== 'evt_alas_cerita_2026')
              .map((event) => {
                const eventTiers = ticketTypes.filter((t) => t.eventId === event.id);
                const minPrice = eventTiers.length > 0 ? Math.min(...eventTiers.map((t) => t.price)) : 0;
                const totalRemaining = eventTiers.reduce((acc, t) => acc + t.availableQuota, 0);

                return (
                  <div
                    key={event.id}
                    className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                      <div className="absolute top-3 left-3 text-xs">
                        <span className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[11px] font-medium text-white">
                          {event.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {event.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Mulai dari</span>
                          <span className="text-base font-bold text-white font-mono">
                            Rp {minPrice.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <button
                          onClick={() => onSelectEvent(event)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
};
