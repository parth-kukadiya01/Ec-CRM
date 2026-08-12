// ─── B2B Jewellery Design Tokens ──────────────────────────────
export const GOLD = '#C9A84C';
export const GOLD_LIGHT = '#E8C97A';
export const GOLD_DARK = '#A07830';
export const NAVY = '#0B1220';
export const NAVY_MID = '#111D35';
export const NAVY_CARD = '#162040';
export const NAVY_INPUT = '#1C2A4A';
export const NAVY_BORDER = '#2A3F6A';
export const IVORY = '#F0EAD6';
export const IVORY_LIGHT = '#FFFDF5';

export const B2B = {
    GOLD, GOLD_LIGHT, GOLD_DARK,
    NAVY, NAVY_MID, NAVY_CARD, NAVY_INPUT, NAVY_BORDER,
    IVORY, IVORY_LIGHT,
    TEXT_PRIMARY: '#FFFFFF',
    TEXT_MUTED: '#94A3B8',
    GOLD_DIM: 'rgba(201,168,76,0.1)',
    GOLD_BORDER: 'rgba(201,168,76,0.3)',
};
// ──────────────────────────────────────────────────────────────


export const Colors = {
    light: {
        text: '#0f172a',
        textMuted: '#64748b',
        background: IVORY_LIGHT,
        tint: GOLD,
        tabIconDefault: '#94a3b8',
        tabIconSelected: GOLD,
        primary: GOLD,
        primaryDark: GOLD_DARK,
        accent: '#f43f5e',
        border: '#e2e8f0',
        inputBg: '#f8fafc',
        glass: 'rgba(255, 255, 255, 0.4)',
        glassBorder: 'rgba(255, 255, 255, 0.6)',
    },
    dark: {
        text: IVORY,
        textMuted: '#8899BB',
        background: NAVY,
        tint: GOLD_LIGHT,
        tabIconDefault: '#8899BB',
        tabIconSelected: GOLD_LIGHT,
        primary: GOLD,
        primaryDark: GOLD_DARK,
        accent: '#fb7185',
        border: NAVY_BORDER,
        inputBg: NAVY_INPUT,
        glass: 'rgba(11, 18, 32, 0.88)',
        glassBorder: 'rgba(201, 168, 76, 0.25)',
    },
    // Warm ivory gradient — premium jewellery feel for main app screens
    gradient: ['#FDF8EC', '#FFFDF5', '#F9F4E8', '#FFF9F0'],
    locations: [0, 0.35, 0.7, 1],
};
