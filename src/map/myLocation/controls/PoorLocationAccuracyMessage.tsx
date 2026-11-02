import { LocationProblem } from "./LocationProblem";

export default function PoorLocationAccuracyMessage() {
  return (
    <LocationProblem message="Your location isn't precise enough on this device. It works best on a phone." />
  );
}
