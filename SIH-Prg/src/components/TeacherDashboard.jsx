import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, authReady } from '../assets/firebase';
import { getAllProgress, getQuizResults } from '../assets/indexedDB';

export default function TeacherDashboard() {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLessons: 0,
    totalStudents: 0,
    completionRate: 0,
    avgScore: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Wait for auth
      await authReady;
      
      // Load lessons from Firestore
      const lessonsQuery = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'));
      const lessonsSnapshot = await getDocs(lessonsQuery);
      const lessonsData = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLessons(lessonsData);

      // Load progress from local storage
      const progressData = await getAllProgress();
      setProgress(progressData);

      // Load quiz results
      const quizData = await getQuizResults();
      setQuizResults(quizData);

      // Calculate stats
      const uniqueStudents = new Set(progressData.map(p => p.studentId)).size;
      const completedLessons = progressData.filter(p => p.completed).length;
      const avgScore = quizData.length > 0 
        ? quizData.reduce((sum, q) => sum + (q.score || 0), 0) / quizData.length 
        : 0;

      setStats({
        totalLessons: lessonsData.length,
        totalStudents: uniqueStudents,
        completionRate: lessonsData.length > 0 ? (completedLessons / lessonsData.length) * 100 : 0,
        avgScore: Math.round(avgScore)
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="w-8 h-8 mx-auto mb-4 bg-gray-700 rounded-full"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-2">
          Teacher Dashboard
        </h2>
        <p className="text-gray-400">Monitor student progress and engagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-400 mb-2">{stats.totalLessons}</div>
            <div className="text-sm text-gray-400">Total Lessons</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary-400 mb-2">{stats.totalStudents}</div>
            <div className="text-sm text-gray-400">Active Students</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-400 mb-2">{Math.round(stats.completionRate)}%</div>
            <div className="text-sm text-gray-400">Completion Rate</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{stats.avgScore}</div>
            <div className="text-sm text-gray-400">Avg Quiz Score</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Progress</h3>
            <p className="card-subtitle">Latest student activities</p>
          </div>
          <div className="space-y-3">
            {progress.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">{p.lessonId}</div>
                  <div className="text-sm text-gray-400">
                    {p.completed ? 'Completed' : `${p.progress || 0}%`}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(p.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            ))}
            {progress.length === 0 && (
              <p className="text-gray-400 text-center py-4">No progress data yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quiz Results</h3>
            <p className="card-subtitle">Latest quiz performances</p>
          </div>
          <div className="space-y-3">
            {quizResults.slice(0, 5).map((quiz, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">{quiz.lessonId}</div>
                  <div className="text-sm text-gray-400">Score: {quiz.score || 0}%</div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(quiz.completedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {quizResults.length === 0 && (
              <p className="text-gray-400 text-center py-4">No quiz results yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Lessons Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lessons Overview</h3>
          <p className="card-subtitle">All uploaded lessons and their performance</p>
        </div>
        <div className="space-y-4">
          {lessons.map((lesson, i) => {
            const lessonProgress = progress.filter(p => p.lessonId === lesson.id);
            const completionRate = lessonProgress.length > 0 
              ? (lessonProgress.filter(p => p.completed).length / lessonProgress.length) * 100 
              : 0;

            return (
              <div key={lesson.id || i} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white">{lesson.title}</h4>
                    <p className="text-sm text-gray-300">{lesson.topic}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">{lessonProgress.length} students</div>
                    <div className="text-xs text-gray-500">{Math.round(completionRate)}% completed</div>
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          {lessons.length === 0 && (
            <p className="text-gray-400 text-center py-8">No lessons uploaded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
