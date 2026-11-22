"use strict";

const installButton = document.getElementById("installEducation");
let installPrompt;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  const prompt = installPrompt;
  if (!prompt) return;
  installPrompt = undefined;
  installButton.hidden = true;
  await prompt.prompt();
});

window.addEventListener("appinstalled", () => {
  installPrompt = undefined;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./education-worker.js", {scope: "./"}).catch(error => {
    console.warn("Не вдалося підключити кеш застосунку.", error);
  });
}
