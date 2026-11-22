import { describe, expect, it } from 'vitest';
import {
  readLanguagePreference,
  resourceName,
  saveLanguagePreference,
  translate,
  translateGameLog,
  translateServerMessage,
} from '../i18n';

describe('English and Vietnamese game language', () => {
  it('uses the Vietnamese resource terms from the Catan guide', () => {
    expect(resourceName('vi', 'lumber')).toBe('Gỗ');
    expect(resourceName('vi', 'grain')).toBe('Lúa mì');
    expect(translate('vi', 'settlement')).toBe('Khu định cư');
    expect(translate('en', 'robber')).toBe('Robber');
    expect(translate('vi', 'robber')).toBe('Kẻ cướp');
  });

  it('formats dynamic labels and game log resource lists in Vietnamese', () => {
    expect(translate('vi', 'waitingForMorePlayers', { count: 2 })).toBe('Đang chờ thêm 2 người');
    expect(translateGameLog('collects 2 lumber, 1 ore.', 'vi')).toBe('nhận được 2 gỗ, 1 quặng.');
    expect(translateGameLog('steals a resource from Lan.', 'vi')).toBe('cướp một tài nguyên từ Lan.');
    expect(translateGameLog('trades 4 lumber for 1 brick.', 'vi')).toBe('đổi 4 gỗ lấy 1 gạch.');
    expect(translateGameLog('trades 1 lumber, 2 wool to Alice for 3 ore.', 'vi')).toBe(
      'đổi 1 gỗ, 2 len cho Alice để lấy 3 quặng.',
    );
  });

  it('localizes rule errors and leaves unknown server messages intact', () => {
    expect(translateServerMessage('You need 2 lumber.', 'vi')).toBe('Bạn cần 2 gỗ.');
    expect(translateServerMessage('No such map.', 'vi')).toBe('Không tìm thấy bản đồ này.');
    expect(translateServerMessage('A future server message.', 'vi')).toBe('A future server message.');
  });

  it('saves and restores the language preference with an English fallback', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    saveLanguagePreference(storage, 'vi');
    expect(readLanguagePreference(storage)).toBe('vi');
    expect(readLanguagePreference({ getItem: () => null })).toBe('en');
    expect(readLanguagePreference({ getItem: () => { throw new Error('storage blocked'); } })).toBe('en');
  });
});
