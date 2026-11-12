import React, { useState, useEffect } from 'react';
import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/Header';
import { EventCatalog } from './components/customer/EventCatalog';
import { EventDetailModal } from './components/customer/EventDetailModal';
import { CheckoutPaymentModal } from './components/customer/CheckoutPaymentModal';
import { MyTicketsView } from './components/customer/MyTicketsView';
import { GateScanner } from './components/gate/GateScanner';
import { SupervisorHelpdesk } from './components/gate/SupervisorHelpdesk';
import { AuditLogsView } from './components/gate/AuditLogsView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ConcurrencySimulatorModal } from './components/admin/ConcurrencySimulatorModal';
import { ShieldCheck, Database, QrCode, Terminal, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => storageService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => storageService.getUsers());
  const [events, setEvents] = useState<Event[]>(() => storageService.getEvents());
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(() => storageService.getTicketTypes());
  const [bookings, setBookings] = useState<Booking[]>(() => storageService.getBookings());
  const [issuedTickets, setIssuedTickets] = useState<IssuedTicket[]>(() => storageService.getIssuedTickets());
  const [logs, setLogs] = useState<CheckInLog[]>(() => storageService.getLogs());

  // Navigation tab: 'catalog' | 'my-tickets' | 'scanner' | 'helpdesk' | 'admin' | 'logs'
  const [activeTab, setActiveTab] = useState<string>('catalog');

  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<Event | null>(null);
  const [preferredTierId, setPreferredTierId] = useState<string | undefined>(undefined);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState<Booking | null>(null);
  const [showConcurrencySimulator, setShowConcurrencySimulator] = useState<boolean>(false);
  const [initialTicketToScan, setInitialTicketToScan] = useState<IssuedTicket | null>(null);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setCurrentUser(storageService.getCurrentUser());
      setUsers(storageService.getUsers());
      setEvents(storageService.getEvents());
      setTicketTypes(storageService.getTicketTypes());
      setBookings(storageService.getBookings());
      setIssuedTickets(storageService.getIssuedTickets());
      setLogs(storageService.getLogs());
    });
    return () => unsubscribe();
  }, []);

  // Switch role / active user
  const handleSwitchUser = (userId: string) => {
    storageService.setCurrentUser(userId);
    const user = users.find((u) => u.id === userId);
    if (user) {
      // Auto route to relevant tab for role
      if (user.role === 'gate_staff') {
        setActiveTab('scanner');
      } else if (user.role === 'gate_supervisor') {
        setActiveTab('helpdesk');
      } else if (user.role === 'super_admin') {
        setActiveTab('admin');
      }
    }
  };

  const handleProceedToCheckout = (payload: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    attendees: Array<{ name: string; email: string; phone: string; idLast4: string }>;
  }) => {
    const res = storageService.createBooking({
      userId: currentUser.id,
      ...payload,
    });

    if (res.success && res.booking) {
      setSelectedEventForDetail(null);
      setActiveBookingForPayment(res.booking);
    } else {
      alert(res.error || 'Gagal membuat pesanan checkout.');
    }
  };

  const handlePaymentSuccess = () => {
    setActiveBookingForPayment(null);
    setActiveTab('my-tickets');
  };

  const handleOpenGateScannerWithTicket = (ticket: IssuedTicket) => {
    setInitialTicketToScan(ticket);
    setActiveTab('scanner');
  };

  const handleResetData = () => {
    if (confirm('Kembalikan semua database dan tiket ke data awal contoh?')) {
      storageService.resetAllData();
      setActiveTab('catalog');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        users={users}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onResetData={handleResetData}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'catalog' && (
          <EventCatalog
            events={events}
            ticketTypes={ticketTypes}
            onSelectEvent={(evt, tierId) => {
              setSelectedEventForDetail(evt);
              setPreferredTierId(tierId);
            }}
            onOpenConcurrencyDemo={() => setShowConcurrencySimulator(true)}
          />
        )}

        {activeTab === 'my-tickets' && (
          <MyTicketsView
            currentUser={currentUser}
            tickets={issuedTickets}
            events={events}
            onOpenGateScannerWithTicket={handleOpenGateScannerWithTicket}
          />
        )}

        {activeTab === 'scanner' && (
          <GateScanner
            currentUser={currentUser}
            tickets={issuedTickets}
            initialTicketToScan={initialTicketToScan}
            onClearInitialTicket={() => setInitialTicketToScan(null)}
            onOpenSupervisorHelpdesk={() => setActiveTab('helpdesk')}
          />
        )}

        {activeTab === 'helpdesk' && (
          <SupervisorHelpdesk
            currentUser={currentUser}
            events={events}
            onOpenAuditLogs={() => setActiveTab('logs')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            events={events}
            ticketTypes={ticketTypes}
            bookings={bookings}
            issuedTickets={issuedTickets}
            logs={logs}
            onOpenConcurrencyDemo={() => setShowConcurrencySimulator(true)}
            onOpenAuditLogs={() => setActiveTab('logs')}
          />
        )}

        {activeTab === 'logs' && (
          <AuditLogsView
            logs={logs}
            onBack={() => setActiveTab('helpdesk')}
          />
        )}
      </main>

      {/* Modals */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          ticketTypes={ticketTypes}
          currentUser={currentUser}
          initialTierId={preferredTierId}
          onClose={() => {
            setSelectedEventForDetail(null);
            setPreferredTierId(undefined);
          }}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {activeBookingForPayment && (
        <CheckoutPaymentModal
          booking={activeBookingForPayment}
          event={events.find((e) => e.id === activeBookingForPayment.eventId) || events[0]}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => {
            storageService.cancelExpiredBookings();
            setActiveBookingForPayment(null);
          }}
        />
      )}

      {showConcurrencySimulator && (
        <ConcurrencySimulatorModal
          onClose={() => setShowConcurrencySimulator(false)}
        />
      )}

      {/* Quiet Technical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-8 px-4 text-xs text-slate-500 mt-auto no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">EventPass Engine</span>
            <span>&middot;</span>
            <span>Sistem Pemesanan &amp; Validasi E-Ticket Berbasis PHP Laravel 11/12 &amp; QR Code Terenkripsi</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>UUID v4 Cryptographic Tokens</span>
            <span>&middot;</span>
            <span>lockForUpdate Pessimistic Locking</span>
            <span>&middot;</span>
            <span>Anti-Double Scan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
