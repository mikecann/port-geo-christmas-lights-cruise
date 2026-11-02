import * as React from "react";
import { LocationProblem } from "./LocationProblem";

export const DeniedStatus: React.FC = () => (
  <LocationProblem message="Your browser isn't sharing your location with this site. Allow it in your browser or phone settings to see where you are on the map." />
);
