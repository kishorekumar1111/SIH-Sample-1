import React, { useState, useEffect } from 'react';
import { saveQuizResult, updateProgress } from '../assets/indexedDB';

export default function QuizSystem({ lessonId, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // Sample quiz questions - in a real app, these would come from the lesson data
  const questions = [
    {
      id: 1,
      question: "What is the main purpose of this lesson?",
      options: [
        "To learn basic concepts",
        "To practice problem solving",
        "To understand advanced topics",
        "To review previous material"
      ],
      correct: 0
    },
    {
      id: 2,
      question: "Which of the following is most important for understanding this topic?",
      options: [
        "Memorizing facts",
        "Understanding concepts",
        "Following procedures",
        "Taking notes"
      ],
      correct: 1
    },
    {
      id: 3,
      question: "How would you apply what you learned in a real situation?",
      options: [
        "By following the exact steps shown",
        "By adapting the concepts to new problems",
        "By memorizing the examples",
        "By asking for help"
      ],
      correct: 1
    }
  ];

  useEffect(() => {
    if (timeLeft > 0 && !completed) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !completed) {
      submitQuiz();
    }
  }, [timeLeft, completed]);

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      // Calculate score
      let correctAnswers = 0;
      questions.forEach(question => {
        if (answers[question.id] === question.correct) {
          correctAnswers++;
        }
      });
      
      const finalScore = Math.round((correctAnswers / questions.length) * 100);
      setScore(finalScore);
      setCompleted(true);

      // Save quiz result
      await saveQuizResult({
        lessonId,
        score: finalScore,
        answers,
        timeSpent: 300 - timeLeft,
        completedAt: Date.now()
      });

      // Update progress
      await updateProgress(lessonId, {
        quizCompleted: true,
        quizScore: finalScore,
        completed: finalScore >= 70 // Pass if 70% or higher
      });

      if (onComplete) {
        onComplete(finalScore);
      }

    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (completed) {
    return (
      <div className="card">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            score >= 70 ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <span className="text-2xl font-bold text-white">{score}%</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {score >= 70 ? 'Congratulations!' : 'Keep Learning!'}
          </h3>
          <p className="text-gray-400 mb-4">
            {score >= 70 
              ? 'You passed the quiz! Great job understanding the material.'
              : 'You need to review the lesson material. Try again after studying more.'
            }
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
            >
              Take Quiz Again
            </button>
            <button 
              onClick={() => onComplete && onComplete(score)} 
              className="btn btn-secondary"
            >
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title">Lesson Quiz</h3>
            <p className="card-subtitle">Question {currentQuestion + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Time: <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            <div className="w-24 bg-gray-600 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-4">{question.question}</h4>
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <label 
              key={index}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                answers[question.id] === index
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={index}
                checked={answers[question.id] === index}
                onChange={() => handleAnswer(question.id, index)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  answers[question.id] === index
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-400'
                }`}>
                  {answers[question.id] === index && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <span className="text-gray-200">{option}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="btn btn-outline"
        >
          Previous
        </button>
        <button
          onClick={nextQuestion}
          className="btn btn-primary"
        >
          {currentQuestion === questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
