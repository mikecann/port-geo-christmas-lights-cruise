import { Stack } from "@mantine/core";
import { AdminPageHeader } from "../AdminLayout";
import InPersonAreaSettings from "./InPersonAreaSettings";
import NumberRangeCard from "./NumberRangeCard";

// The settings that shape the competition, in one place. Opening and closing
// entries and voting stays on Home, as it's what admins reach for most.
export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        info="Opening and closing entries and voting is on Home."
      />
      <Stack gap="lg">
        <NumberRangeCard />
        <InPersonAreaSettings />
      </Stack>
    </>
  );
}
