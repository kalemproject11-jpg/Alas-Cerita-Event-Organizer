import React, { useState } from 'react';
import { Event, TicketType } from '../../types';
import { ArrowRight, ShieldCheck, Check, PhoneCall, ChevronDown, MessageCircle } from 'lucide-react';

interface EventCatalogProps {
  events: Event[];
  ticketTypes: TicketType[];
  onSelectEvent: (event: Event, preferredTierId?: string) => void;
  onOpenConcurrencyDemo?: () => void;
}

export const EventCatalog: React.FC<EventCatalogProps> = ({
  events,
  ticketTypes,
  onSelectEvent,
}) => {
  const alasCeritaEvent = events.find((e) => e.id === 'evt_alas_cerita_2026') || events[0];
  const alasCeritaTiers = ticketTypes.filter((t) => t.eventId === alasCeritaEvent?.id);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqItems = [
    {
      question: 'Kapan e-ticket saya diterbitkan?',
      answer:
        'Setelah bukti QRIS diperiksa dan pembayaran diterima admin, e-ticket setiap peserta siap dikirim melalui email.',
    },
    {
      question: 'Apakah tiket dapat dipindahtangankan?',
      answer:
        'Informasi lengkap tersedia pada syarat dan ketentuan event. Hubungi Admin Alas Cerita di nomor di bawah ini bila membutuhkan bantuan.',
    },
    {
      question: 'Metode pembayaran apa yang tersedia?',
      answer:
        'Informasi lengkap tersedia pada syarat dan ketentuan event. Hubungi Admin Alas Cerita di nomor di bawah ini bila membutuhkan bantuan.',
    },
    {
      question: 'Bagaimana jika pembayaran saya gagal?',
      answer:
        'Informasi lengkap tersedia pada syarat dan ketentuan event. Hubungi Admin Alas Cerita di nomor di bawah ini bila membutuhkan bantuan.',
    },
  ];

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
    <div className="space-y-12 sm:space-y-16 pb-16 sm:pb-20">
      {/* 1. HERO SECTION: Balanced 2-Column Split on Laptop, Clean Stack on Mobile */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2c1326] via-[#20131e] to-[#2c2010] border border-pink-500/30 p-5 sm:p-8 lg:p-12 shadow-2xl shadow-pink-950/30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch relative z-10">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs sm:text-sm font-medium text-pink-200/90">
                Yuk, temukan cerita dan versi terbaik dirimu bersama Alas Cerita!
              </p>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono">
                  <span className="tracking-wider uppercase text-[#FACC15] font-black">
                    TALK SHOW - MINI WORKSHOP - KERONCONG MUSIC PERFORMANCE
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12] text-balance">
                  “Duduk Sejenak, Leren Kepenak”
                </h1>
              </div>

              <p className="text-stone-200 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Alas Cerita adalah creative gathering berbasis self-exploration yang menggabungkan refleksi diri, aktivitas kreatif, interaksi sosial, dan pengalaman budaya dalam ruang yang hangat, terbuka, dan inklusif. Berasal dari kata “alas” (hutan dalam bahasa Jawa) dan “cerita”, Alas Cerita menjadi simbol keberagaman perjalanan hidup setiap individu serta ruang untuk berbagi, berekspresi, dan saling terhubung tanpa menghakimi.
              </p>
            </div>

            <div className="space-y-5">
              {/* Date, Time, Venue Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#200f1c]/90 border border-pink-500/25 rounded-2xl">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300 block mb-1 font-bold">
                    Hari / Tanggal
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    Sabtu, 5 Desember 2026
                  </span>
                </div>

                <div className="p-3.5 bg-[#251b0e]/90 border border-amber-400/35 rounded-2xl">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 block mb-1 font-bold">
                    Waktu Acara
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    08.00 WIB – Selesai
                  </span>
                </div>

                <div className="p-3.5 bg-[#200f1c]/90 border border-pink-500/25 rounded-2xl">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300 block mb-1 font-bold">
                    Tempat / Venue
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    Kalura Secret Garden
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectEvent(alasCeritaEvent)}
                  className="px-6 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[46px]"
                >
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <a
                  href="#paket-tiket"
                  className="px-5 py-3.5 bg-[#261324]/90 hover:bg-[#34182e] text-pink-100 border border-pink-500/40 text-xs sm:text-sm font-semibold rounded-xl transition-colors text-center whitespace-nowrap min-h-[46px] flex items-center justify-center"
                >
                  Lihat Paket Tiket
                </a>
              </div>
            </div>
          </div>

          {/* Right Poster Column: Displays full portrait poster cleanly without cropping */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-full max-w-sm lg:max-w-full mx-auto rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-pink-400/45 shadow-2xl shadow-pink-950/50 bg-[#160b15]">
              <img
                src={alasCeritaEvent.posterUrl}
                alt="Poster Alas Cerita — Our Philosophy"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>
        </div>

        {/* Ambient warm glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. PILIH PENGALAMANMU — TICKET PACKAGES SHOWCASE */}
      <section id="paket-tiket" className="space-y-6 sm:space-y-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-2 px-2">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-300 block">
            Pilih Pengalamanmu
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
            Paket Tiket Alas Cerita
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            Semua paket mendapat fasilitas lengkap yang sama. Pilih sesuai jumlah peserta yang akan hadir bersamamu.
          </p>
        </div>

        {/* Packages Grid: 1 col Mobile, 3 equal-height cols Laptop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {alasCeritaTiers.map((tier) => {
            const isSingle = tier.name.toLowerCase().includes('single');
            const isCouple = tier.name.toLowerCase().includes('couple');
            const isCircle = tier.name.toLowerCase().includes('circle');

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-5 sm:p-6 lg:p-7 flex flex-col justify-between border transition-all duration-300 ${
                  isCouple
                    ? 'bg-gradient-to-b from-[#341d13] via-[#271520] to-[#1a0e18] border-2 border-amber-400 shadow-2xl shadow-amber-950/40'
                    : isCircle
                    ? 'bg-gradient-to-b from-[#2d1428] via-[#211220] to-[#1a0e18] border border-pink-400/50 hover:border-pink-300'
                    : 'bg-gradient-to-b from-[#281324] via-[#20121d] to-[#1a0e18] border border-pink-500/35 hover:border-pink-400'
                }`}
              >
                <div className="space-y-5">
                  {/* Top Package Kicker & Capacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span
                        className={`font-bold uppercase tracking-wider ${
                          isCouple ? 'text-amber-300' : 'text-pink-300'
                        }`}
                      >
                        {isCouple
                          ? 'Paling Favorit'
                          : isCircle
                          ? 'Hemat Bertiga'
                          : 'Tiket Individu'}
                      </span>
                      <span className="text-stone-300 font-semibold">
                        {isSingle ? '1 Orang' : isCouple ? '2 Orang' : '3 Orang'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xl sm:text-2xl font-black text-white">{tier.name}</h3>
                      <div className="text-right">
                        <span
                          className={`text-2xl sm:text-3xl font-black font-mono tabular-nums ${
                            isCouple ? 'text-[#FACC15]' : 'text-white'
                          }`}
                        >
                          Rp{tier.price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[11px] text-stone-400 ml-1">/ paket</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Compact 2-Column Facilities Checklist for scannability on Mobile & Laptop */}
                  <div className="space-y-2.5 pt-4 border-t border-pink-500/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FACC15] block font-mono">
                      Fasilitas Termasuk
                    </span>
                    <ul className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-x-3 gap-y-2 text-xs text-stone-200">
                      {allFacilities.map((fac, idx) => (
                        <li key={idx} className="flex items-center gap-2 min-w-0">
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isCouple ? 'text-amber-300' : 'text-pink-400'
                            }`}
                          />
                          <span className="truncate">{fac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Buy Button */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => onSelectEvent(alasCeritaEvent, tier.id)}
                    className={`w-full py-3.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md min-h-[46px] ${
                      isCouple
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 hover:brightness-110 text-stone-950 shadow-amber-500/25'
                        : isCircle
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 shadow-pink-500/25'
                        : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:brightness-110 text-white shadow-pink-600/25'
                    }`}
                  >
                    <span>Pilih Paket {tier.name}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. OFFICIAL PAYMENT & CONTACT PERSON BANNER */}
      <div className="space-y-4">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2a1323] via-[#21141c] to-[#2c2010] border border-pink-500/30 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-pink-950/20">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-white">
                Metode Pembayaran Resmi: QRIS, ShopeePay, dan Bank BRI
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Setelah bukti transfer diunggah, panitia melakukan verifikasi dan mengirimkan E-Ticket resmi ke email Anda maksimal 1 &times; 24 jam.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
            100% Tiket Resmi
          </span>
        </div>

        {/* Contact Person Card */}
        <a
          href="tel:081936553249"
          className="group p-5 sm:p-6 bg-gradient-to-r from-[#251323] via-[#22141e] to-[#2a1f10] border border-amber-400/35 hover:border-amber-300/80 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-pink-950/20 transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pink-300 block">
                Contact Person
              </span>
              <span className="text-lg sm:text-xl font-black font-mono text-[#FACC15] group-hover:text-amber-200 tracking-wide block tabular-nums">
                0819-3655-3249
              </span>
              <span className="text-xs text-stone-200 font-semibold block">
                Admin Alas Cerita
              </span>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-pink-200 bg-pink-950/70 border border-pink-500/35 px-3.5 py-2 rounded-xl group-hover:bg-pink-900/70 transition-colors shrink-0">
            Ketuk nomor untuk menelepon
          </span>
        </a>
      </div>

      {/* 4. FAQ SECTION (PERTANYAAN UMUM) */}
      <section className="p-5 sm:p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-[#281324] via-[#20121d] to-[#291e10] border border-pink-500/30 shadow-2xl shadow-pink-950/25 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-pink-500/20 pb-5">
          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-300 block">
              PERTANYAAN UMUM
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Semua yang perlu kamu tahu.
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              Butuh bantuan lain? Tim kami siap membantu melalui WhatsApp.
            </p>
          </div>

          <a
            href="https://wa.me/6281936553249"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all shadow-md shadow-pink-500/25 shrink-0 whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Chat WhatsApp Admin</span>
          </a>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-[#1a0d18]/95 border-amber-400/50 shadow-md shadow-pink-950/30'
                    : 'bg-[#1d0f1b]/80 border-pink-500/25 hover:border-pink-400/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-300 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 pt-3 text-xs sm:text-sm text-stone-300 leading-relaxed border-t border-pink-500/15 mt-0.5">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Admin Contact Strip referenced by FAQ answers */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#170a16]/90 border border-pink-500/25 rounded-2xl p-4">
          <div className="space-y-0.5">
            <span className="text-pink-200 font-semibold block">
              Admin Alas Cerita
            </span>
            <span className="text-stone-400 text-[11px] block">
              Hubungi langsung via WhatsApp atau telepon jika mengalami kendala pembayaran atau tiket.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://wa.me/6281936553249"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/40 text-pink-200 font-mono font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>0819-3655-3249</span>
            </a>
            <a
              href="tel:081936553249"
              className="px-3.5 py-2 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-mono font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Telepon Admin</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
