import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Events from './pages/Events/Events';
import Booking from './pages/Booking/Booking';
import Payment from './pages/Payment/Payment';
import Ticket from './pages/Ticket/Ticket';
import MyBookings from './pages/MyBookings/MyBookings';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/booking/:eventId" element={<Booking />} />
        <Route path="/payment/:bookingId" element={<Payment />} />
        <Route path="/ticket/:bookingId" element={<Ticket />} />
        <Route path="/my-bookings" element={<MyBookings />} />
      </Routes>
    </BrowserRouter>
  );
}
