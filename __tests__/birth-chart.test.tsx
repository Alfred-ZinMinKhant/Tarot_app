import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import en from '../locales/en.json';

import * as chart from '@/astro/chart';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';

const yangon = { name: 'Yangon', country: 'MM', latitude: 16.8053, longitude: 96.1561, timeZone: 'Asia/Yangon' };

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS, hasOnboarded: true, language: 'en' });
});

describe('birth chart screen', () => {
  it('rejects an impossible date', async () => {
    renderRouter('./app', { initialUrl: '/birth-chart' });
    fireEvent.changeText(await screen.findByTestId('chart-day'), '31');
    fireEvent.changeText(screen.getByTestId('chart-month'), '2');
    fireEvent.changeText(screen.getByTestId('chart-year'), '1995');
    fireEvent.press(screen.getByTestId('chart-save'));
    expect(await screen.findByTestId('chart-error')).toBeTruthy();
    expect(useSettings.getState().birth).toBeNull();
  });

  it('saves a chart from the form and shows the big three', async () => {
    renderRouter('./app', { initialUrl: '/birth-chart' });
    fireEvent.changeText(await screen.findByTestId('chart-day'), '5');
    fireEvent.changeText(screen.getByTestId('chart-month'), '5');
    fireEvent.changeText(screen.getByTestId('chart-year'), '1995');
    fireEvent.changeText(screen.getByTestId('chart-hour'), '4');
    fireEvent.changeText(screen.getByTestId('chart-minute'), '15');
    fireEvent.changeText(screen.getByTestId('chart-place'), 'Yangon');
    fireEvent.press(await screen.findByTestId('chart-place-Yangon'));
    fireEvent.press(screen.getByTestId('chart-save'));
    expect(await screen.findByTestId('chart-sun')).toBeTruthy();
    expect(screen.getByTestId('chart-rising')).toBeTruthy();
    expect(useSettings.getState().birth).toMatchObject({ date: '1995-05-05', time: '04:15' });
  });

  it('shows no Rising sign when the birth time is unknown, and can remove the chart', async () => {
    useSettings.setState({ birth: { date: '1995-05-05', time: null, place: yangon } });
    renderRouter('./app', { initialUrl: '/birth-chart' });
    expect(await screen.findByTestId('chart-moon')).toBeTruthy();
    expect(screen.queryByTestId('chart-rising')).toBeNull();
    fireEvent.press(screen.getByTestId('chart-clear'));
    expect(useSettings.getState().birth).toBeNull();
    expect(await screen.findByTestId('chart-form')).toBeTruthy();
  });

  it('shows an error card instead of a blank screen when the chart cannot be computed', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(chart, 'computeChart').mockImplementation(() => {
      throw new Error('ephemeris failed');
    });
    useSettings.setState({ birth: { date: '1995-05-05', time: null, place: yangon } });
    renderRouter('./app', { initialUrl: '/birth-chart' });
    expect(await screen.findByTestId('chart-compute-error')).toBeTruthy();
    expect(screen.getByText(en.chart.errorCompute)).toBeTruthy();
    expect(screen.queryByTestId('chart-result')).toBeNull();
    fireEvent.press(screen.getByText(en.chart.edit));
    expect(await screen.findByTestId('chart-form')).toBeTruthy();
    jest.restoreAllMocks();
  });

  it('accepts Burmese digits typed on a Myanmar keyboard', async () => {
    renderRouter('./app', { initialUrl: '/birth-chart' });
    fireEvent.changeText(await screen.findByTestId('chart-day'), '၅');
    fireEvent.changeText(screen.getByTestId('chart-month'), '၅');
    fireEvent.changeText(screen.getByTestId('chart-year'), '၁၉၉၅');
    fireEvent.changeText(screen.getByTestId('chart-hour'), '၄');
    fireEvent.changeText(screen.getByTestId('chart-minute'), '၁၅');
    fireEvent.changeText(screen.getByTestId('chart-place'), 'Yangon');
    fireEvent.press(await screen.findByTestId('chart-place-Yangon'));
    fireEvent.press(screen.getByTestId('chart-save'));
    expect(await screen.findByTestId('chart-sun')).toBeTruthy();
    expect(useSettings.getState().birth).toMatchObject({ date: '1995-05-05', time: '04:15' });
  });
});
