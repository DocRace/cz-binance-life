import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import BookIntro from "./pages/BookIntro";
import BookClub from "./pages/BookClub";
import CZPrinciples from "./pages/CZPrinciples";
import Timeline from "./pages/Timeline";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "book", Component: BookIntro },
      { path: "club", Component: BookClub },
      { path: "principles", Component: CZPrinciples },
      { path: "timeline", Component: Timeline },
      { path: "account", Component: Account },
      { path: "*", Component: NotFound },
    ],
  },
]);
