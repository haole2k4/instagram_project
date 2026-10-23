import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import { Provider } from "react-redux";
import store from "./Redux/store";
import { i18nReady } from "./Utils/i88n";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Chờ bản dịch tải xong để không nháy key thô khi vừa F5.
i18nReady.finally(() => {
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
});

reportWebVitals();
