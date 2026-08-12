import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';
import { storage } from '../../services/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
    _id: string;
    email: string;
    fullName?: string;
    companyName?: string;
    phone?: string;
    role?: string;
    avatar?: string;
    [key: string]: any;
}

export interface AuthState {
    token: string | null;
    user: AuthUser | null;
    /** true while reading AsyncStorage on app boot */
    isLoading: boolean;
    /** true while a login / logout network call is in-flight */
    isAuthenticating: boolean;
    error: string | null;
}

const initialState: AuthState = {
    token: null,
    user: null,
    isLoading: true,
    isAuthenticating: false,
    error: null,
};

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Called once on app boot — reads persisted token + user from AsyncStorage
 * so the app can decide which navigator to show before any network call.
 */
export const hydrateAuth = createAsyncThunk('auth/hydrate', async () => {
    const token = await storage.getItem('userToken');
    const userStr = await storage.getItem('userData');
    const user: AuthUser | null = userStr ? JSON.parse(userStr) : null;
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    return { token, user };
});

/**
 * Login thunk — delegates to authService which saves token/user to
 * AsyncStorage as a side-effect, then returns them for the Redux store.
 */
export const loginUser = createAsyncThunk(
    'auth/login',
    async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const data = await authService.login(email, password);
            // authService already persisted token & userData to AsyncStorage
            const token = await storage.getItem('userToken');
            const userStr = await storage.getItem('userData');
            const user: AuthUser | null = userStr ? JSON.parse(userStr) : null;
            return { token, user };
        } catch (error: any) {
            if (error?.response?.data?.errors) {
                return rejectWithValue({
                    message: error.response.data.message,
                    errors: error.response.data.errors
                });
            }
            const message =
                error?.response?.data?.message || 'Invalid credentials. Please try again.';
            return rejectWithValue(message);
        }
    },
);

/**
 * Logout thunk — delegates to authService which clears AsyncStorage,
 * then clears the Redux store.
 */
export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
    try {
        await authService.logout();
    } catch (error: any) {
        // Even on failure, we still want to clear local state
        console.error('Logout error:', error);
    }
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /** Manually clear any auth error (e.g. when user edits the input fields) */
        clearAuthError(state) {
            state.error = null;
        },
        /** Direct-set token & user (e.g. after password reset auto-login) */
        setCredentials(state, action: PayloadAction<{ token: string; user: AuthUser }>) {
            state.token = action.payload.token;
            state.user = action.payload.user;
        },
    },
    extraReducers: (builder) => {
        // ── hydrateAuth ──────────────────────────────────────────────────────
        builder
            .addCase(hydrateAuth.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(hydrateAuth.fulfilled, (state, action) => {
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isLoading = false;
            })
            .addCase(hydrateAuth.rejected, (state) => {
                state.isLoading = false;
            });

        // ── loginUser ────────────────────────────────────────────────────────
        builder
            .addCase(loginUser.pending, (state) => {
                state.isAuthenticating = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isAuthenticating = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isAuthenticating = false;
                state.error = action.payload as string;
            });

        // ── logoutUser ───────────────────────────────────────────────────────
        builder
            .addCase(logoutUser.pending, (state) => {
                state.isAuthenticating = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.token = null;
                state.user = null;
                state.isAuthenticating = false;
                state.error = null;
            })
            .addCase(logoutUser.rejected, (state) => {
                // Clear anyway so the user is not stuck
                state.token = null;
                state.user = null;
                state.isAuthenticating = false;
            });
    },
});

export const { clearAuthError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
