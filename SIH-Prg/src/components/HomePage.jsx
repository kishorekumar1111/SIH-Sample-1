import React, { useState, useEffect } from 'react';
import { db, storage, authReady } from '../assets/firebase';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from "firebase/storage";
import { saveLesson, getLessons } from '../assets/indexedDB';

export default function HomePage({ goToRoom }) {
  const [joinId, setJoinId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function loadLessons() {
      const localLessons = await getLessons();
      setLessons(localLessons);
    }
    loadLessons();
  }, []);

  const uploadLesson = async () => {
    setError('');
    if (!file || !title || !topic) {
      setError('Please fill all fields and select a file.');
      return;
    }
    setUploading(true);
    setStatus('Starting upload...');
    try {
      await authReady; // ensure request.auth != null for rules
      const storageRef = ref(storage, `lessons/${file.name}`);

      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' });
        const startMs = Date.now();
        let timedOut = false;
        const timeout = setTimeout(() => {
          timedOut = true;
          try { task.cancel(); } catch (_) {}
          reject(new Error('Upload stalled (timeout). Falling back...'));
        }, 20000);
        task.on('state_changed', (snap) => {
          if (snap.totalBytes > 0) {
            setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          }
          setStatus(snap.state === 'paused' ? 'Paused' : 'Uploading');
        }, (e) => {
          clearTimeout(timeout);
          if (!timedOut) reject(e);
        }, async () => {
          try {
            const u = await getDownloadURL(task.snapshot.ref);
            clearTimeout(timeout);
            resolve(u);
          } catch (e) {
            clearTimeout(timeout);
            reject(e);
          }
        });
      });

      const docRef = await addDoc(collection(db, "lessons"), { title, topic, fileURL: url, createdAt: Date.now() });
      const lessonData = { id: docRef.id, title, topic, fileURL: url };
      await saveLesson(lessonData);
      setLessons(prev => [...prev, lessonData]);

      setFile(null); setTitle(''); setTopic(''); setProgress(0); setStatus('Upload complete');
    } catch (e) {
      // Attempt simple non-resumable upload fallback if stalled
      try {
        setStatus('Falling back to simple upload...');
        const storageRef = ref(storage, `lessons/${file?.name}`);
        await uploadBytes(storageRef, file, { contentType: file?.type || 'application/octet-stream' });
        const url = await getDownloadURL(storageRef);
        const docRef = await addDoc(collection(db, "lessons"), { title, topic, fileURL: url, createdAt: Date.now() });
        const lessonData = { id: docRef.id, title, topic, fileURL: url };
        await saveLesson(lessonData);
        setLessons(prev => [...prev, lessonData]);
        setFile(null); setTitle(''); setTopic(''); setProgress(100); setStatus('Upload complete');
        setError('');
        return;
      } catch (fallbackErr) {
        const message = fallbackErr?.message || e?.message || 'Upload failed. Please try again.';
        const code = (fallbackErr?.code || e?.code) ? ` (${fallbackErr?.code || e?.code})` : '';
        setError(message + code);
        setStatus('');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="text-center max-w-lg mx-auto">
      <h2 className="text-4xl font-extrabold text-white mb-4">Offline First Learning</h2>
      <p className="text-gray-400 mb-8">Create or join a room</p>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
        <input type="text" placeholder="Enter Room ID" value={joinId} onChange={e => setJoinId(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <button onClick={() => joinId && goToRoom(joinId)} disabled={!joinId} className="bg-green-500 px-4 py-2 rounded w-full mb-2">Join Room</button>
        <button onClick={() => goToRoom()} className="bg-blue-500 px-4 py-2 rounded w-full">Create Room</button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
        <h3 className="font-bold mb-2">Teacher Upload Lessons</h3>
        <input type="text" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <input type="text" placeholder="Topic" value={topic} onChange={e=>setTopic(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full mb-2 p-2 rounded bg-gray-700"/>
        <button onClick={uploadLesson} disabled={uploading} className={`px-4 py-2 rounded w-full ${uploading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-500'}`}>{uploading ? `Uploading ${progress}%...` : 'Upload Lesson'}</button>
        {status && <p className="text-gray-300 text-sm mt-2">{status}</p>}
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div>
        <h3 className="font-bold mb-2">Available Lessons</h3>
        <ul className="space-y-2">
          {lessons.map(l => <li key={l.id} className="bg-gray-700 p-2 rounded">{l.title} - {l.topic}</li>)}
        </ul>
      </div>
    </div>
  );
}
