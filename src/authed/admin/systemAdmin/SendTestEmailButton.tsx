import { Button } from "@mantine/core";
import { IconMail, IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useErrorCatchingMutation } from "../../../common/errors";
import { api } from "../../../../convex/_generated/api";

export default function SendTestEmailButton() {
  const [sendTestEmail, isSendingEmail] = useErrorCatchingMutation(
    api.admin.system.email.sendTestEmail,
  );

  return (
    <Button
      variant="outline"
      color="green"
      leftSection={<IconMail size={16} />}
      onClick={() => {
        sendTestEmail({});
        notifications.show({
          title: "Email Sent!",
          message: "Test email sent successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      }}
      loading={isSendingEmail}
    >
      Send Test Email
    </Button>
  );
}
