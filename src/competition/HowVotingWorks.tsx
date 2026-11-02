import { Accordion, List, Stack, Text } from "@mantine/core";
import { event, formatDate } from "../../shared/event";

export default function HowVotingWorks() {
  return (
    <Stack gap="sm">
      <Text>
        Every house has a sign with its number and a QR code. Scan the code on
        the sign, or scan the one on the boat and type in the number you saw.
        You can also vote from any entry's page on this site.
      </Text>
      <List spacing="xs">
        <List.Item>
          You'll need to sign in first. It's quick, with Google or a code we
          email you.
        </List.Item>
        <List.Item>
          You get two votes: one for the best display, and one for Most Jolly.
          You can change them any time until voting closes.
        </List.Item>
        <List.Item>Entrants can't vote for their own display.</List.Item>
        {event.voting && (
          <List.Item>
            Voting is open from {formatDate(event.voting.opens)} to{" "}
            {formatDate(event.voting.closes)}.
          </List.Item>
        )}
      </List>

      {/* The detail most people skip, folded away so the page stays short */}
      <Accordion variant="contained" mt="sm">
        <Accordion.Item value="best">
          <Accordion.Control>Best display</Accordion.Control>
          <Accordion.Panel>
            Vote for the lights you like best. If you saw the display in person,
            from a boat or from the shore, your vote counts for In-Person
            Favourites. If you didn't, it counts for People's Choice.
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="jolly">
          <Accordion.Control>Most Jolly</Accordion.Control>
          <Accordion.Panel>
            For the house with the most festive fun: dancing, dressing up,
            waving at the boats. It's only for people who saw the display in
            person.
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="there">
          <Accordion.Control>How we know you were there</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="sm">
                When you vote, we do a rough check of where your internet
                connection is. If it looks like you're too far away to have seen
                the lights (overseas, for example), your best display vote
                counts for People's Choice and you can't vote Most Jolly.
              </Text>
              <Text size="sm">
                If the check passes, we'll ask whether you've seen the display
                in person, with a switch that starts in the middle. Slide it to
                "I've seen it" or "I haven't seen it" before you vote. It's on
                your honour, so please only pick "I've seen it" if you have. We
                keep the rough location with your vote so the organisers can
                check for anything odd.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
