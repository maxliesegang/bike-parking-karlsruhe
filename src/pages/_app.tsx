import type { AppProps } from "next/app";
import Layout from "@/components/Layout";
import "@kern-ux/native/dist/kern.min.css";
import "@kern-ux/native/dist/fonts/fira-sans.css";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
