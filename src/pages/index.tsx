import { getAbstellanlagen } from "@/lib/staticDataCache";
import { Typography } from "@mui/material";
import { GetStaticProps } from "next";
import Head from "next/head";
import AbstellanlagenTable from "@/components/AbstellanlagenTable";
import { Abstellanlage } from "@/models/abstellanlage";

interface HomeProps {
  abstellanlagen: Abstellanlage[];
}

export default function Home({ abstellanlagen }: HomeProps) {
  return (
    <>
      <Head>
        <title>Alle Fahrrad-Abstellanlagen</title>
        <meta
          name="description"
          content="Übersicht der Fahrrad-Abstellanlagen in Karlsruhe"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Typography variant="h1" gutterBottom>
        Alle Fahrrad-Abstellanlagen
      </Typography>
      <AbstellanlagenTable abstellanlagen={abstellanlagen} />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const abstellanlagen = await getAbstellanlagen();

  return {
    props: {
      abstellanlagen,
    },
  };
};
