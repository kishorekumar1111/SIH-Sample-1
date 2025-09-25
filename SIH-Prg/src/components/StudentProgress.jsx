import React, { useState, useEffect } from 'react';
import { getAllProgress, getQuizResults, updateProgress } from '../assets/indexedDB';

export default function StudentProgress() {
  const [progress, setProgress] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    averageScore: 0,
    studyStreak: 0
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      
      const progressData = await getAllProgress();
      const quizData = await getQuizResults();
      
      setProgress(progressData);
      setQuizResults(quizData);

      // Calculate stats
      const completed = progressData.filter(p => p.completed).length;
      const avgScore = quizData.length > 0 
        ? quizData.reduce((sum, q) => sum + (q.score || 0), 0) / quizData.length 
        : 0;

      // Calculate study streak (simplified)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const recentActivity = progressData.filter(p => {
        const activityDate = new Date(p.lastUpdated);
        return activityDate >= yesterday;
      });

      setStats({
        totalLessons: progressData.length,
        completedLessons: completed,
        averageScore: Math.round(avgScore),
        studyStreak: recentActivity.length
      });

    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (lessonId) => {
    try {
      await updateProgress(lessonId, {
        completed: true,
        completedAt: Date.now()
      });
      loadProgress(); // Refresh data
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="w-8 h-8 mx-auto mb-4 bg-gray-700 rounded-full"></div>
            <p className="text-gray-400">Loading your progress...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-secondary-400 to-primary-400 bg-clip-text text-transparent mb-2">
          My Learning Progress
        </h2>
        <p className="text-gray-400">Track your educational journey</p>
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
            <div className="text-3xl font-bold text-secondary-400 mb-2">{stats.completedLessons}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-400 mb-2">{stats.averageScore}%</div>
            <div className="text-sm text-gray-400">Average Score</div>
          </div>
        </div>
        <div className="card">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{stats.studyStreak}</div>
            <div className="text-sm text-gray-400">Study Streak</div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lesson Progress</h3>
          <p className="card-subtitle">Your learning journey</p>
        </div>
        <div className="space-y-4">
          {progress.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-400">No progress data yet. Start learning to see your progress!</p>
            </div>
          ) : (
            progress.map((lesson, i) => {
              const quizResult = quizResults.find(q => q.lessonId === lesson.lessonId);
              const progressPercent = lesson.progress || 0;
              
              return (
                <div key={lesson.lessonId || i} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{lesson.lessonId}</h4>
                      <p className="text-sm text-gray-300">
                        {lesson.completed ? 'Completed' : `${progressPercent}% complete`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.completed && (
                        <div className="flex items-center gap-1 text-green-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs">Completed</span>
                        </div>
                      )}
                      {quizResult && (
                        <div className="text-xs text-accent-400">
                          Quiz: {quizResult.score}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        lesson.completed ? 'bg-green-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${lesson.completed ? 100 : progressPercent}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Last updated: {new Date(lesson.lastUpdated).toLocaleDateString()}</span>
                    {!lesson.completed && (
                      <button
                        onClick={() => markAsCompleted(lesson.lessonId)}
                        className="btn btn-sm btn-primary"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quiz Results */}
      {quizResults.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quiz Results</h3>
            <p className="card-subtitle">Your quiz performances</p>
          </div>
          <div className="space-y-3">
            {quizResults.map((quiz, i) => (
              <div key={quiz.id || i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <div className="font-medium text-white">{quiz.lessonId}</div>
                  <div className="text-sm text-gray-400">
                    Completed: {new Date(quiz.completedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    quiz.score >= 70 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {quiz.score}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(quiz.timeSpent / 60)}m
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
