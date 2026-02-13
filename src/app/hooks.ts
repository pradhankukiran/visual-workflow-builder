import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

/**
 * Typed version of `useDispatch` that knows about our thunk and middleware types.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Typed version of `useSelector` that knows about our RootState.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
