import { describe, expect, test } from 'bun:test';
import { localization } from '../i18n/localization';
import { anAutoAsset, aManualAsset } from '../test/builders';
import {
  draftFromAsset,
  draftToAssetInput,
  emptyAssetDraft,
  toAsset,
  validateAssetFields,
  type AssetDraft,
} from './asset-input';

const TODAY = '2026-11-03';
const l10n = localization('pt-BR', 'BRL');
const { t, money } = l10n;

const manualDraft = (overrides: Partial<AssetDraft> = {}): AssetDraft => ({
  ...emptyAssetDraft(),
  institution: 'XP',
  name: 'Tesouro 27',
  assetClass: 'tesouro',
  current: '1.615,11',
  ...overrides,
});

const autoDraft = (overrides: Partial<AssetDraft> = {}): AssetDraft => ({
  ...emptyAssetDraft(),
  institution: 'XP',
  name: 'MXRF11',
  assetClass: 'fii',
  pricing: 'auto',
  quantity: '3',
  price: '8,94',
  ...overrides,
});

const errorOf = (draft: AssetDraft) => {
  const result = draftToAssetInput(draft, TODAY, l10n);
  return 'error' in result ? result.error : null;
};

describe('emptyAssetDraft', () => {
  test('starts as a manual asset in Reserva', () => {
    expect(emptyAssetDraft()).toMatchObject({ assetClass: 'reserva', pricing: 'manual' });
  });
});

describe('draftToAssetInput', () => {
  test.each([
    [{ institution: '  ' }, t('asset.institution')],
    [{ name: '' }, t('asset.name')],
    [{ current: '' }, t('asset.current')],
    [{ current: 'abc' }, t('asset.current')],
    [{ invested: 'abc' }, t('asset.invested')],
  ])('rejects the manual draft %j', (overrides, message) => {
    expect(errorOf(manualDraft(overrides))).toBe(message);
  });

  test.each([
    [{ quantity: '' }, t('asset.quantity')],
    [{ quantity: '0' }, t('asset.quantity')],
    [{ price: '' }, t('asset.price')],
    [{ price: '0' }, t('asset.price')],
    [{ avgPrice: 'abc' }, t('asset.avgPrice')],
  ])('rejects the automatic draft %j', (overrides, message) => {
    expect(errorOf(autoDraft(overrides))).toBe(message);
  });

  test('reports the first problem in the order of the design', () => {
    expect(errorOf(autoDraft({ institution: '', name: '', quantity: '', price: '' }))).toBe(
      t('asset.institution'),
    );
    expect(errorOf(autoDraft({ quantity: '', price: '', avgPrice: 'abc' }))).toBe(t('asset.quantity'));
    expect(errorOf(autoDraft({ price: '', avgPrice: 'abc' }))).toBe(t('asset.price'));
  });

  test('accepts a manual asset worth zero, with an unknown invested amount', () => {
    const result = draftToAssetInput(manualDraft({ current: '0' }), TODAY, l10n);
    expect(result).toEqual({
      input: expect.objectContaining({ currentCents: 0, investedCents: null }),
    });
  });

  test('trims text and converts amounts', () => {
    const result = draftToAssetInput(autoDraft({ institution: ' XP ', avgPrice: '10,25' }), TODAY, l10n);
    expect(result).toEqual({
      input: expect.objectContaining({
        institution: 'XP',
        quantityE8: 300_000_000,
        priceCents: 894,
        avgPriceCents: 1025,
        today: TODAY,
      }),
    });
  });
});

describe('validateAssetFields', () => {
  test('applies the same rules to what the API receives', () => {
    const fields = {
      institution: 'XP',
      name: 'MXRF11',
      pricing: 'auto' as const,
      quantityE8: 0,
      priceCents: 894,
      avgPriceCents: null,
      investedCents: null,
      currentCents: null,
    };
    expect(validateAssetFields(fields, t)).toBe(t('asset.quantity'));
    expect(validateAssetFields({ ...fields, quantityE8: 1 }, t)).toBeNull();
    expect(validateAssetFields({ ...fields, quantityE8: 1, avgPriceCents: -1 }, t)).toBe(t('asset.avgPrice'));
  });
});

describe('draftFromAsset', () => {
  test('prefills the fields of an automatic asset', () => {
    const draft = draftFromAsset(
      anAutoAsset({ quantityE8: 389_610, avgPriceCents: null, priceCents: 1_393_769 }),
      money,
    );
    expect(draft).toMatchObject({ pricing: 'auto', quantity: '0,0038961', avgPrice: '', price: '13937,69' });
  });

  test('prefills the fields of a manual asset', () => {
    const draft = draftFromAsset(aManualAsset({ investedCents: null, currentCents: 5110 }), money);
    expect(draft).toMatchObject({ pricing: 'manual', invested: '', current: '51,10' });
  });
});

describe('toAsset', () => {
  const inputOf = (draft: AssetDraft) => {
    const result = draftToAssetInput(draft, TODAY, l10n);
    if ('error' in result) throw new Error(result.error);
    return result.input;
  };

  test('builds a manual asset dated today', () => {
    expect(toAsset('a1', inputOf(manualDraft()), null)).toEqual({
      id: 'a1',
      institution: 'XP',
      name: 'Tesouro 27',
      assetClass: 'tesouro',
      pricing: 'manual',
      investedCents: null,
      currentCents: 161_511,
      updatedAt: TODAY,
    });
  });

  test('builds an automatic asset with no daily change yet', () => {
    expect(toAsset('a1', inputOf(autoDraft()), null)).toMatchObject({
      pricing: 'auto',
      quantityE8: 300_000_000,
      priceCents: 894,
      avgPriceCents: null,
      dayChangeBps: null,
    });
  });

  describe('editing an automatic asset', () => {
    const quoted = () =>
      anAutoAsset({
        name: 'MXRF11',
        assetClass: 'fii',
        priceCents: 894,
        dayChangeBps: -210,
        quotedAt: 1_790_000_000_000,
        quoteFailed: true,
        updatedAt: '2026-10-28',
      });

    test.each([[{ institution: 'Clear' }], [{ quantity: '5' }], [{ avgPrice: '9,00' }]])(
      'keeps the quote and the date of its price when only %j changes',
      (overrides) => {
        const existing = quoted();
        expect(toAsset(existing.id, inputOf(autoDraft(overrides)), existing)).toMatchObject({
          dayChangeBps: -210,
          quotedAt: 1_790_000_000_000,
          quoteFailed: true,
          updatedAt: '2026-10-28',
        });
      },
    );

    test.each([[{ price: '9,50' }], [{ name: 'HGLG11' }], [{ assetClass: 'cripto' as const }]])(
      'forgets the quote and dates the price today when %j changes',
      (overrides) => {
        const existing = quoted();
        expect(toAsset(existing.id, inputOf(autoDraft(overrides)), existing)).toMatchObject({
          dayChangeBps: null,
          quotedAt: null,
          quoteFailed: false,
          updatedAt: TODAY,
        });
      },
    );
  });

  test('drops the fields of the previous pricing mode', () => {
    const existing = anAutoAsset({ dayChangeBps: -210 });
    const asset = toAsset(existing.id, inputOf(manualDraft()), existing);
    expect(asset).not.toHaveProperty('quantityE8');
    expect(asset).not.toHaveProperty('dayChangeBps');
  });
});
