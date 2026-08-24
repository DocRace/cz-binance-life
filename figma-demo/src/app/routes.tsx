import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import BookIntro from "./pages/BookIntro";
import BookClub from "./pages/BookClub";
import CZPrinciples from "./pages/CZPrinciples";
import Timeline from "./pages/Timeline";
import Account from "./pages/Account";
import AccountRedeem from "./pages/AccountRedeem";
import AccountInvoices from "./pages/AccountInvoices";
import PurchaseSuccess from "./pages/PurchaseSuccess";
import NotFound from "./pages/NotFound";
import OfflineEvent from "./pages/OfflineEvent";
import CryptoChronicle from "./pages/CryptoChronicle";
import ChronicleLeaderboard from "./pages/ChronicleLeaderboard";
import ChronicleShareRedirect from "./pages/ChronicleShareRedirect";
import PosterPreviewLab from "./pages/PosterPreviewLab";

export const router = createBrowserRouter([
  { path: "/dev/poster-preview", Component: PosterPreviewLab },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "book", Component: BookIntro },
      { path: "club", Component: BookClub },
      { path: "club/chronicle", Component: CryptoChronicle },
      { path: "club/chronicle/rank", Component: ChronicleLeaderboard },
      { path: "s/:code", Component: ChronicleShareRedirect },
      { path: "event", Component: OfflineEvent },
      { path: "principles", Component: CZPrinciples },
      { path: "timeline", Component: Timeline },
      { path: "account/redeem", Component: AccountRedeem },
      { path: "account/invoices", Component: AccountInvoices },
      { path: "purchase-success", Component: PurchaseSuccess },
      { path: "account", Component: Account },
      { path: "*", Component: NotFound },
    ],
  },
]);
