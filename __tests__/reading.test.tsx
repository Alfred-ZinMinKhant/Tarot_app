import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import en from '../locales/en.json';

import { CARDS } from '@/data/cards';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { stripZwsp } from '@/utils/myanmar';

const normalizer = (s: string) => stripZwsp(s).trim();

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false });
});

/** Card names shown inside an element (to find out which cards were drawn). */
function cardsIn(testID: string) {
  const el = screen.getByTestId(testID);
  return CARDS.filter((c) => within(el).queryAllByText(c.en.name, { normalizer }).length > 0);
}

async function startAndPick(spreadId: string, pickIndices: number[] | 'auto') {
  renderRouter('./app', { initialUrl: '/home' });
  fireEvent.press(await screen.findByTestId(`home-spread-${spreadId}`));
  fireEvent.press(await screen.findByTestId('reading-start'));
  fireEvent.press(await screen.findByTestId('reading-shuffle'));
  await screen.findByTestId('fan-deck');
  if (pickIndices === 'auto') fireEvent.press(screen.getByTestId('reading-pick-for-me'));
  else {
    // Picked cards are hidden from screen readers, so include hidden elements when re-tapping.
    for (const i of pickIndices)
      fireEvent.press(screen.getByTestId(`fan-card-${i}`, { includeHiddenElements: true }));
  }
}

/** Waits for the reveal step (the face-down cards in the picking step are not tappable). */
const revealStep = () =>
  screen.findByText(en.reading.revealTitle, { normalizer }, { timeout: 2000 });

describe('reading flow', () => {
  it('runs a one-card reading from Home to summary', async () => {
    await startAndPick('one-card', [3]);
    await revealStep();
    fireEvent.press(screen.getByTestId('spread-card-0'));
    expect(await screen.findByTestId('reading-position-0')).toBeTruthy();
    const [card] = cardsIn('reading-position-0');
    expect(card).toBeDefined();
    expect(await screen.findByTestId('reading-summary')).toBeTruthy();
    expect(
      screen.getByText(`A thought to carry with you: ${card!.en.advice}`, { normalizer }),
    ).toBeTruthy();
    expect(screen.getByTestId('reading-disclaimer')).toHaveTextContent(en.disclaimer.short);
  });

  it('ignores taps on a card that was already picked', async () => {
    await startAndPick('three-past-present-future', [0, 0, 0]);
    expect(screen.getByTestId('reading-pick-title')).toHaveTextContent(/2 to go/);
  });

  it('draws ten different cards for the Celtic Cross and summarises them', async () => {
    await startAndPick('celtic-cross', 'auto');
    fireEvent.press(await screen.findByTestId('reading-reveal-all', {}, { timeout: 2000 }));
    for (let i = 0; i < 10; i++)
      expect(await screen.findByTestId(`reading-position-${i}`)).toBeTruthy();
    const names = Array.from({ length: 10 }, (_, i) => cardsIn(`reading-position-${i}`)[0]!.id);
    expect(new Set(names).size).toBe(10);
    expect(await screen.findByTestId('reading-summary')).toBeTruthy();
  });

  it('uses the topic reading for the chosen topic', async () => {
    renderRouter('./app', { initialUrl: '/reading/one-card' });
    fireEvent.press(await screen.findByTestId('topic-love'));
    fireEvent.press(screen.getByTestId('reading-start'));
    fireEvent.press(await screen.findByTestId('reading-shuffle'));
    fireEvent.press(await screen.findByTestId('fan-card-10'));
    await revealStep();
    fireEvent.press(screen.getByTestId('spread-card-0'));
    await screen.findByTestId('reading-position-0');
    const [card] = cardsIn('reading-position-0');
    const reversed =
      within(screen.getByTestId('reading-position-0')).queryByText(en.card.reversed) !== null;
    const expected = reversed ? card!.en.love.reversed : card!.en.love.upright;
    expect(
      within(screen.getByTestId('reading-position-0')).getByText(expected, { normalizer }),
    ).toBeTruthy();
  });

  it('never shows reversed cards when reversals are off', async () => {
    useSettings.setState({ reversedCards: false });
    await startAndPick('celtic-cross', 'auto');
    fireEvent.press(await screen.findByTestId('reading-reveal-all', {}, { timeout: 2000 }));
    await screen.findByTestId('reading-summary');
    expect(screen.queryAllByText(en.card.reversed)).toHaveLength(0);
  });

  it('shows a caring message instead of a reading for crisis questions', async () => {
    renderRouter('./app', { initialUrl: '/reading/three-situation-challenge-advice' });
    fireEvent.press(await screen.findByTestId('topic-question'));
    fireEvent.changeText(screen.getByTestId('reading-question-input'), 'I want to die');
    fireEvent.press(screen.getByTestId('reading-start'));
    expect(await screen.findByTestId('reading-crisis')).toBeTruthy();
    expect(screen.getByText(en.reading.crisisBody, { normalizer })).toBeTruthy();
    expect(screen.queryByTestId('reading-shuffle')).toBeNull();
    expect(screen.queryByTestId('reading-crisis-call')).toBeNull(); // no helpline configured

    fireEvent.press(screen.getByTestId('reading-crisis-edit'));
    expect(await screen.findByTestId('reading-question-input')).toBeTruthy();
  });

  it('shows the question with the reading', async () => {
    renderRouter('./app', { initialUrl: '/reading/one-card' });
    fireEvent.changeText(
      await screen.findByTestId('reading-question-input'),
      'What should I focus on?',
    );
    fireEvent.press(screen.getByTestId('reading-start'));
    expect(await screen.findByTestId('reading-question')).toHaveTextContent(
      'Your question: What should I focus on?',
    );
  });

  it('handles an unknown spread', async () => {
    renderRouter('./app', { initialUrl: '/reading/nope' });
    expect(await screen.findByText(en.reading.notFound)).toBeTruthy();
  });
});
