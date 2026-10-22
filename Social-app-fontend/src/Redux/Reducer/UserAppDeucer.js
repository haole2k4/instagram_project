import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoggedIn: false,
  userInfo: null,
  accessToken: "",
  roles: [],
  status: "ACTIVE",
  suspendedUntil: null,
};

const userAppSlice = createSlice({
  name: "login",
  initialState,

  reducers: {
    userLoginData: (state, action) => {
      const { user, accessToken, roles, status, suspendedUntil } = action.payload;
      state.isLoggedIn = true;
      state.userInfo = user;
      state.accessToken = accessToken;
      state.roles = roles || [];
      state.status = status || "ACTIVE";
      state.suspendedUntil = suspendedUntil || null;
    },

    userLogoutALL: (state) => {
      state.isLoggedIn = false;
      state.userInfo = null;
      state.accessToken = "";
      state.roles = [];
      state.status = "ACTIVE";
      state.suspendedUntil = null;
    },
  },
});

export const { userLoginData, userLogoutALL } = userAppSlice.actions;

export default userAppSlice.reducer;
