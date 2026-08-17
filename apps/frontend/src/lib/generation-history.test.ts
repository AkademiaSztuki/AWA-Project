import { describe, expect, it } from 'vitest';
import { ORIGINAL_ROOM_HISTORY_ID, originalRoomHistoryUrl, prependOriginalRoomHistory } from './generation-history';

describe('prependOriginalRoomHistory', () => {
  const generated = {
    id: 'gen-1',
    type: 'initial' as const,
    label: 'Wizja',
    timestamp: 1,
    imageUrl: 'data:image/jpeg;base64,abc',
  };

  it('puts the original room photo first', () => {
    const next = prependOriginalRoomHistory(
      [generated],
      '/images/tinder/Living Room (1).jpg',
      'Uploaded photo',
    );
    expect(next[0]).toMatchObject({
      id: ORIGINAL_ROOM_HISTORY_ID,
      type: 'upload',
      imageUrl: '/images/tinder/Living Room (1).jpg',
    });
    expect(next[1]).toEqual(generated);
  });

  it('does not prepend without an original URL and does not duplicate', () => {
    expect(prependOriginalRoomHistory([generated], null, 'Uploaded photo')).toEqual([generated]);
    const once = prependOriginalRoomHistory([generated], '/images/tinder/Living Room (2).jpg', 'A');
    expect(prependOriginalRoomHistory(once, '/images/tinder/Living Room (2).jpg', 'B')).toEqual(once);
  });

  it('reads the upload node URL and ignores generated visions', () => {
    expect(originalRoomHistoryUrl([generated])).toBeNull();
    const withUpload = prependOriginalRoomHistory(
      [generated],
      '/images/tinder/Living Room (1).jpg',
      'Uploaded photo',
    );
    expect(originalRoomHistoryUrl(withUpload)).toBe('/images/tinder/Living Room (1).jpg');
  });
});
