import { Button, Stack } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { downloadCsv, toCsv } from "../../../common/utils/csv";
import { useRoute } from "../../../routes";
import { AdminPageHeader } from "../AdminLayout";
import AllEntries from "./AllEntries";

// Every entry this year. New entries are reviewed on Home; this is for
// finding any entry to see its details or change its number.
export default function EntriesPage() {
  const route = useRoute();
  const allEntries = useQuery(
    api.admin.competition.entries.getAllEntriesForExport,
  );

  return (
    <Stack gap={0}>
      <AdminPageHeader
        title="Entries"
        info="Click an entry to see everything about it, change its number or manage its photos."
        actions={
          <Button
            leftSection={<IconDownload size={16} />}
            variant="default"
            size="sm"
            disabled={!allEntries}
            onClick={() => {
              if (!allEntries) return;
              downloadCsv(
                toCsv(
                  [
                    "user email",
                    "user name",
                    "entry number",
                    "entry name",
                    "entry address",
                  ],
                  allEntries.map((entry) => [
                    entry.userEmail,
                    entry.userName,
                    entry.entryNumber,
                    entry.entryName,
                    entry.entryAddress,
                  ]),
                ),
                "entrants",
              );
            }}
          >
            Download CSV
          </Button>
        }
      />
      <AllEntries
        initialStatus={
          route.name === "adminEntries" ? route.params.show : undefined
        }
      />
    </Stack>
  );
}
