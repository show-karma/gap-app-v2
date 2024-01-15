import Head from "next/head";
import React from "react";
import { ProjectPageLayout } from ".";

function ExamplePage() {
  return (
    <>
      <Head>
        <title>Example Title - Gap by Karma</title>
        <meta name="title" content="Example Title - Gap by Karma" />
      </Head>
      <>Example Content</>
    </>
  );
}

ExamplePage.getLayout = ProjectPageLayout;

export default ExamplePage;
