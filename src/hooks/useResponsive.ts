import { useWindowDimensions } from 'react-native';

// Base design width (iPhone standard)
const BASE_WIDTH = 375;

type Breakpoint = 'smallPhone' | 'phone' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
    width: number;
    height: number;
    breakpoint: Breakpoint;
    isSmallPhone: boolean;
    isPhone: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    columns: number;
    scale: (size: number) => number;
    hp: (percentage: number) => number;
    wp: (percentage: number) => number;
}

export function useResponsive(): ResponsiveInfo {
    const { width, height } = useWindowDimensions();

    const isSmallPhone = width < 360;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isPhone = width < 768;

    let breakpoint: Breakpoint = 'phone';
    if (isSmallPhone) breakpoint = 'smallPhone';
    else if (isDesktop) breakpoint = 'desktop';
    else if (isTablet) breakpoint = 'tablet';

    // Columns for product grids
    let columns = 2;
    if (isTablet) columns = 3;
    if (isDesktop) columns = 4;

    // Scale function relative to base width
    const scale = (size: number) => (width / BASE_WIDTH) * size;

    // Height percentage
    const hp = (percentage: number) => (percentage / 100) * height;

    // Width percentage
    const wp = (percentage: number) => (percentage / 100) * width;

    return {
        width,
        height,
        breakpoint,
        isSmallPhone,
        isPhone,
        isTablet,
        isDesktop,
        columns,
        scale,
        hp,
        wp,
    };
}
