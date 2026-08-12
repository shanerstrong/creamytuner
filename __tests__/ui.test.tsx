import { act, fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const players: Array<Record<string, unknown>> = [];

  return {
    __players: players,
    VideoView: (props: object) => React.createElement(View, props),
    useVideoPlayer: (_source: unknown, setup?: (value: Record<string, unknown>) => void) => React.useMemo(() => {
      const listeners: Record<string, (...args: unknown[]) => void> = {};
      const player = {
        __emit: (event: string, ...args: unknown[]) => listeners[event]?.(...args),
        addListener: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
          listeners[event] = listener;
          return { remove: jest.fn(() => delete listeners[event]) };
        }),
        currentTime: 0,
        loop: false,
        muted: true,
        pause: jest.fn(),
        play: jest.fn(),
        replay: jest.fn(),
      };
      setup?.(player);
      players.push(player);
      return player;
    }, []),
  };
});

import { BuilderQuestionStep, CompactProgress } from '@/src/components/builder/simple-steps';
import { WelcomeCreamy } from '@/src/components/creamy/welcome-creamy';
import { NutritionFactsPanel, NutritionSummary } from '@/src/components/nutrition';
import { AppHeader, BrandWordmark } from '@/src/components/ui';

const nutrition = { calories: 325, protein: 30, carbs: 20, sugar: 12, addedSugar: 6, fat: 8, fiber: 2 };

describe('shared brand', () => {
  it('uses the static AI wordmark by itself and in standard app headers', async () => {
    const wordmark = await render(<BrandWordmark />);
    expect(wordmark.getByRole('image', { name: 'CreamyTuner' })).toBeTruthy();

    const header = await render(<AppHeader title="Saved Recipes" />);
    expect(header.getByRole('image', { name: 'CreamyTuner' })).toBeTruthy();
    expect(header.getByText('Saved Recipes')).toBeTruthy();
  });
});

describe('nutrition presentation', () => {
  it('keeps percent daily value out of the summary', async () => {
    const screen = await render(<NutritionSummary nutrition={nutrition} />);
    expect(screen.getByText('325')).toBeTruthy();
    expect(screen.getByText('30 g')).toBeTruthy();
    expect(screen.queryByText(/Daily Value|%/)).toBeNull();
  });

  it('shows daily values only in the expanded panel', async () => {
    const screen = await render(<NutritionFactsPanel nutrition={nutrition} />);
    expect(screen.getByText('% Daily Value*')).toBeTruthy();
    expect(screen.getByText('Dietary Fiber')).toBeTruthy();
      expect(screen.getByText('Total Sugars')).toBeTruthy();
      expect(screen.getByText('Includes Added Sugars')).toBeTruthy();
  });
});

describe('recommend-first builder', () => {
  const answers = { texture: 'creamy' as const, flavor: 'strawberry' as const, goal: 'high-protein' as const };

  it('shows one compact question at a time', async () => {
    const screen = await render(<BuilderQuestionStep stage="question-texture" answers={answers} onChange={jest.fn()} />);
    expect(screen.getByText('What texture sounds good?')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Creamy and scoopable. A familiar ice-cream texture.' })).toBeTruthy();
    expect(screen.queryByText('Choose a flavor')).toBeNull();
    expect(screen.queryByText('What is your main goal?')).toBeNull();
  });

  it('uses a three-question progress indicator', async () => {
    const screen = await render(<CompactProgress stage="question-flavor" />);
    expect(screen.getByText('Question 2 of 3')).toBeTruthy();
  });

  it('clearly marks the default recommendation', async () => {
    const screen = await render(<BuilderQuestionStep stage="question-goal" answers={answers} onChange={jest.fn()} />);
    expect(screen.getByText('RECOMMENDED')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'High protein. Prioritize protein and creamy body.' })).toBeTruthy();
  });
});

describe('welcome mascot', () => {
  it('plays the animated welcome over the polished fallback poster', async () => {
    const screen = await render(<WelcomeCreamy />);
    expect(screen.getByTestId('welcome-creamy-hero')).toBeTruthy();
    expect(screen.getByTestId('welcome-creamy-video')).toBeTruthy();
    expect(screen.getByTestId('welcome-creamy-stage')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Creamy mascot' })).toBeTruthy();
  });

  it('starts the idle loop after the entrance player reaches the end', async () => {
    const screen = await render(<WelcomeCreamy />);
    const players = (jest.requireMock('expo-video') as { __players: Array<{ __emit: (event: string, payload?: unknown) => void; play: jest.Mock }> }).__players.slice(-2);
    const [entrancePlayer, idlePlayer] = players;

    expect(idlePlayer.play).not.toHaveBeenCalled();
    await act(() => entrancePlayer.__emit('playToEnd'));

    expect(idlePlayer.play).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('welcome-creamy-video')).toBeTruthy();
  });

  it('falls back to the poster when video playback fails', async () => {
    const screen = await render(<WelcomeCreamy />);
    const players = (jest.requireMock('expo-video') as { __players: Array<{ __emit: (event: string, payload?: unknown) => void }> }).__players.slice(-2);

    await act(() => players[0].__emit('statusChange', { status: 'error' }));

    expect(screen.queryByTestId('welcome-creamy-video')).toBeNull();
    expect(screen.getByTestId('welcome-creamy-hero')).toBeTruthy();
  });

  it('shows the finished integrated mascot frame when motion is disabled', async () => {
    const screen = await render(<WelcomeCreamy motionEnabled={false} />);
    expect(screen.getByRole('image', { name: 'Creamy mascot' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Creamy mascot' })).toBeNull();
    expect(screen.getByTestId('welcome-creamy-hero')).toBeTruthy();
    expect(screen.queryByTestId('welcome-creamy-video')).toBeNull();
  });

  it('shows a funny face and AI ice-cream joke when Creamy is activated', async () => {
    jest.useFakeTimers();
    const screen = await render(<WelcomeCreamy />);

    await fireEvent.press(screen.getByRole('button', { name: 'Creamy mascot' }));

    expect(screen.getByTestId('welcome-creamy-reaction-face')).toBeTruthy();
    expect(screen.getByTestId('welcome-creamy-joke')).toBeTruthy();
    await act(async () => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });
});
