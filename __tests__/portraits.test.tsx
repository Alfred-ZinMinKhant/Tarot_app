import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CardHero } from '@/components/CardHero';
import { LivingCard } from '@/components/LivingCard';
import { hasPortrait } from '@/services/portraits';
import { usePortraitPreview } from '@/store/portraitPreview';

describe('moving portraits', () => {
  it('has no clips until some are published, so every card falls back to the Living Card', () => {
    expect(hasPortrait('major-00-fool')).toBe(false);
  });

  it('renders a card inside the Living Card effect without an upsell when no clip exists', () => {
    render(
      <CardHero cardId="major-00-fool" width={200}>
        <Text>face</Text>
      </CardHero>,
    );
    expect(screen.getByText('face')).toBeTruthy();
    expect(screen.queryByTestId('portrait-upsell')).toBeNull();
  });

  it('keeps children visible in the Living Card wrapper', () => {
    render(
      <LivingCard width={120}>
        <Text>inside</Text>
      </LivingCard>,
    );
    expect(screen.getByText('inside')).toBeTruthy();
  });

  it('gives free users one preview a day', () => {
    const s = usePortraitPreview.getState();
    const day = new Date(2026, 10, 10, 9);
    expect(s.canPreview(day)).toBe(true);
    s.markPreviewed(day);
    expect(usePortraitPreview.getState().canPreview(new Date(2026, 10, 10, 18))).toBe(false);
    expect(usePortraitPreview.getState().canPreview(new Date(2026, 10, 11, 9))).toBe(true);
  });
});
