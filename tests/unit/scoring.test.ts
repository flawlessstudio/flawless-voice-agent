import { computeScore, isPassingScore } from '../../src/eval/scoring';

describe('computeScore', () => {
  it('gives a perfect score for ideal metrics', () => {
    const score = computeScore({
      sessionId: 'sess_test',
      latencyP95Ms: 600,
      wer: 0.02,
      interruptionRate: 0.01,
      goalCompleted: true,
      handoffSuccess: true,
      compliancePassed: true,
    });
    expect(score.overallScore).toBe(10);
    expect(isPassingScore(score)).toBe(true);
  });

  it('gives score 0 when compliance fails', () => {
    const score = computeScore({
      sessionId: 'sess_test',
      latencyP95Ms: 600,
      wer: 0.02,
      interruptionRate: 0.01,
      goalCompleted: true,
      handoffSuccess: true,
      compliancePassed: false,
    });
    expect(score.overallScore).toBe(0);
    expect(isPassingScore(score)).toBe(false);
  });

  it('penalizes high latency', () => {
    const score = computeScore({
      sessionId: 'sess_test',
      latencyP95Ms: 1500,
      wer: 0.02,
      interruptionRate: 0.01,
      goalCompleted: true,
      handoffSuccess: true,
      compliancePassed: true,
    });
    expect(score.overallScore).toBeLessThan(10);
  });
});
