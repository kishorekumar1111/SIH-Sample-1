import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import RoomPage from './components/RoomPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentProgress from './components/StudentProgress';

function App() {
  const [page, setPage] = useState('home');
  const [roomId, setRoomId] = useState('');
  const [userRole, setUserRole] = useState('student'); // 'teacher' or 'student'

  useEffect(() => {
    console.log('EduMesh App loaded successfully!');
    // In a real app, this would be determined by authentication
    const role = localStorage.getItem('userRole') || 'student';
    setUserRole(role);

    // Handle hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['home', 'room', 'dashboard', 'progress'].includes(hash)) {
        setPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const goToRoom = (id = '') => {
    setRoomId(id);
    setPage('room');
  };

  const switchRole = (role) => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header userRole={userRole} onSwitchRole={switchRole} />
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        {page === 'home' && <HomePage goToRoom={goToRoom} userRole={userRole} />}
        {page === 'room' && <RoomPage initialRoomId={roomId} goHome={() => setPage('home')} />}
        {page === 'dashboard' && <TeacherDashboard />}
        {page === 'progress' && <StudentProgress />}
      </main>
    </div>
  );
}

export default App;
