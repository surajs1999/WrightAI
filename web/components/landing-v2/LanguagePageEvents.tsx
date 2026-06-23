"use client";

import { useEffect } from "react";
import { ga } from "@/lib/ga";

export default function LanguagePageEvents({ language }: { language: string }) {
  useEffect(() => {
    ga.languagePageView(language);
  }, [language]);

  return null;
}
