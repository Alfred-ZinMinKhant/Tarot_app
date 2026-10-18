import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { ScrollView } from 'react-native';

import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';

const scrollTo = (y: number) =>
  fireEvent.scroll(screen.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { y } } });

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS, language: 'en', hasOnboarded: true, haptics: false, deviceSeed: 's' });
});

describe('back to top', () => {
  it('appears after scrolling down a screen and hides again near the top', async () => {
    renderRouter('./app', { initialUrl: '/about' });
    expect(await screen.findByTestId('screen-about')).toBeTruthy();
    expect(screen.queryByTestId('back-to-top')).toBeNull();
    scrollTo(900);
    expect(await screen.findByTestId('back-to-top')).toBeTruthy();
    scrollTo(100);
    expect(screen.queryByTestId('back-to-top')).toBeNull();
  });

  it('scrolls the screen back to the top when pressed', async () => {
    renderRouter('./app', { initialUrl: '/about' });
    await screen.findByTestId('screen-about');
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    const spy = jest.spyOn(scrollView.instance, 'scrollTo').mockImplementation(() => undefined);
    scrollTo(900);
    fireEvent.press(await screen.findByTestId('back-to-top'));
    expect(spy).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});
