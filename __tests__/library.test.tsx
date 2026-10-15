import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import en from '../locales/en.json';
import my from '../locales/my.json';

import { CARDS } from '@/data/cards';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';
import { stripZwsp } from '@/utils/myanmar';

const normalizer = (s: string) => stripZwsp(s).trim();

const fool = CARDS[0]!;

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true });
});

describe('card library', () => {
  it('shows the deck count and filters by suit and search', async () => {
    renderRouter('./app', { initialUrl: '/library' });
    expect(await screen.findByTestId('screen-library')).toBeTruthy();
    expect(screen.getByTestId('library-count')).toHaveTextContent('Showing 78 of 78');

    fireEvent.press(screen.getByTestId('library-filter-cups'));
    expect(await screen.findByText('Showing 14 of 78')).toBeTruthy();

    fireEvent.press(screen.getByTestId('library-filter-all'));
    fireEvent.changeText(screen.getByTestId('library-search'), 'fool');
    expect(await screen.findByText('Showing 1 of 78')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('library-search'), 'zzzz');
    expect(await screen.findByText(en.library.noResultsTitle)).toBeTruthy();

    fireEvent.press(screen.getByTestId('library-search-clear'));
    expect(await screen.findByText('Showing 78 of 78')).toBeTruthy();
  });

  it('searches in Burmese and shows Burmese numerals when enabled', async () => {
    useSettings.setState({ language: 'my', burmeseNumerals: true });
    renderRouter('./app', { initialUrl: '/library' });
    expect(await screen.findByTestId('screen-library')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('library-search'), 'ခွက်');
    const count = await screen.findByTestId('library-count');
    expect(stripZwsp(String(count.props.children))).toBe(my.library.results.replace('{{shown}}', '၁၄').replace('{{total}}', '၇၈'));
  });

  it('opens the card page from the grid', async () => {
    const r = renderRouter('./app', { initialUrl: '/library' });
    fireEvent.changeText(await screen.findByTestId('library-search'), 'fool');
    fireEvent.press(await screen.findByTestId(`library-card-${fool.id}`));
    expect(await screen.findByTestId('card-title')).toHaveTextContent(fool.en.name);
    expect(r.getPathname()).toBe(`/card/${fool.id}`);
  });

  it('opens a card with every meaning and switches between upright and reversed', async () => {
    renderRouter('./app', { initialUrl: `/card/${fool.id}` });
    expect(await screen.findByTestId('card-title')).toHaveTextContent(fool.en.name);
    expect(screen.getByText(fool.en.upright, { normalizer })).toBeTruthy();
    expect(screen.getByText(fool.en.love.upright, { normalizer })).toBeTruthy();
    expect(screen.getByText(fool.en.advice, { normalizer })).toBeTruthy();
    expect(screen.getByTestId('card-disclaimer')).toHaveTextContent(en.disclaimer.short);

    fireEvent.press(screen.getByTestId('card-orientation-reversed'));
    expect(await screen.findByText(fool.en.reversed, { normalizer })).toBeTruthy();
    expect(screen.getByText(fool.en.money.reversed, { normalizer })).toBeTruthy();
    expect(screen.queryByText(fool.en.upright, { normalizer })).toBeNull();
  });

  it('renders the card page in Burmese', async () => {
    useSettings.setState({ language: 'my' });
    renderRouter('./app', { initialUrl: `/card/${fool.id}` });
    expect(await screen.findByText(fool.my.upright, { normalizer })).toBeTruthy();
    expect(screen.getByText(fool.en.name, { normalizer })).toBeTruthy();
  });

  it('handles an unknown card id', async () => {
    renderRouter('./app', { initialUrl: '/card/not-a-card' });
    expect(await screen.findByText(en.card.notFoundTitle)).toBeTruthy();
  });
});
