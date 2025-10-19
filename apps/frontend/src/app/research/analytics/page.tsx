"use client";

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { 
  exportAllResearchData,
  exportToCSV,
  analyzePRSImprovement,
  analyzePreferenceCorrelation,
  analyzeBehavioralMetrics,
  downloadJSON,
  downloadCSV,
  PRSAnalysisResult,
  PreferenceCorrelationResult,
  BehavioralMetricsResult
} from '@/lib/research/data-export';
import { BarChart3, Download, TrendingUp, Users, Eye } from 'lucide-react';

/**
 * Research Analytics Dashboard
 * 
 * For researchers only
 * - Export data (JSON, CSV)
 * - View PRS pre/post analysis
 * - Analyze implicit vs explicit correlation
 * - Behavioral metrics overview
 */
export default function ResearchAnalyticsPage() {
  const [prsAnalysis, setPrsAnalysis] = useState<PRSAnalysisResult | null>(null);
  const [preferenceAnalysis, setPreferenceAnalysis] = useState<PreferenceCorrelationResult | null>(null);
  const [behavioralAnalysis, setBehavioralAnalysis] = useState<BehavioralMetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    
    const [prs, pref, behav] = await Promise.all([
      analyzePRSImprovement(),
      analyzePreferenceCorrelation(),
      analyzeBehavioralMetrics()
    ]);

    setPrsAnalysis(prs);
    setPreferenceAnalysis(pref);
    setBehavioralAnalysis(behav);
    
    setIsLoading(false);
  };

  const handleExportJSON = async () => {
    const data = await exportAllResearchData();
    if (data) {
      downloadJSON(data, `research-data-${new Date().toISOString().split('T')[0]}.json`);
    }
  };

  const handleExportCSV = async (dataType: 'profiles' | 'sessions' | 'swipes') => {
    const csv = await exportToCSV(dataType);
    if (csv) {
      downloadCSV(csv, `research-${dataType}-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
            Research Analytics
          </h1>
          <p className="text-graphite font-modern">
            Data export and analysis tools for research validation
          </p>
        </div>

        {/* Export Section */}
        <GlassCard className="p-6 mb-8">
          <h2 className="text-2xl font-nasalization text-graphite mb-4 flex items-center gap-2">
            <Download size={24} className="text-gold" />
            Data Export
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <GlassButton onClick={handleExportJSON} variant="secondary">
              <Download size={16} className="mr-2" />
              Export All (JSON)
            </GlassButton>
            <GlassButton onClick={() => handleExportCSV('profiles')} variant="secondary">
              <Download size={16} className="mr-2" />
              Profiles (CSV)
            </GlassButton>
            <GlassButton onClick={() => handleExportCSV('sessions')} variant="secondary">
              <Download size={16} className="mr-2" />
              Sessions (CSV)
            </GlassButton>
            <GlassButton onClick={() => handleExportCSV('swipes')} variant="secondary">
              <Download size={16} className="mr-2" />
              Swipes (CSV)
            </GlassButton>
          </div>
        </GlassCard>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-silver-dark">Loading analytics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PRS Analysis */}
            {prsAnalysis && (
              <GlassCard className="p-6">
                <h2 className="text-2xl font-nasalization text-graphite mb-4 flex items-center gap-2">
                  <TrendingUp size={24} className="text-green-500" />
                  PRS Pre/Post Analysis
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Participants</p>
                    <p className="text-3xl font-nasalization text-graphite">{prsAnalysis.participantCount}</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Avg Improvement</p>
                    <p className="text-3xl font-nasalization text-green-600">
                      {prsAnalysis.averageImprovement.euclidean.toFixed(2)}
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Improved</p>
                    <p className="text-3xl font-nasalization text-green-600">
                      {prsAnalysis.improvementDistribution.improved.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="text-sm text-graphite">
                  <p><strong>X-axis (Calming):</strong> {prsAnalysis.averageImprovement.xAxis > 0 ? '+' : ''}{prsAnalysis.averageImprovement.xAxis.toFixed(2)}</p>
                  <p><strong>Y-axis (Inspiring):</strong> {prsAnalysis.averageImprovement.yAxis > 0 ? '+' : ''}{prsAnalysis.averageImprovement.yAxis.toFixed(2)}</p>
                </div>
              </GlassCard>
            )}

            {/* Preference Correlation */}
            {preferenceAnalysis && (
              <GlassCard className="p-6">
                <h2 className="text-2xl font-nasalization text-graphite mb-4 flex items-center gap-2">
                  <BarChart3 size={24} className="text-blue-500" />
                  Implicit vs Explicit Preferences
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Implicit → Satisfaction (R²)</p>
                    <p className="text-3xl font-nasalization text-blue-600">
                      {preferenceAnalysis.implicitPredictsSatisfaction.toFixed(2)}
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Explicit → Satisfaction (R²)</p>
                    <p className="text-3xl font-nasalization text-purple-600">
                      {preferenceAnalysis.explicitPredictsSatisfaction.toFixed(2)}
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Combined → Satisfaction (R²)</p>
                    <p className="text-3xl font-nasalization text-green-600">
                      {preferenceAnalysis.combinedPredictsSatisfaction.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {preferenceAnalysis.insights.map((insight, i) => (
                    <p key={i} className="text-sm text-graphite">• {insight}</p>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Behavioral Metrics */}
            {behavioralAnalysis && (
              <GlassCard className="p-6">
                <h2 className="text-2xl font-nasalization text-graphite mb-4 flex items-center gap-2">
                  <Eye size={24} className="text-purple-500" />
                  Behavioral Metrics
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Dwell Time</p>
                    <p className="text-2xl font-nasalization text-graphite">
                      {Math.round(behavioralAnalysis.averageDwellTime)}ms
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Reaction Time</p>
                    <p className="text-2xl font-nasalization text-graphite">
                      {Math.round(behavioralAnalysis.averageReactionTime)}ms
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Hesitation Rate</p>
                    <p className="text-2xl font-nasalization text-graphite">
                      {behavioralAnalysis.hesitationRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="glass-panel rounded-xl p-4">
                    <p className="text-sm text-silver-dark mb-1">Avg Velocity</p>
                    <p className="text-2xl font-nasalization text-graphite">
                      {behavioralAnalysis.swipeVelocityMean.toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {behavioralAnalysis.insights.map((insight, i) => (
                    <p key={i} className="text-sm text-graphite">• {insight}</p>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Refresh Button */}
            <div className="text-center">
              <GlassButton onClick={loadAnalytics} disabled={isLoading}>
                {isLoading ? 'Refreshing...' : 'Refresh Analytics'}
              </GlassButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

