import { combineReducers, configureStore } from "@reduxjs/toolkit";
import appreducer from "./Reducer/appReducer";
import storage from "redux-persist/lib/storage";
import UserAppDeucer from "./Reducer/UserAppDeucer";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import chatReducer from "./Reducer/chatSlice";
import { injectAxiosStore } from "../Utils/AxiosApi/Axios";
import { injectWebSocketStore } from "../Service/webSocketService";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["app", "login"],
};

const rootReducer = combineReducers({
  app: appreducer,
  login: UserAppDeucer,
  chat: chatReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

injectAxiosStore(store);
injectWebSocketStore(store);

export const persistor = persistStore(store);
export default store;
