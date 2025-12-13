import { PromptInputs } from './scoring';
import { GenerationSource } from './modes';
import { calculateImplicitQuality, isImplicitQualitySufficient, ImplicitQualityMetrics } from './implicit-quality';
import { analyzeSourceConflict, SourceConflictAnalysis } from './conflict-analysis';
import { TinderSwipe } from '@/lib/dna';
import { calculateConfidence as calculateFacetConfidence, hasAllFacets, calculateExtremity } from './facet-derivation';

/**
 * Data quality assessment for prompt generation sources
 * Validates data completeness and quality before generation
 */

export type DataStatus = 'sufficient' | 'limited' | 'insufficient';

export interface SourceQualityReport {
  source: GenerationSource;
  status: DataStatus;
  shouldGenerate: boolean;
  
  // Quality metrics
  dataPoints: number;
  confidence: number;  // 0-100
  warnings: string[];
  
  // Source-specific metrics
  implicitQuality?: ImplicitQualityMetrics;
  conflictAnalysis?: SourceConflictAnalysis;
  hasCompleteBigFive?: boolean;
  explicitAnswerCount?: number;
}

/**
 * Quality thresholds for each source type
 */
export const QUALITY_THRESHOLDS = {
  implicit: {
    minLikes: 1,          // Minimum likes - with 30 swipes, even 1 like gives data
    minLikeRatio: 0.0,    // No minimum - like ratio not reliable with fixed 30 swipes
    maxLikeRatio: 1.0,    // No maximum - high ratio can indicate clear preferences
    minQualityScore: 15   // Minimum quality score - measures pattern consistency, not engagement
  },
  explicit: {
    requiredFields: [], // No single field required - need at least 2 explicit answers (style, palette, materials, or sensory)
    recommendedFields: ['selectedStyle', 'selectedPalette', 'topMaterials', 'sensoryPreferences', 'biophiliaScore']
  },
  personality: {
    requireComplete: true,  // Full Big Five, no fallback 50s
    noFallbackAllowed: true
  },
  mixed: {
    requireBothSources: true, // Needs both implicit and explicit
    minImplicitQuality: 30
  },
  mixed_functional: {
    requireBothSources: true,
    requireFunctionalData: true, // Needs activities/pain points
    minImplicitQuality: 30
  },
  inspiration_reference: {
    minInspirations: 1,  // At least one inspiration image
    requireImageUrl: true
  }
};

/**
 * Assesses quality for a specific source
 */
export function assessSourceQuality(
  inputs: PromptInputs,
  source: GenerationSource,
  tinderSwipes?: TinderSwipe[]
): SourceQualityReport {
  const warnings: string[] = [];
  let dataPoints = 0;
  let confidence = 0;
  let status: DataStatus = 'sufficient';
  let shouldGenerate = true;
  
  // IMPLICIT SOURCE
  if (source === GenerationSource.Implicit) {
    // Check if we have visualDNA-based implicit data (styles, colors, materials)
    const hasVisualDNAData = 
      (inputs.aestheticDNA.implicit.dominantStyles.length > 0) ||
      (inputs.aestheticDNA.implicit.colors.length > 0) ||
      (inputs.aestheticDNA.implicit.materials.length > 0);
    
    // If no Tinder swipes, check if we have visualDNA data instead
    if (!tinderSwipes || tinderSwipes.length === 0) {
      if (hasVisualDNAData) {
        // Use visualDNA as implicit data source
        const styleCount = inputs.aestheticDNA.implicit.dominantStyles.length;
        const colorCount = inputs.aestheticDNA.implicit.colors.length;
        const materialCount = inputs.aestheticDNA.implicit.materials.length;
        const totalDataPoints = styleCount + colorCount + materialCount;
        
        dataPoints = totalDataPoints;
        confidence = Math.min(100, Math.max(50, totalDataPoints * 20)); // 50-100 based on data points
        status = totalDataPoints >= 2 ? 'sufficient' : 'limited';
        shouldGenerate = true;
        
        if (status === 'limited') {
          warnings.push('Limited implicit data from visualDNA (prefer Tinder swipes for better quality)');
        }
        
        return {
          source,
          status,
          shouldGenerate,
          dataPoints,
          confidence,
          warnings,
          implicitQuality: undefined // No Tinder-based quality metrics
        };
      } else {
        // No implicit data at all
        return {
          source,
          status: 'insufficient',
          shouldGenerate: false,
          dataPoints: 0,
          confidence: 0,
          warnings: ['No implicit data available (neither Tinder swipes nor visualDNA)']
        };
      }
    }
    
    // We have Tinder swipes - use quality assessment
    const implicitQuality = calculateImplicitQuality(tinderSwipes);
    const sufficient = isImplicitQualitySufficient(implicitQuality);
    
    if (!sufficient.sufficient) {
      warnings.push(sufficient.reason || 'Implicit data quality insufficient');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (implicitQuality.qualityScore < 30) {
      // Lower threshold for "limited" status - allow generation even with lower scores
      warnings.push(`Quality score: ${implicitQuality.qualityScore}/100 (acceptable but limited)`);
      status = 'limited';
      // Still allow generation - don't block on limited quality
    }
    
    dataPoints = implicitQuality.likeCount;
    confidence = implicitQuality.qualityScore;
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      implicitQuality
    };
  }
  
  // EXPLICIT SOURCE
  if (source === GenerationSource.Explicit) {
    // Count explicit answers - biophiliaScore is optional, not required
    let answerCount = 0;
    if (inputs.aestheticDNA.explicit.selectedStyle) answerCount++;
    if (inputs.aestheticDNA.explicit.selectedPalette) answerCount++;
    if (inputs.aestheticDNA.explicit.topMaterials.length > 0) answerCount++;
    if (inputs.sensory.music && inputs.sensory.music !== 'silence') answerCount++;
    if (inputs.sensory.texture) answerCount++;
    if (inputs.sensory.light) answerCount++;
    if (inputs.psychologicalBaseline.biophiliaScore !== undefined) answerCount++;
    
    dataPoints = answerCount;
    
    // Require at least 2 explicit answers (style, palette, materials, or sensory preferences)
    // biophiliaScore is optional and doesn't count toward minimum
    const hasMinimumData = Boolean(answerCount >= 2 || 
      (inputs.aestheticDNA.explicit as any).selectedStyle || 
      inputs.aestheticDNA.explicit.selectedPalette ||
      inputs.aestheticDNA.explicit.topMaterials.length > 0);
    
    if (!hasMinimumData) {
      warnings.push('Insufficient explicit data - need at least style, palette, materials, or sensory preferences');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (answerCount < 2) {
      warnings.push('Very few explicit answers - limited personalization');
      status = 'limited';
    }
    
    confidence = hasMinimumData ? Math.min(100, answerCount * 15) : 0;
    
    return {
      source,
      status,
      shouldGenerate: hasMinimumData,
      dataPoints,
      confidence,
      warnings,
      explicitAnswerCount: answerCount
    };
  }
  
  // PERSONALITY SOURCE
  if (source === GenerationSource.Personality) {
    const hasBigFive = !!inputs.personality;
    const p = inputs.personality;
    const domainScores = p ? [
      p.openness,
      p.conscientiousness,
      p.extraversion,
      p.agreeableness,
      p.neuroticism
    ] : [];

    const allDomainsAre50 = domainScores.length === 5 && domainScores.every(v => v === 50);
    const facetsObj = p?.facets;
    const facetCount = facetsObj
      ? Object.values(facetsObj).reduce((sum, domainFacets) => sum + Object.keys(domainFacets || {}).length, 0)
      : 0;

    const hasFacetData = facetCount > 0;
    
    // Check if facets are also fallbacks (all 50)
    let allFacetsAre50 = false;
    let facetValueSample: number[] = [];
    if (hasFacetData && facetsObj) {
      const allFacetValues: number[] = [];
      for (const domainFacets of Object.values(facetsObj)) {
        if (domainFacets) {
          for (const facetValue of Object.values(domainFacets)) {
            if (typeof facetValue === 'number') {
              allFacetValues.push(facetValue);
            }
          }
        }
      }
      facetValueSample = allFacetValues.slice(0, 10); // Sample first 10 for logging
      allFacetsAre50 = allFacetValues.length > 0 && allFacetValues.every(v => v === 50);
    }
    
    // CRITICAL FIX: If all domains are 50, these are fallbacks UNLESS facets have real values
    // If facets also all 50, then everything is fallback - should NOT generate
    const isFallback = allDomainsAre50 && (!hasFacetData || allFacetsAre50);
    const isComplete = hasBigFive && !isFallback;
    
    if (!hasBigFive) {
      warnings.push('No Big Five personality data');
      status = 'insufficient';
      shouldGenerate = false;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'data-quality.ts:183',message:'Personality source - NO DATA, should NOT generate',data:{hasBigFive,shouldGenerate,status},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } else if (isFallback) {
      warnings.push('Big Five data appears to be fallback values (all domains 50' + (allFacetsAre50 ? ' and all facets 50' : '') + ') - not reliable');
      status = 'insufficient';
      shouldGenerate = false; // DO NOT generate with fallback values
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'data-quality.ts:200',message:'Personality source - FALLBACK VALUES DETECTED (all 50), should NOT generate',data:{hasBigFive,allDomainsAre50,allFacetsAre50,hasFacetData,facetCount,isComplete,shouldGenerate,status,domainScores,facetValueSample},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'data-quality.ts:207',message:'Personality source - VALID DATA, should generate',data:{hasBigFive,allDomainsAre50,allFacetsAre50,hasFacetData,facetCount,isComplete,shouldGenerate,status,domainScores,facetValueSample},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
    
    // Data points: prefer facet granularity, else domain count
    dataPoints = hasBigFive ? Math.max(facetCount, 5) : 0;

    // Confidence: leverage facet-based confidence when available
    if (hasFacetData) {
      // Reuse facet-derivation scoring (0-0.95) → percent
      const personalityPayload: any = {
        openness: p!.openness,
        conscientiousness: p!.conscientiousness,
        extraversion: p!.extraversion,
        agreeableness: p!.agreeableness,
        neuroticism: p!.neuroticism,
        facets: p!.facets
      };
      confidence = Math.round(calculateFacetConfidence(personalityPayload) * 100);
    } else if (isComplete) {
      // Domains only but not all 50
      const extremity = calculateExtremity({
        openness: p!.openness,
        conscientiousness: p!.conscientiousness,
        extraversion: p!.extraversion,
        agreeableness: p!.agreeableness,
        neuroticism: p!.neuroticism,
        facets: p!.facets
      } as any);
      confidence = Math.round(60 + extremity * 25); // 60-85 range
    } else {
      confidence = hasBigFive ? 40 : 0;
    }
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      hasCompleteBigFive: isComplete || hasFacetData
    };
  }
  
  // MIXED SOURCE
  if (source === GenerationSource.Mixed) {
    // Check both implicit and explicit
    // Note: assessSourceQuality for implicit handles both tinderSwipes and visualDNA automatically
    const implicitReport = assessSourceQuality(inputs, GenerationSource.Implicit, tinderSwipes);
    const explicitReport = assessSourceQuality(inputs, GenerationSource.Explicit);
    
    const hasBoth = implicitReport?.shouldGenerate && explicitReport?.shouldGenerate;
    const hasOne = implicitReport?.shouldGenerate || explicitReport?.shouldGenerate;
    
    dataPoints = (implicitReport?.dataPoints || 0) + (explicitReport?.dataPoints || 0);
    confidence = hasBoth 
      ? Math.round((implicitReport!.confidence + explicitReport!.confidence) / 2)
      : Math.max(implicitReport?.confidence || 0, explicitReport?.confidence || 0);
    
    // DEBUG: Log detailed mixed source analysis
    console.log('[Mixed Source] Detailed analysis:', {
      hasBoth,
      hasOne,
      implicitShouldGenerate: implicitReport?.shouldGenerate,
      implicitStatus: implicitReport?.status,
      implicitConfidence: implicitReport?.confidence,
      implicitDataPoints: implicitReport?.dataPoints,
      explicitShouldGenerate: explicitReport?.shouldGenerate,
      explicitStatus: explicitReport?.status,
      explicitConfidence: explicitReport?.confidence,
      explicitDataPoints: explicitReport?.dataPoints,
      combinedConfidence: confidence,
      combinedDataPoints: dataPoints
    });
    
    // Determine status based on data quality, not just source availability
    // If we have good quality data (high confidence + sufficient data points), mark as sufficient
    const hasGoodQuality = confidence >= 70 && dataPoints >= 4;
    
    // Detailed diagnostic warnings about missing data
    if (!hasOne) {
      status = 'insufficient';
      shouldGenerate = false;
      const missingSources: string[] = [];
      if (!implicitReport?.shouldGenerate) {
        missingSources.push('danych behawioralnych (implicit)');
        if (implicitReport?.warnings?.length) {
          warnings.push(`Brak danych behawioralnych: ${implicitReport.warnings.join(', ')}`);
        }
      }
      if (!explicitReport?.shouldGenerate) {
        missingSources.push('deklarowanych preferencji (explicit)');
        if (explicitReport?.warnings?.length) {
          warnings.push(`Brak deklarowanych preferencji: ${explicitReport.warnings.join(', ')}`);
        }
      }
      warnings.push(`Brakuje obu źródeł danych: ${missingSources.join(' i ')}`);
    } else if (!hasBoth) {
      // Missing one source - provide detailed diagnostic
      if (!implicitReport?.shouldGenerate) {
        warnings.push('Brak danych behawioralnych (Tinder swipes lub visualDNA).');
        if (!tinderSwipes || tinderSwipes.length === 0) {
          warnings.push('  - Brak swipów Tinder (0 swipów)');
        }
        if (!inputs.aestheticDNA.implicit.dominantStyles.length && 
            !inputs.aestheticDNA.implicit.colors.length && 
            !inputs.aestheticDNA.implicit.materials.length) {
          warnings.push('  - Brak danych visualDNA (brak stylów, kolorów, materiałów)');
        }
      }
      if (!explicitReport?.shouldGenerate) {
        warnings.push('Brak deklarowanych preferencji. Wymagane minimum:');
        const missingFields: string[] = [];
        if (!inputs.aestheticDNA.explicit.selectedStyle) missingFields.push('styl');
        if (!inputs.aestheticDNA.explicit.selectedPalette) missingFields.push('paleta kolorów');
        if (inputs.aestheticDNA.explicit.topMaterials.length === 0) missingFields.push('materiały');
        if (missingFields.length > 0) {
          warnings.push(`  - Brakuje: ${missingFields.join(', ')}`);
        }
      }
      
      if (hasGoodQuality) {
        // Even with one source, if quality is high, mark as sufficient
        status = 'sufficient';
        warnings.push('Tylko jedno źródło dostępne, ale jakość danych wystarczająca dla blendingu');
      } else {
        status = 'limited';
        warnings.push('Tylko jedno źródło dostępne - ograniczony blending (dla lepszej jakości potrzebne oba źródła)');
      }
    } else {
      // Has both sources - check quality
      if (hasGoodQuality) {
        status = 'sufficient';
      } else if (confidence >= 50 && dataPoints >= 2) {
        status = 'limited';
        warnings.push(`Dane dostępne, ale jakość ograniczona (confidence: ${confidence}%, wymagane: ≥70% dla pełnej jakości)`);
      } else {
        status = 'insufficient';
        shouldGenerate = false;
        warnings.push(`Niewystarczająca jakość danych (confidence: ${confidence}%, punkty: ${dataPoints})`);
      }
    }
    
    // Conflict analysis
    const conflictAnalysis = hasBoth ? analyzeSourceConflict(inputs) : undefined;
    if (conflictAnalysis?.hasConflict) {
      warnings.push(`Wykryty konflikt: ${conflictAnalysis.conflictType} (${conflictAnalysis.conflictSeverity})`);
    }
    
    return {
      source,
      status,
      shouldGenerate,
      dataPoints,
      confidence,
      warnings,
      conflictAnalysis
    };
  }
  
  // MIXED FUNCTIONAL SOURCE
  if (source === GenerationSource.MixedFunctional) {
    const mixedReport = assessSourceQuality(inputs, GenerationSource.Mixed, tinderSwipes);
    
    // Also check functional data
    const hasFunctionalData = 
      (inputs.activities && inputs.activities.length > 0) ||
      (inputs.painPoints && inputs.painPoints.length > 0) ||
      (inputs as any).primaryActivity;
    
    // Use mixed report's status and confidence/dataPoints as baseline
    let finalStatus = mixedReport.status;
    const finalConfidence = mixedReport.confidence;
    const finalDataPoints = mixedReport.dataPoints + (hasFunctionalData ? 2 : 0); // Add bonus for functional data
    
    // Determine final status based on combined quality
    if (!hasFunctionalData) {
      warnings.push('Mix funkcjonalny wymaga danych funkcjonalnych:');
      const missingFunctional: string[] = [];
      if (!inputs.activities || inputs.activities.length === 0) {
        missingFunctional.push('aktywności w pokoju');
      }
      if (!inputs.painPoints || inputs.painPoints.length === 0) {
        missingFunctional.push('punktów bólu (co przeszkadza)');
      }
      if (!(inputs as any).primaryActivity) {
        missingFunctional.push('głównej aktywności');
      }
      if (missingFunctional.length > 0) {
        warnings.push(`  - Brakuje: ${missingFunctional.join(', ')}`);
      }
      
      // If mixed is already insufficient, keep it
      // Otherwise downgrade to limited
      if (mixedReport.status !== 'insufficient') {
        finalStatus = 'limited';
      }
    } else {
      // Has functional data - check if overall quality is sufficient
      // If mixed is sufficient and we have functional data, stay sufficient
      // If mixed is limited but we have good overall quality, upgrade to sufficient
      if (mixedReport.status === 'limited' && finalConfidence >= 70 && finalDataPoints >= 6) {
        finalStatus = 'sufficient';
        warnings.push('Dane funkcjonalne dostępne - jakość wystarczająca');
      } else if (mixedReport.status === 'sufficient') {
        finalStatus = 'sufficient';
      } else {
        warnings.push(`Dane funkcjonalne dostępne, ale ogólna jakość ograniczona (confidence: ${finalConfidence}%, wymagane: ≥70%)`);
      }
    }
    
    return {
      ...mixedReport,
      source: GenerationSource.MixedFunctional,
      status: finalStatus,
      shouldGenerate: mixedReport.shouldGenerate && hasFunctionalData,
      dataPoints: finalDataPoints,
      confidence: finalConfidence,
      warnings: [...mixedReport.warnings, ...warnings]
    };
  }
  
  // INSPIRATION REFERENCE SOURCE
  if (source === GenerationSource.InspirationReference) {
    const inspirations = inputs.inspirations || [];
    const hasInspirations = inspirations.length >= QUALITY_THRESHOLDS.inspiration_reference.minInspirations;
    // Check for url, imageBase64, previewUrl, or image (multiple possible formats)
    const hasUrls = inspirations.some(i => {
      const insp = i as any;
      return insp.url || insp.imageBase64 || insp.previewUrl || insp.image;
    });
    
    if (!hasInspirations) {
      warnings.push('No inspiration images provided');
      status = 'insufficient';
      shouldGenerate = false;
    } else if (!hasUrls) {
      warnings.push('Inspiration images missing URLs or base64 data');
      status = 'limited';
      // Still allow generation if we have inspirations - base64 can be extracted later
      shouldGenerate = hasInspirations;
    }
    
    dataPoints = inspirations.length;
    confidence = hasInspirations && hasUrls ? 80 : (hasInspirations ? 40 : 0);
    
    return {
      source,
      status,
      shouldGenerate: hasInspirations,
      dataPoints,
      confidence,
      warnings
    };
  }
  
  // Default fallback
  return {
    source,
    status: 'limited',
    shouldGenerate: true,
    dataPoints: 0,
    confidence: 50,
    warnings: ['Unknown source type']
  };
}

/**
 * Assesses quality for all available sources
 */
export function assessAllSourcesQuality(
  inputs: PromptInputs,
  tinderSwipes?: TinderSwipe[]
): SourceQualityReport[] {
  const sources: GenerationSource[] = [
    GenerationSource.Implicit,
    GenerationSource.Explicit,
    GenerationSource.Personality,
    GenerationSource.Mixed,
    GenerationSource.MixedFunctional,
    GenerationSource.InspirationReference
  ];
  
  return sources.map(source => 
    assessSourceQuality(inputs, source, tinderSwipes)
  );
}

/**
 * Gets viable sources (shouldGenerate = true)
 */
export function getViableSources(reports: SourceQualityReport[]): GenerationSource[] {
  return reports
    .filter(r => r.shouldGenerate)
    .map(r => r.source);
}

