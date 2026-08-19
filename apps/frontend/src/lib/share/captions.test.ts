import { describe, it, expect } from 'vitest';
import {
  SHARE_SIGNUP_CREDITS,
  captionWithUrl,
  facebookShareUrl,
  INSTAGRAM_WEB_URL,
  shareCaptions,
  shareOgCopy,
  xShareUrl,
} from './captions';

describe('shareCaptions', () => {
  it('keeps Polish copy short enough for X with a t.co URL', () => {
    const { x } = shareCaptions('pl');
    expect(x.length + 24).toBeLessThan(280);
    expect(x).toContain('koncepcję wnętrza');
    expect(x).not.toMatch(/wizj/i);
    expect(x).toContain(String(SHARE_SIGNUP_CREDITS));
  });

  it('invites Facebook and Instagram viewers with the advertised signup grant', () => {
    const { facebook, instagram } = shareCaptions('pl');
    expect(facebook).toContain('koncepcję wnętrza');
    expect(instagram).toContain('koncepcję wnętrza');
    expect(facebook).toContain(String(SHARE_SIGNUP_CREDITS));
    expect(instagram).toContain(String(SHARE_SIGNUP_CREDITS));
    expect(facebook).not.toMatch(/wizj/i);
    expect(instagram).not.toMatch(/wizj/i);
  });
});

describe('share intents', () => {
  it('puts caption and URL on the X intent', () => {
    const href = xShareUrl('https://project-ida.com/s/abc', shareCaptions('pl').x);
    expect(href.startsWith('https://twitter.com/intent/tweet?')).toBe(true);
    expect(href).toContain('text=');
    expect(href).toContain('url=');
    expect(href).toContain(encodeURIComponent('https://project-ida.com/s/abc'));
  });

  it('sets Facebook quote even if the dialog often ignores it', () => {
    const quote = shareCaptions('pl').facebook;
    const href = facebookShareUrl('https://project-ida.com/s/abc', quote);
    expect(href).toContain('sharer.php');
    expect(href).toContain(`u=${encodeURIComponent('https://project-ida.com/s/abc')}`);
    expect(href).toContain(`quote=${encodeURIComponent(quote)}`);
  });

  it('opens Instagram web without a file share intent', () => {
    expect(INSTAGRAM_WEB_URL).toBe('https://www.instagram.com/');
  });

  it('appends the URL for Instagram / Web Share text', () => {
    expect(captionWithUrl('cześć', 'https://project-ida.com/s/abc')).toBe(
      'cześć https://project-ida.com/s/abc',
    );
  });
});

describe('shareOgCopy', () => {
  it('leads with before/after curiosity and free credits', () => {
    const og = shareOgCopy('pl');
    expect(og.title).toContain('Przed i po');
    expect(og.description).toContain('koncepcję wnętrza');
    expect(og.description).toContain(String(SHARE_SIGNUP_CREDITS));
    expect(`${og.title} ${og.description}`).not.toMatch(/wizj/i);
  });
});
