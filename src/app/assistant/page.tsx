import type { Metadata } from "next";
import { AssistantChat } from "@/components/AssistantChat";
import { aiConfigured } from "@/lib/providers/registry";

export const metadata: Metadata = { title: "Assistant DINO" };

export default function AssistantPage() {
  return <AssistantChat aiEnabled={aiConfigured()} />;
}
