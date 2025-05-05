// pages/index.tsx — Text Analysis Home Page

import Sidebar from "@/components/Sidebar";
import TextAnalysisPage from "@/components/TextAnalysisPage";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <TextAnalysisPage />
    </div>
  );
}