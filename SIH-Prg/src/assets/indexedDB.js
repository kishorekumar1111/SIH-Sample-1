import { openDB } from 'idb';

export const initDB = async () => {
  try {
    return await openDB('edumesh', 4, {
      upgrade(db, oldVersion) {
        console.log('Upgrading database from version', oldVersion, 'to version 4');
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('lessons')) {
          db.createObjectStore('lessons', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'lessonId' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('quizResults')) {
          db.createObjectStore('quizResults', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      }
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    // If database is corrupted, try to delete and recreate
    if (error.name === 'VersionError' || error.message.includes('aborted')) {
      console.log('Attempting to clear corrupted database...');
      try {
        await indexedDB.deleteDatabase('edumesh');
        return await openDB('edumesh', 4, {
          upgrade(db) {
            db.createObjectStore('lessons', { keyPath: 'id' });
            db.createObjectStore('progress', { keyPath: 'lessonId' });
            db.createObjectStore('files', { keyPath: 'id' });
            db.createObjectStore('quizResults', { keyPath: 'id' });
            db.createObjectStore('syncQueue', { keyPath: 'id' });
          }
        });
      } catch (retryError) {
        console.error('Failed to recreate database:', retryError);
        throw retryError;
      }
    }
    throw error;
  }
};

export const saveLesson = async (lesson) => {
  try {
    const db = await initDB();
    await db.put('lessons', lesson);
  } catch (error) {
    console.error('Error saving lesson:', error);
    throw error;
  }
};

export const getLessons = async () => {
  try {
    const db = await initDB();
    return await db.getAll('lessons');
  } catch (error) {
    console.error('Error getting lessons:', error);
    return [];
  }
};

export const saveProgress = async (progress) => {
  const db = await initDB();
  await db.put('progress', progress);
};

export const getAllProgress = async () => {
  const db = await initDB();
  return db.getAll('progress');
};

// File storage functions
export const saveFile = async (file, lessonId) => {
  try {
    const db = await initDB();
    const fileData = {
      id: lessonId,
      name: file.name,
      type: file.type,
      size: file.size,
      data: await file.arrayBuffer(),
      uploadedAt: Date.now()
    };
    await db.put('files', fileData);
    return fileData;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
};

export const getFile = async (lessonId) => {
  const db = await initDB();
  return db.get('files', lessonId);
};

export const createFileURL = (fileData) => {
  const blob = new Blob([fileData.data], { type: fileData.type });
  return URL.createObjectURL(blob);
};

// Progress tracking functions
export const updateProgress = async (lessonId, progressData) => {
  try {
    const db = await initDB();
    const progress = {
      lessonId,
      ...progressData,
      lastUpdated: Date.now(),
      synced: false
    };
    await db.put('progress', progress);
    
    // Add to sync queue
    await addToSyncQueue('progress', progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};

export const getProgress = async (lessonId) => {
  try {
    const db = await initDB();
    return await db.get('progress', lessonId);
  } catch (error) {
    console.error('Error getting progress:', error);
    return null;
  }
};


// Quiz results functions
export const saveQuizResult = async (quizResult) => {
  try {
    const db = await initDB();
    const result = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...quizResult,
      completedAt: Date.now(),
      synced: false
    };
    await db.put('quizResults', result);
    
    // Add to sync queue
    await addToSyncQueue('quizResult', result);
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

export const getQuizResults = async () => {
  try {
    const db = await initDB();
    return await db.getAll('quizResults');
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return [];
  }
};

// Sync queue functions
export const addToSyncQueue = async (type, data) => {
  try {
    const db = await initDB();
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      createdAt: Date.now(),
      attempts: 0
    };
    await db.put('syncQueue', queueItem);
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
};

export const getSyncQueue = async () => {
  try {
    const db = await initDB();
    return await db.getAll('syncQueue');
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
};

export const removeFromSyncQueue = async (id) => {
  try {
    const db = await initDB();
    await db.delete('syncQueue', id);
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
};

export const markAsSynced = async (type, id) => {
  try {
    const db = await initDB();
    if (type === 'progress') {
      const progress = await db.get('progress', id);
      if (progress) {
        progress.synced = true;
        await db.put('progress', progress);
      }
    } else if (type === 'quizResult') {
      const result = await db.get('quizResults', id);
      if (result) {
        result.synced = true;
        await db.put('quizResults', result);
      }
    }
  } catch (error) {
    console.error('Error marking as synced:', error);
  }
};