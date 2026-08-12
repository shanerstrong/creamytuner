import { Image, type ImageSource } from 'expo-image';

export const WELCOME_CREAMY_HERO = require('@/assets/images/mascot/welcome-hero-v4.png') as ImageSource;
export const WELCOME_CREAMY_POSTER = require('@/assets/images/mascot/welcome/creamy-poster.png') as ImageSource;
export const WELCOME_CREAMY_ENTRANCE = require('@/assets/images/mascot/welcome/creamy-entrance.mp4');
export const WELCOME_CREAMY_IDLE = require('@/assets/images/mascot/welcome/creamy-idle.mp4');

export const TUTORIAL_CREAMY_FRAMES: ImageSource[] = [
  require('@/assets/images/mascot/rendered/tutorial/01-empty-bored-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/02-empty-bored-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/03-fill-25-happy-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/04-fill-25-happy-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/05-fill-50-happy-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/06-fill-50-happy-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/07-fill-75-happy-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/08-fill-75-happy-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/09-near-full-concerned-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/10-near-full-concerned-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/11-full-happy-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/12-full-happy-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/13-overflow-frightened-closed.png'),
  require('@/assets/images/mascot/rendered/tutorial/14-overflow-frightened-open.png'),
  require('@/assets/images/mascot/rendered/tutorial/15-celebration.png'),
  require('@/assets/images/mascot/rendered/tutorial/16-angry.png'),
];

export const TUTORIAL_CREAMY_BLINK = require('@/assets/images/mascot/rendered/tutorial/17-full-blink.png') as ImageSource;

export function preloadCreamyFrames(sources: ImageSource[]) {
  return Promise.all(sources.map((source) => Image.loadAsync(source)));
}
