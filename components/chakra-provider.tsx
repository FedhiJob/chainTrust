"use client";

import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";

type EmotionCacheState = {
  cache: ReturnType<typeof createCache>;
  flush: () => string[];
};

export default function ChakraProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ cache, flush }] = useState<EmotionCacheState>(() => {
    const cache = createCache({ key: "chakra", prepend: true });
    cache.compat = true;

    const prevInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;

    const styles = names
      .map((name) => (typeof cache.inserted[name] === "string" ? cache.inserted[name] : ""))
      .join("");

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
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
