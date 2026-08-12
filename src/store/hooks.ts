import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

/** Use throughout the app instead of plain `useDispatch` */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/** Use throughout the app instead of plain `useSelector` */
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
    useSelector<RootState, T>(selector);
