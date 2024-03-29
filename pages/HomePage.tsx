import { useContext } from "react"
import { GetStaticProps, InferGetServerSidePropsType } from "next"
import Head from 'next/head'
import {Grid, Typography, Box} from "@mui/material"
import { Item, getCardDirectory } from "@/react/item/"
import { Column } from "@/react/column/"
import { Board, getBoardDirectory } from "@/react/board/"
import {AppFooter} from "@/react/app/"
import { FxThemeContext } from "@/fx/theme"
import { HoverLink, ListCard } from "@/fx/ui"

import { findProjectBoards } from "@/mongo/controls/project/projectControls"

const DESCRIPTION = "A Simple way to Orginize your Projects and impliment Strategies. "
  + "Hundreds of Software Developement Best Practices, Standards and Eamples."
const KEYWORDS = "JavaScript, TypeScript, React, Next.js, Node.js, MongoDB, Github, Git, "
  + "HTML, CSS, SCSS, SASS, Material-UI, MUI, Strategy, Project, Organization, Best Practices, "
  + "VS Code, Software Development, Web Framwork, Web Development, Web App, Web Application,  "
  + "Mongoose, Express, Material-UI, MUI, Strategy, Project, Organization, Best Practices,  "
  + "Standards, Examples, Software Development, Web Framwork, Web Development, "
  + "Web App, Web Application, Full Stack, Full Stack Development, Full Stack Developer, "
  + "Software Engineer, Software Engineering, Software Developer, Software Development Engineer "

export const WEBSITE_PROJECT_ID: string = '64b6bc0a1b836981ba0c4cc5'

export interface HomePage{ boards: Board[]}

export const getStaticProps: GetStaticProps<HomePage> = async () => {
  let boards: Board[] = await findProjectBoards(WEBSITE_PROJECT_ID)
  return {props: { boards}}
}

const Page = ({boards}: InferGetServerSidePropsType<typeof getStaticProps>) => {

  const {fxTheme: fx} = useContext(FxThemeContext)

  return (
    <>
      <Head>
        <title>Strategy Fx - Simple Project Strategies and Organization.</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="keywords" content={KEYWORDS} />
      </Head>
      <Box sx={{ p: fx.theme.defaultPadding}}>
        <Grid container spacing={fx.theme.defaultPadding}>
          { boards?.map( (b: Board) => (
            <Grid item xs={12} md={6} lg={4} key={b.id}>
              <ListCard title={ b.title } href={getBoardDirectory(b)}>
                <>
                  {b?.columns.map( (c: Column) => (
                    <Box sx={{ pb: 1}} key={c.id}>
                      <Typography variant={'h3'} sx={{ fontSize: '16px', fontWeight: '500'}} >
                        {c.title}
                      </Typography>
                      { c.items && c?.items.map( (i: Item) => (
                        <HoverLink key={i.id} href={getCardDirectory(b, i)} title={i.title} />
                      )) }
                      { !c.items.length && ( <Typography>Comming soon.</Typography>) }
                    </ Box>
                  ))}
                  { b.columns.length < 1 && ( <Typography>Comming soon.</Typography>) }
                </>
              </ListCard>
            </Grid>
          ))}
        </Grid>
      </Box>
      <AppFooter />
    </>
  )
}

export default Page

// QA: Brian Francis - 10-20-2023