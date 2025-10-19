import { RoomSetup } from '@/components/setup/RoomSetup';

export default function RoomSetupPage({ params }: { params: { householdId: string } }) {
  return <RoomSetup householdId={params.householdId} />;
}

