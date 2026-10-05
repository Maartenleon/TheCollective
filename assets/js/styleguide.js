/* Styleguide page only: prints the live value of every token shown, so the
   page can never drift from tokens.css. */
(() => {
  "use strict";
  // data-token="--name": print "name: value" (into [data-token-value] if present)
  document.querySelectorAll("[data-token]").forEach(el => {
    const name = el.dataset.token;
    const target = el.querySelector("[data-token-value]") || el;
    target.textContent = `${name}: ${TC.util.token(name)}`;
    if (el.hasAttribute("data-chip")) el.style.setProperty("--sg-chip", `var(${name})`);
  });
  // data-size="--name": draw a bar as long as the token
  document.querySelectorAll("[data-size]").forEach(el => el.style.setProperty("--sg-size", `var(${el.dataset.size})`));
})();
