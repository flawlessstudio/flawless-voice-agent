export interface CallScore {
  sessionId: string;
  latencyP95Ms: number;
  wer: number;
  interruptionRate: number;
  goalCompleted: boolean;
  handoffSuccess: boolean;
  compliancePassed: boolean;
  overallScore: number;
}

export function computeScore(metrics: Omit<CallScore, 'overallScore'>): CallScore {
  let score = 10;

  if (metrics.latencyP95Ms > 1200) score -= 2;
  else if (metrics.latencyP95Ms > 800) score -= 1;

  if (metrics.wer > 0.05) score -= 2;
  else if (metrics.wer > 0.03) score -= 1;

  if (metrics.interruptionRate > 0.05) score -= 1;
  if (!metrics.goalCompleted) score -= 2;
  if (!metrics.handoffSuccess) score -= 1;
  if (!metrics.compliancePassed) score = 0; // hard fail

  return { ...metrics, overallScore: Math.max(0, score) };
}

export function isPassingScore(score: CallScore): boolean {
  return score.compliancePassed && score.overallScore >= 7;
}
