import { createSlice } from '@reduxjs/toolkit';

import { ThunkType } from 'src/state/State';
import WDLink from "src/types/WDLink";
export interface ContentState {
    isLoaded: boolean;
    wdLink: WDLink;
}

export const contentDefaultState: ContentState = {
    isLoaded: false,
    wdLink: { title: '', url: '', tenant: '', proxy: '', stopProxy: '', login: '' }
};

const slice = createSlice({
    name: 'profile',
    initialState: contentDefaultState,
    reducers: {
        reset: () => contentDefaultState,
        contentLoaded: state => {
            state.isLoaded = true;
        },
        setWDLink: (state, action) => {
            state.wdLink = action.payload;
        }
    }
});

/**
 * this is an example of a thunk, you could add api requests from here
 * and dispatch actions to update the state
 */
export const contentLoaded = (): ThunkType => async (dispatch, getState) => {
    const { isLoaded } = getState().content || {};
    if (isLoaded) return;
    await dispatch(slice.actions.contentLoaded());
};

export const setWDLink = (wdLink: WDLink): ThunkType => async dispatch => {
    await dispatch(slice.actions.setWDLink(wdLink));
}

const { actions, reducer } = slice;
const aliases = {};
export { actions, aliases,reducer };
