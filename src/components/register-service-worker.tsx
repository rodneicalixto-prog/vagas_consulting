"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // instalação da PWA continua funcionando via manifest; SW é só o shell offline
    });
  }, []);

  return null;
}
