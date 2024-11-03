import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async Thunks for user authentication actions
export const registerUser = createAsyncThunk('auth/registerUser', async (userData) => {
    const response = await axios.post('http://localhost:5555/user/register', userData);
    return response.data;
});

export const loginUser = createAsyncThunk('auth/loginUser', async (userData) => {
    const response = await axios.post('http://localhost:5555/user/login', userData);
    return response.data;
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
    const response = await axios.post('http://localhost:5555/user/logout');
    return response.data;
});

// Initial state for the auth slice
const initialState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    status: 'idle', // status can be 'idle', 'loading', 'succeeded', 'failed'
    error: null,
};

// Slice definition
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state, action) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.isAuthenticated = true;
        },
        clearAuth: (state) => {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.status = 'succeeded';
                state.error = null; // Reset error on success
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message; // Capture error message
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.refreshToken = action.payload.refreshToken;
                state.isAuthenticated = true;
                state.status = 'succeeded';
                state.error = null; // Reset error on success
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message; // Capture error message
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.accessToken = null;
                state.refreshToken = null;
                state.isAuthenticated = false;
                state.status = 'succeeded';
                state.error = null; // Reset error on logout
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message; // Capture error message
            });
    },
});

// Export actions and reducer
export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
