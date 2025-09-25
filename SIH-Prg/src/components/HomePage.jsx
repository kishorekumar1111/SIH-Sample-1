import React, { useState, useEffect } from 'react';
import { db, authReady, auth } from '../assets/firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { saveLesson, getLessons, saveFile, createFileURL, getSyncQueue, removeFromSyncQueue, markAsSynced } from '../assets/indexedDB';

export default function HomePage({ goToRoom, userRole }) {
  const [joinId, setJoinId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [progressSyncStatus, setProgressSyncStatus] = useState('');

  useEffect(() => {
    async function loadLessons() {
      const localLessons = await getLessons();
      setLessons(localLessons);
    }
    loadLessons();
    
    // Test Firebase connection (no Storage)
    console.log('Testing Firebase connection...');
    console.log('Auth object:', auth);
    console.log('DB object:', db);
    
    // Check auth state
    auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? `User: ${user.uid}` : 'No user');
    });

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncLessons = async () => {
    if (!isOnline) {
      setSyncStatus('❌ No internet connection. Please connect to sync lessons.');
      return;
    }

    try {
      setSyncStatus('🔄 Syncing lessons from cloud...');
      console.log('Starting lesson sync...');
      
      await authReady; // Wait for authentication
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Fetch lessons from Firestore
      const lessonsQuery = query(collection(db, "lessons"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(lessonsQuery);
      
      let syncedCount = 0;
      const cloudLessons = [];
      
      querySnapshot.forEach((doc) => {
        const lessonData = { id: doc.id, ...doc.data() };
        cloudLessons.push(lessonData);
      });

      console.log(`Found ${cloudLessons.length} lessons in cloud`);

      // Check which lessons are missing locally
      const localLessons = await getLessons();
      const localIds = new Set(localLessons.map(l => l.id));
      
      for (const cloudLesson of cloudLessons) {
        if (!localIds.has(cloudLesson.id)) {
          // Save new lesson to local storage
          await saveLesson(cloudLesson);
          syncedCount++;
          console.log('Synced lesson:', cloudLesson.title);
        }
      }

      // Reload local lessons
      const updatedLessons = await getLessons();
      setLessons(updatedLessons);
      
      setSyncStatus(`✅ Sync complete! Downloaded ${syncedCount} new lessons.`);
      console.log(`Sync completed. Downloaded ${syncedCount} new lessons.`);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(`❌ Sync failed: ${error.message}`);
    }
  };

  const syncProgress = async () => {
    if (!isOnline) {
      setProgressSyncStatus('❌ No internet connection. Cannot sync progress.');
      return;
    }

    try {
      setProgressSyncStatus('🔄 Syncing progress to cloud...');
      console.log('Starting progress sync...');
      
      await authReady; // Wait for authentication
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get all items in sync queue
      const syncQueue = await getSyncQueue();
      console.log(`Found ${syncQueue.length} items to sync`);

      let syncedCount = 0;
      
      for (const item of syncQueue) {
        try {
          if (item.type === 'progress') {
            // Sync progress data
            await addDoc(collection(db, "progress"), {
              ...item.data,
              userId: currentUser.uid,
              syncedAt: Date.now()
            });
            await markAsSynced('progress', item.data.lessonId);
            await removeFromSyncQueue(item.id);
            syncedCount++;
            console.log('Synced progress for lesson:', item.data.lessonId);
          } else if (item.type === 'quizResult') {
            // Sync quiz results
            await addDoc(collection(db, "quizResults"), {
              ...item.data,
              userId: currentUser.uid,
              syncedAt: Date.now()
            });
            await markAsSynced('quizResult', item.data.id);
            await removeFromSyncQueue(item.id);
            syncedCount++;
            console.log('Synced quiz result:', item.data.id);
          }
        } catch (itemError) {
          console.error('Error syncing item:', itemError);
          // Continue with other items
        }
      }
      
      setProgressSyncStatus(`✅ Progress sync complete! Synced ${syncedCount} items.`);
      console.log(`Progress sync completed. Synced ${syncedCount} items.`);
      
    } catch (error) {
      console.error('Progress sync failed:', error);
      setProgressSyncStatus(`❌ Progress sync failed: ${error.message}`);
    }
  };

  const testLocalStorage = async () => {
    try {
      console.log('Testing local storage...');
      const testBlob = new Blob(['test file content'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      console.log('Attempting local storage test...');
      const fileData = await saveFile(testFile, 'test-connection');
      console.log('Local storage test successful:', fileData);
      
      const testUrl = createFileURL(fileData);
      console.log('Test file URL:', testUrl);
      
      setStatus('Local storage test successful!');
    } catch (error) {
      console.error('Local storage test failed:', error);
      setError(`Local storage test failed: ${error.message}`);
    }
  };

  const uploadLesson = async () => {
    setError('');
    if (!file || !title || !topic) {
      setError('Please fill all fields and select a file.');
      return;
    }
    setUploading(true);
    setStatus('Starting upload...');
    try {
      console.log('Starting local file upload...');
      
      // Generate unique lesson ID
      const lessonId = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save file to local storage
      setStatus('Saving file locally...');
      const fileData = await saveFile(file, lessonId);
      console.log('File saved locally:', fileData);
      
      // Create local file URL
      const fileURL = createFileURL(fileData);
      console.log('File URL created:', fileURL);
      
      // Save lesson data to Firestore (if available) and local storage
      setStatus('Saving lesson data...');
      try {
        await authReady; // Wait for auth
        const currentUser = auth.currentUser;
        if (currentUser) {
          const docRef = await addDoc(collection(db, "lessons"), { 
            title, 
            topic, 
            fileURL, 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            createdAt: Date.now() 
          });
          console.log('Lesson saved to Firestore:', docRef.id);
        }
      } catch (firestoreError) {
        console.warn('Firestore save failed, continuing with local storage only:', firestoreError);
      }
      
      // Save to local storage
      const lessonData = { 
        id: lessonId, 
        title, 
        topic, 
        fileURL, 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        createdAt: Date.now() 
      };
      await saveLesson(lessonData);
      setLessons(prev => [...prev, lessonData]);

      setFile(null); setTitle(''); setTopic(''); setProgress(0); setStatus('Upload complete!');
    } catch (e) {
      console.error('Upload failed:', e);
      const message = e?.message || 'Upload failed. Please try again.';
      setError(message);
      setStatus('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4">
          Offline First Learning
        </h2>
        <p className="text-gray-400 text-lg">Empowering rural education through peer-to-peer learning</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Join Study Room</h3>
            <p className="card-subtitle">Connect with peers for collaborative learning</p>
          </div>
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Enter Room ID" 
              value={joinId} 
              onChange={e => setJoinId(e.target.value)} 
              className="form-input"
            />
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => joinId && goToRoom(joinId)} 
              disabled={!joinId} 
              className="btn btn-secondary flex-1"
            >
              Join Room
            </button>
            <button 
              onClick={() => goToRoom()} 
              className="btn btn-primary flex-1"
            >
              Create Room
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Stats</h3>
            <p className="card-subtitle">Your learning progress</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-primary-400">{lessons.length}</div>
              <div className="text-sm text-gray-400">Lessons Available</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-accent-400">{isOnline ? 'Online' : 'Offline'}</div>
              <div className="text-sm text-gray-400">Connection Status</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">Teacher Upload Lessons</h3>
          <p className="card-subtitle">Upload educational content for students</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="form-group">
            <label className="form-label">Lesson Title</label>
            <input 
              type="text" 
              placeholder="Enter lesson title" 
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Topic/Subject</label>
            <input 
              type="text" 
              placeholder="Enter topic or subject" 
              value={topic} 
              onChange={e=>setTopic(e.target.value)} 
              className="form-input"
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Upload File</label>
          <input 
            type="file" 
            onChange={e=>setFile(e.target.files[0])} 
            className="form-input"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.mp4,.mp3"
          />
        </div>
        <div className="flex gap-3">
          <button 
            onClick={uploadLesson} 
            disabled={uploading} 
            className={`btn btn-accent flex-1 ${uploading ? 'loading' : ''}`}
          >
            {uploading ? `Uploading ${progress}%...` : 'Upload Lesson'}
          </button>
          <button 
            onClick={testLocalStorage} 
            className="btn btn-outline"
          >
            Test Storage
          </button>
        </div>
        {status && <p className="text-gray-300 text-sm mt-3 p-3 bg-gray-700/50 rounded-lg">{status}</p>}
        {error && <p className="text-red-400 text-sm mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Student Sync</h3>
            <p className="card-subtitle">Download lessons from cloud</p>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {isOnline ? 'Online - Can sync' : 'Offline - Local only'}
            </span>
          </div>
          <button 
            onClick={syncLessons} 
            disabled={!isOnline}
            className={`btn w-full ${isOnline ? 'btn-primary' : 'btn-outline'}`}
          >
            {isOnline ? '🔄 Sync Lessons from Cloud' : '❌ No Internet Connection'}
          </button>
          {syncStatus && <p className="text-gray-300 text-sm mt-3 p-3 bg-gray-700/50 rounded-lg">{syncStatus}</p>}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Progress Sync</h3>
            <p className="card-subtitle">Upload learning progress</p>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {isOnline ? 'Online - Can sync progress' : 'Offline - Progress queued locally'}
            </span>
          </div>
          <button 
            onClick={syncProgress} 
            disabled={!isOnline}
            className={`btn w-full ${isOnline ? 'btn-accent' : 'btn-outline'}`}
          >
            {isOnline ? '📊 Sync Progress to Cloud' : '❌ No Internet Connection'}
          </button>
          {progressSyncStatus && <p className="text-gray-300 text-sm mt-3 p-3 bg-gray-700/50 rounded-lg">{progressSyncStatus}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Lessons</h3>
          <p className="card-subtitle">{lessons.length} lessons available for offline learning</p>
        </div>
        {lessons.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-gray-400">No lessons available yet. Upload some content to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {lessons.map(l => (
              <div key={l.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{l.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{l.topic}</p>
                    {l.fileName && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {l.fileName} ({(l.fileSize / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-400">Available</span>
                    {userRole === 'student' && (
                      <button
                        onClick={() => {
                          // This would open a quiz modal or navigate to quiz
                          alert('Quiz feature coming soon! This would open a quiz for: ' + l.title);
                        }}
                        className="btn btn-sm btn-accent ml-2"
                      >
                        Take Quiz
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
