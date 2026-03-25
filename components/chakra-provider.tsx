"use client";

import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

function createEmotionCache() {
  const cache = createCache({ key: "chakra", prepend: true });
  cache.compat = true;
  return cache;
}

export default function ChakraProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = useState(createEmotionCache);

  useServerInsertedHTML(() => {
    const entries = Object.entries(cache.inserted);
    if (entries.length === 0) return null;

    const styles = entries
      .map(([, value]) => (typeof value === "string" ? value : ""))
      .join("");

    return (
      <style
        data-emotion={`${cache.key} ${entries.map(([key]) => key).join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
    </CacheProvider>
  );
}
