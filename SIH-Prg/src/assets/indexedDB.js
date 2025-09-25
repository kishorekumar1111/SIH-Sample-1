import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('edumesh', 1, {
    upgrade(db) {
      db.createObjectStore('lessons', { keyPath: 'id' });
      db.createObjectStore('progress', { keyPath: 'lessonId' });
    }
  });
};

export const saveLesson = async (lesson) => {
  const db = await initDB();
  await db.put('lessons', lesson);
};

export const getLessons = async () => {
  const db = await initDB();
  return db.getAll('lessons');
};

export const saveProgress = async (progress) => {
  const db = await initDB();
  await db.put('progress', progress);
};

export const getProgress = async () => {
  const db = await initDB();
  return db.getAll('progress');
};
