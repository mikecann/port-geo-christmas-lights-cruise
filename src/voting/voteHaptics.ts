// A little tap you can feel as a vote goes in

// iPhones can't vibrate from the web, but iOS 18 gives a tap when a switch
// is flicked, so this flicks a hidden one through its label. Only works in
// the tap itself, so call it from there. Elsewhere there's no switch, so it
// does nothing.
export function tapHaptic() {
  if (!("switch" in HTMLInputElement.prototype)) return;
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.tabIndex = -1;
  input.setAttribute("switch", "");
  label.appendChild(input);
  // Kept to itself, so nothing on the page sees the click
  label.addEventListener("click", (event) => event.stopPropagation());
  const focused = document.activeElement;
  document.body.appendChild(label);
  label.click();
  label.remove();
  if (focused instanceof HTMLElement && document.activeElement !== focused)
    focused.focus({ preventScroll: true });
}

// Android: a few quick buzzes, like the lights chasing round
export function voteBuzz() {
  if ("vibrate" in navigator) navigator.vibrate([10, 70, 10, 70, 18]);
}
