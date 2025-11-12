import type { ReactNode } from "react";
import { RoomWizardLayout } from "@/components/setup/room/RoomWizardLayout";

export default function RoomSetupLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { householdId: string };
}) {
  return (
    <RoomWizardLayout householdId={params.householdId}>
      {children}
    </RoomWizardLayout>
  );
}
