import { $, $$, normalizePostcode, validPostcode } from "./shared.js";

// Eigen validatie zodat we per veld een duidelijke melding kunnen geven
const form = $("#apply");
form.addEventListener("submit", e => {
  e.preventDefault();
  const err = $("#a-error");
  const problems = [];
  if (!$("#a-company").value.trim()) problems.push("vul je bedrijfsnaam in");
  if (!/^\d{8}$/.test($("#a-kvk").value.trim())) problems.push("een KvK-nummer heeft 8 cijfers");
  if (!$("#a-name").value.trim()) problems.push("vul een contactpersoon in");
  if ($("#a-phone").value.replace(/\D/g, "").length < 10) problems.push("vul een telefoonnummer in van minimaal 10 cijfers");
  if (!$("#a-email").validity.valid || !$("#a-email").value) problems.push("vul een geldig e-mailadres in");
  if (!validPostcode(normalizePostcode($("#a-pc").value))) problems.push("vul de postcode van je vestiging in, bijvoorbeeld 3511 AB");
  if (!$$("input[name=skill]:checked").length) problems.push("kies minstens één ding dat jullie al installeren");
  if (!$("#a-ok").checked) problems.push("geef toestemming om contact op te nemen");
  if (problems.length) {
    err.hidden = false;
    err.textContent = "Nog niet compleet: " + problems.join(", ") + ".";
    return;
  }
  err.hidden = true;
  const company = $("#a-company").value.trim();
  $("#apply-fields").innerHTML = `<div class="apply-done">
    <h3>Bedankt, ${company}</h3>
    <p>In de echte versie belt een accountmanager je binnen 2 werkdagen voor een kennismaking. Daarna ontvang je de partnervoorwaarden en plannen we de training.</p>
    <p class="demo-note">Demo — er is niets verstuurd.</p>
  </div>`;
  $("#aanmelden").scrollIntoView({ behavior: "smooth", block: "start" });
});
