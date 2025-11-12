import { redirect } from "next/navigation";

export default function RoomSetupIndexPage({
  params,
}: {
  params: { householdId: string };
}) {
  redirect(`/setup/room/${params.householdId}/photo`);
}
