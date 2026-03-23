import React, { useState, useEffect } from 'react';
import { Role, Test, TestAttempt } from './types';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import TestInterface from './components/TestInterface';
import TestReview from './components/TestReview';
import { supabaseService } from './services/supabaseService';

export default function App() {
  const [user, setUser] = useState<{role: Role, name: string, data?: any} | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [reviewData, setReviewData] = useState<{test: Test, attempt: TestAttempt} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedTests, fetchedAttempts] = await Promise.all([
          supabaseService.getTests(),
          supabaseService.getAttempts()
        ]);
        setTests(fetchedTests);
        setAttempts(fetchedAttempts);
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = (role: Role, name: string, data?: any) => {
    setUser({ role, name, data });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTest(null);
    setReviewData(null);
  };

  const handleAddTest = async (test: Test) => {
    try {
      await supabaseService.addTest(test);
      const updatedTests = await supabaseService.getTests();
      setTests(updatedTests);
    } catch (error) {
      console.error('Error adding test:', error);
      alert('Failed to add test to database.');
    }
  };

  const handleTestSubmit = async (attempt: TestAttempt) => {
    try {
      await supabaseService.addAttempt(attempt);
      await supabaseService.clearCollaborators(attempt.testId);
      const updatedAttempts = await supabaseService.getAttempts();
      setAttempts(updatedAttempts);
      setActiveTest(null);
      const test = tests.find(t => t.id === attempt.testId);
      if (test) {
        setReviewData({ test, attempt });
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test to database.');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-serif text-2xl">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'teacher') {
    return (
      <TeacherDashboard 
        user={user} 
        tests={tests} 
        attempts={attempts} 
        onAddTest={handleAddTest} 
        onTestsUpdate={setTests}
        onLogout={handleLogout} 
      />
    );
  }

  if (activeTest) {
    return <TestInterface test={activeTest} studentName={user.name} studentData={user.data} onSubmit={handleTestSubmit} />;
  }

  if (reviewData) {
    return <TestReview test={reviewData.test} attempt={reviewData.attempt} onBack={() => setReviewData(null)} />;
  }

    return (
      <StudentDashboard 
        studentName={user.name} 
        studentData={user.data}
        tests={tests} 
        attempts={attempts.filter(a => a.studentName === user.name)} 
        onStartTest={setActiveTest}
        onReviewTest={(test, attempt) => setReviewData({test, attempt})}
        onLogout={handleLogout}
        onAdminAccess={() => setUser({ ...user, role: 'teacher' })}
      />
    );
}
