"use client";

import dynamic from "next/dynamic";

const TamboRuntime = dynamic(() => import("./TamboRuntime"), {
  ssr: false,
});

type TamboProviderClientProps = {
  children: React.ReactNode;
};

export function TamboProviderClient({ children }: TamboProviderClientProps) {
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;
  if (!apiKey) return <>{children}</>;
  return <TamboRuntime apiKey={apiKey}>{children}</TamboRuntime>;
}
