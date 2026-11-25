import React, { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import AnalyzeTab from './pages/AnalyzeTab';
import CalibrationTab from './pages/CalibrationTab';
import ComparisonTab from './pages/ComparisonTab';
import HistoryTab from './pages/HistoryTab';
import LandingPage from './pages/LandingPage';
import { getCalibration, getExperiments, getHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [backendOnline, setBackendOnline] = useState(false);
  const [apparatus, setApparatus] = useState(null);
  const [calibrationData, setCalibrationData] = useState({
    records: [],
    group_summaries: [],
    fit: { calibrated: false, validated_count: 0, models: {} },
  });
  const [experiments, setExperiments] = useState([]);

  const refreshData = useCallback(async () => {
    try {
      const [healthRes, calRes, expRes] = await Promise.all([
        getHealth(),
        getCalibration(),
        getExperiments(),
      ]);
      setBackendOnline(healthRes.status === 'ok');
      setApparatus(healthRes.apparatus || null);
      setCalibrationData(calRes);
      setExperiments(expRes.items || []);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const calibrated = Boolean(calibrationData?.fit?.calibrated);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        calibrated={calibrated}
        backendOnline={backendOnline}
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6">
        {activeTab === 'landing' && (
          <LandingPage
            onNavigate={setActiveTab}
            apparatus={apparatus}
            calibrationSummary={{
              totalRecords: calibrationData?.records?.length ?? 14,
              calibrated,
            }}
          />
        )}

        {activeTab === 'analyze' && <AnalyzeTab onSavedExperiment={refreshData} />}

        {activeTab === 'compare' && (
          <ComparisonTab
            groupSummaries={calibrationData?.group_summaries || []}
            savedExperiments={experiments}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationTab
            calibrationData={calibrationData}
            onCalibrationChange={(updated) => setCalibrationData(updated)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab experiments={experiments} onRefresh={refreshData} />
        )}
      </main>
    </div>
  );
}
