import { Metadata } from "next";
import PhotographyLayout from "../components/photography/PhotographyLayout";

export const metadata: Metadata = {
  title: "Photography - Tom Zheng",
  description: "Photography and motion work by Tom Zheng.",
};

export default function PhotographyPage() {
  return (
    <main className="flex min-h-screen justify-center">
      <PhotographyLayout />
    </main>
  );
}
