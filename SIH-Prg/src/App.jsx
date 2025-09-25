import React, { useState } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import RoomPage from './components/RoomPage';

function App() {
  const [page, setPage] = useState('home');
  const [roomId, setRoomId] = useState('');

  const goToRoom = (id = '') => {
    setRoomId(id);
    setPage('room');
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {page === 'home' && <HomePage goToRoom={goToRoom} />}
        {page === 'room' && <RoomPage initialRoomId={roomId} goHome={() => setPage('home')} />}
      </main>
    </div>
  );
}

export default App;
