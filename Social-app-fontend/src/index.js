import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import store, { persistor } from "./Redux/store";
import { i18nReady } from "./Utils/i88n";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Chờ bản dịch tải xong để không nháy key thô khi vừa F5.
i18nReady.finally(() => {
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </React.StrictMode>
  );
});
