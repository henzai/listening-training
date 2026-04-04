import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Generate } from "./pages/Generate";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { Practice } from "./pages/Practice";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="generate" element={<Generate />} />
          <Route path="library" element={<Library />} />
          <Route path="practice/:scriptId" element={<Practice />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
