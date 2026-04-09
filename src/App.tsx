import * as Sentry from "@sentry/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Generate } from "./pages/Generate";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { Practice } from "./pages/Practice";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>エラーが発生しました。ページを再読み込みしてください。</p>}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="generate" element={<Generate />} />
            <Route path="library" element={<Library />} />
            <Route path="practice/:scriptId" element={<Practice />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
