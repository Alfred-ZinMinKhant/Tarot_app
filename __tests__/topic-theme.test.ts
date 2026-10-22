import { TOPICS } from '@/engine';
import { topicAccent, topicTint } from '@/theme/topicTheme';

describe('topic theme', () => {
  it('has an accent colour for every topic', () => {
    for (const topic of TOPICS) expect(topicAccent(topic)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('tints card backs only for the four life areas', () => {
    expect(topicTint('general')).toBeUndefined();
    expect(topicTint('question')).toBeUndefined();
    for (const topic of ['love', 'career', 'money', 'health'] as const) {
      expect(topicTint(topic)).toBe(topicAccent(topic));
    }
  });

  it('gives the life areas distinct accents (money shares gold with general by design)', () => {
    const accents = (['love', 'career', 'health'] as const).map(topicAccent);
    expect(new Set(accents).size).toBe(3);
  });
});
